const TUNISIAN_MOBILE_REGEX = /^[2459]\d{7}$/;

const extractTunisianMobileDigits = (value) => {
  const raw = String(value || '').trim();
  if (!raw) {
    return null;
  }

  const sanitized = raw.replace(/[\s()-]/g, '');

  let localDigits = sanitized;

  if (sanitized.startsWith('+216')) {
    localDigits = sanitized.slice(4);
  } else if (sanitized.startsWith('00216')) {
    localDigits = sanitized.slice(5);
  } else if (sanitized.startsWith('216') && sanitized.length === 11) {
    localDigits = sanitized.slice(3);
  }

  if (!/^\d{8}$/.test(localDigits)) {
    return null;
  }

  if (!TUNISIAN_MOBILE_REGEX.test(localDigits)) {
    return null;
  }

  return localDigits;
};

const normalizeTunisianPhone = (value) => {
  const digits = extractTunisianMobileDigits(value);
  return digits ? `+216${digits}` : null;
};

const buildCompatibilityEmailFromPhone = (normalizedPhone) => {
  const digits = String(normalizedPhone || '').replace(/\D/g, '');
  return `phone-${digits}@users.tunibac.local`;
};

module.exports = {
  extractTunisianMobileDigits,
  normalizeTunisianPhone,
  buildCompatibilityEmailFromPhone,
  TUNISIAN_MOBILE_REGEX,
};
