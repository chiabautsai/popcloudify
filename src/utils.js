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