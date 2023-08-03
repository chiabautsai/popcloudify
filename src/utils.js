const MAX_LENGTH = 80;


// Function to extract form fields as key-value pairs from a response using HTMLRewriter
export const extractFormFieldsFromResponse = async (response) => {
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

export const extractTidPidFromUrl = (url) => {
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

export const getRemoteUrl = (hostUrl, action, options = {}) => {
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

// Consume the response stream chunk by chunk
export const consume = async (stream) => {
  const reader = stream.getReader();
  while (!(await reader.read()).done) { /* NOOP */ }
}

export const unescapeHtmlEntities = (htmlString) => {

  const entitiesMap = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '=',
  };

  return htmlString.replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&#x2F;|&#x60;|&#x3D;/g, match => entitiesMap[match]);
}

export const encodeHtmlEntities = (str, encodeSpecialChars = true) => {
  
  const entitiesMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
  };
  
  return str.replace(/[\u00A0-\uFFFF&<>]/g, match => {
    if (encodeSpecialChars) {
      if (entitiesMap[match]) {
        return entitiesMap[match];  
      }
    }
    
    if (!entitiesMap[match]) {
      return `&#${match.codePointAt(0)};`;
    }

    return match;
  });
}

export const validateFormField = (field, value) => {
  let validated;

  switch (field) {
    case 'subject':
      // Set title to max length and encode 
      // special characters
      const trimmed = trimStringToMaxLength(value);
      validated = encodeHtmlEntities(trimmed, false);
      break;
    case 'message':
      // Encode non Ascii characters
      validated = encodeHtmlEntities(value, false);
      break;
    default:
      return value;
  }

  return validated;
}

const trimStringToMaxLength = (str) => {
  // Trim and fill the end of string with ...
  const trimmed = shortenStringToLength(str, MAX_LENGTH-3);
  if (str === trimmed) {
    return str;
  }
  return `${trimmed}...`;
};

const shortenStringToLength = (str, length) => {
  while (encodeHtmlEntities(str).length > length) {
    str = str.slice(0, -1); // Remove the last character from the string
  }
  return str;
};
