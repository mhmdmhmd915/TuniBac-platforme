const BLOCKED_TAGS_PATTERN = /<\/?(script|style|iframe|object|embed|svg|math|form|input|button|textarea|select|option|meta|link)[^>]*>/gi;
const ALLOWED_TAGS = new Set(['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'a']);

const sanitizeUrl = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return null;
  }

  try {
    const parsed = new URL(normalized, 'https://example.com');
    const protocol = parsed.protocol.toLowerCase();
    if (!['http:', 'https:', 'mailto:', 'tel:'].includes(protocol)) {
      return null;
    }

    return parsed.origin === 'https://example.com' && !/^(mailto|tel):/i.test(normalized)
      ? parsed.pathname + parsed.search + parsed.hash
      : normalized;
  } catch {
    return null;
  }
};

const sanitizeAttributes = (tagName, rawAttrs) => {
  if (tagName !== 'a') {
    return '';
  }

  const hrefMatch = rawAttrs.match(/\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
  const hrefValue = sanitizeUrl(hrefMatch?.[2] || hrefMatch?.[3] || hrefMatch?.[4] || '');

  if (!hrefValue) {
    return '';
  }

  return ` href="${hrefValue.replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer"`;
};

const sanitizeRichHtml = (value) => {
  let html = String(value || '');

  html = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(BLOCKED_TAGS_PATTERN, '')
    .replace(/<\s*(script|style|iframe|object|embed|svg|math|form|input|button|textarea|select|option|meta|link)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '')
    .replace(/\sstyle\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '');

  html = html.replace(/<\/?([a-z0-9-]+)([^>]*)>/gi, (match, rawTagName, rawAttrs = '') => {
    const tagName = String(rawTagName || '').toLowerCase();
    if (!ALLOWED_TAGS.has(tagName)) {
      return '';
    }

    if (match.startsWith('</')) {
      return `</${tagName}>`;
    }

    const attrs = sanitizeAttributes(tagName, rawAttrs);
    return `<${tagName}${attrs}>`;
  });

  return html.trim();
};

module.exports = {
  sanitizeRichHtml,
  sanitizeUrl,
};
