import { error } from 'itty-router';
import { consume, unescapeHtmlEntities } from './utils';
// import iconv from 'iconv-lite';

const REMOTE_URL_BASE = new URL('http://needpop.com');
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36';


// const loginUrl = getRemoteUrl(REMOTE_URL_BASE, 'login');
// const newThreadUrl = getRemoteUrl(REMOTE_URL_BASE, 'newthread', { fid: 123 });
// const replyUrl = getRemoteUrl(REMOTE_URL_BASE, 'reply', { tid: 456 });
// const editUrl = getRemoteUrl(REMOTE_URL_BASE, 'edit', { tid: 789, pid: 123 });

export const login = async ( username, password ) => {
  const loginFormUrl = getRemoteUrl(REMOTE_URL_BASE, 'login');
  const loginFormResponse = await fetch(loginFormUrl);
  // const loginFormHtml = await loginFormResponse.text();

  let formhash;
  let loginsubmit;

  // Extract form data from the HTML
  const rewriter = new HTMLRewriter()
    .on('input[name="formhash"]', {
      element(el) { 
        formhash = el.getAttribute('value'); 
      }
    })
    .on('input[name="loginsubmit"]', {
      element(el) { 
        loginsubmit = el.getAttribute('value'); 
      }
    });

  await consume(rewriter.transform(loginFormResponse).body);

  // Construct the login payload
  const loginPayload = new URLSearchParams();
  loginPayload.append('formhash', formhash);
  loginPayload.append('loginfield', 'username');
  loginPayload.append('username', username);
  loginPayload.append('password', password);
  loginPayload.append('cookietime', '315360000');
  loginPayload.append('loginsubmit', loginsubmit);

  const loginUrl = getRemoteUrl(REMOTE_URL_BASE, 'login');
  const loginResponse = await fetch(loginUrl, {
    method: 'POST',
    body: loginPayload,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    }
  });

  // Check if login was successful and retrieve cdb_auth value
  const loginResponseBody = await loginResponse.text();
  const cdbAuthCookie = loginResponse.headers.get('set-cookie')?.match(/cdb_auth=(.*?);/)?.[1];

  if (cdbAuthCookie) return cdbAuthCookie;

  throw new Error("Failed to retrieve login cookies")
}

export const create = async (
  cdb_auth,
  options,    // { fid }
  postParams, // { subject, message ... }
  ) => {
    if (!options.fid || !postParams.subject || !postParams.message) {
      throw new Error('Invalid fid or empty subject / message');
    }

    postParams['htmlon'] = 1;
    postParams['usesig'] = 1;
    return await compose(cdb_auth, 'newthread', options, postParams);
}

export const edit = async (
  cdb_auth,
  options,    // { tid, pid }
  postParams, // { subject, message ... }
  ) => {
    if (!options.tid || !options.pid) {
      throw new Error('Invalid tid / pid');
    }

    return await compose(cdb_auth, 'edit', options, postParams);
}

export const reply = async (
  cdb_auth,
  options,    // { tid }
  postParams, // { subject, message ... }
  ) => {
    if (!options.tid || !postParams.message) {
      throw new Error('Invalid tid or Empty message');
    }

    return await compose(cdb_auth, 'reply', options, postParams);
}

export const compose = async (
  cdb_auth,
  action,
  options,
  postParams={},
  ) => {
  const composeFormUrl = getRemoteUrl(REMOTE_URL_BASE, action, options);
  const composeFormResponse = await fetch(composeFormUrl, {
    headers: {
      'Cookie': `cdb_auth=${cdb_auth}`,
      'User-Agent': USER_AGENT,
    },
  })

  const formFields = await extractFormFieldsFromResponse(composeFormResponse);
  const merged = { ...formFields, ...postParams};
  // merged['message'] = iconv.encode(merged.message, 'gbk');
  const params = new URLSearchParams();
  
  for (const [key, value] of Object.entries(merged)) {
    params.set(key, value);
  }

  const postUrl = REMOTE_URL_BASE + unescapeHtmlEntities(formFields.action);
  return fetch(postUrl, {
    method: 'POST',
    body: params,
    redirect: 'manual',
    headers: {
      'Cookie': `cdb_auth=${cdb_auth}`,
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    })
    .then(response => {
      if (response.status >= 300 && response.status <400) {
        return response.headers;
      } else {
        throw new error('Post not successful');
      }
    })
    .then(headers => {
      const redirUrl = headers.get('location');
      return extractTidPidFromUrl(redirUrl);
    })
    .catch(e => {
      console.log(e);
      throw e;
    });
};

// Function to extract form fields as key-value pairs from a response using HTMLRewriter
async function extractFormFieldsFromResponse(response) {
  // Create a custom HTMLRewriter instance
  const rewriter = new HTMLRewriter();

  const formFields = {};

  let currentTextareaName = null;

  rewriter.on('form', {
    element(element) {
      const action=element.getAttribute('action');
      formFields['action'] = action;
    }
  });

  // Define the 'form *' query handler
  rewriter.on('form *', {
    element(element) {
      const name = element.getAttribute('name');
      if (!name) {
        // Ignore elements that have no 'name' attribute
        return;
      }

      if (element.tagName === 'input') {
        const inputType = element.getAttribute('type');
        if (inputType === 'checkbox' && !element.hasAttribute('checked')) {
          // Ignore unchecked checkboxes
          return;
        } else if (inputType === 'radio') {
          // Handle radio buttons, add only the one with 'checked' attribute
          if (element.hasAttribute('checked')) {
            const value = element.getAttribute('value');
            formFields[name] = value;
          }
        } else if (inputType === 'button') {
          // Ignore input type="button"
          return;
        } else {
          // For text inputs and other relevant input types, add key-value pair to formFields
          const value = element.getAttribute('value');
          formFields[name] = value;
        }
      } else if (element.tagName === 'textarea') {
        currentTextareaName = name;
      }
    },
  });

  rewriter.on('form textarea', {
    text({ text }) {
      if (currentTextareaName) {
        // For textareas, add key-value pair to formFields
        formFields[currentTextareaName] += text;
      }
    },
  }); 

  // Chain another 'rewriter.on()' to handle select elements and their option elements
  rewriter.on('form select', {
    element(element) {
      currentSelectName = element.getAttribute('name'); // Store the name attribute of the current select element
    },
  });
  
  let currentSelectName = null; // To store the name attribute of the current select element

  // Chain another 'rewriter.on()' to handle option elements inside the select
  rewriter.on('form select option[selected]', {
    element(element) {
      // Check if we have the name of the current select element
      if (currentSelectName) {
        const value = element.getAttribute('value');
        formFields[currentSelectName] = value;
      }
    },
  });

  // Apply the extraction to the HTML response
  await consume(rewriter.transform(response).body)

  // Return the extracted form fields as key-value pairs
  return formFields;
}

function extractTidPidFromUrl(url) {
  const regex = /[?&]tid=(\d+)(?:.*?#pid(\d+))?/;
  const match = url.match(regex);

  if (match && match.length >= 2) {
    const tid = match[1];
    const pid = match[2] || null;
    return { tid, pid };
  } else {
    return null; // URL doesn't contain tid and pid
  }
}

const getRemoteUrl = (hostUrl, action, options = {}) => {
  const url = new URL(hostUrl);
  switch (action) {
    case 'login':
      url.pathname = '/logging.php';
      url.searchParams.set('action', 'login');
      break;
    case 'newthread':
    case 'reply':
    case 'edit':
      url.pathname = '/post.php';
      url.searchParams.set('action', action);
      break;
    default:
      throw new Error(`Invalid action: ${action}`);
  }
  for (const [key, value] of Object.entries(options)) {
    url.searchParams.set(key, value);
  }
  return url;
};