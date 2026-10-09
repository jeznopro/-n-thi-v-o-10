const sanitizeHtml = require('sanitize-html');

const sanitizeOptions = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr',
    'b', 'i', 'strong', 'em', 'u', 's', 'strike',
    'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    'span', 'div', 'img', 'sub', 'sup'
  ],
  allowedAttributes: {
    '*': ['style', 'class', 'id', 'data-*'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'td': ['colspan', 'rowspan', 'align'],
    'th': ['colspan', 'rowspan', 'align']
  },
  allowedStyles: {
    '*': {
      'color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/],
      'background-color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/],
      'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
      'font-size': [/^\d+(?:px|em|rem|%)$/],
      'font-weight': [/^bold$/, /^normal$/, /^[1-9]00$/],
      'text-decoration': [/^underline$/, /^line-through$/, /^none$/]
    }
  },
  allowedSchemes: ['http', 'https', 'data']
};

/**
 * Làm sạch chuỗi HTML nhằm chống XSS
 * @param {string} dirtyHtml
 * @returns {string}
 */
function cleanHtml(dirtyHtml) {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';
  return sanitizeHtml(dirtyHtml, sanitizeOptions);
}

/**
 * Middleware tự động làm sạch trường content / description trong req.body
 */
function sanitizeRequestBody(req, res, next) {
  if (req.body) {
    if (typeof req.body.content === 'string') {
      req.body.content = cleanHtml(req.body.content);
    }
    if (typeof req.body.description === 'string') {
      req.body.description = cleanHtml(req.body.description);
    }
    if (typeof req.body.feedback === 'string') {
      req.body.feedback = cleanHtml(req.body.feedback);
    }
    if (typeof req.body.custom_content === 'string') {
      req.body.custom_content = cleanHtml(req.body.custom_content);
    }
  }
  next();
}

module.exports = {
  cleanHtml,
  sanitizeRequestBody
};
