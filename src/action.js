import { error } from 'itty-router';
import {
  extractFormFieldsFromResponse,
  extractTidPidFromUrl,
  validateFormField,
  unescapeHtmlEntities,
  consume,
  getRemoteUrl
} from './utils';

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
    
    postParams['htmlon'] = 1;
    postParams['usesig'] = 1;
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
  const params = new URLSearchParams();
  
  for (const [key, value] of Object.entries(merged)) {
    const validated = validateFormField(key, value);
    params.set(key, validated);
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
