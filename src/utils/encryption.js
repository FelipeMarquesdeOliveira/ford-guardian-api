const CryptoJS = require('crypto-js');
const logger = require('./logger');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

const encrypt = (text) => {
  if (!text) return null;
  try {
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
  } catch (error) {
    logger.error('Encryption failed', { error: error.message });
    return null;
  }
};

const decrypt = (ciphertext) => {
  if (!ciphertext) return null;
  try {
    const decrypted = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    logger.error('Decryption failed', { error: error.message });
    return null;
  }
};

const hashData = (data) => {
  return CryptoJS.SHA256(data).toString();
};

const generateToken = () => {
  return CryptoJS.lib.WordArray.random(32).toString();
};

const DATA_RETENTION_DAYS = parseInt(process.env.DATA_RETENTION_DAYS) || 90;

const shouldDeleteData = (createdAt) => {
  const created = new Date(createdAt);
  const now = new Date();
  const diffDays = (now - created) / (1000 * 60 * 60 * 24);
  return diffDays > DATA_RETENTION_DAYS;
};

const anonymizeUser = (user) => {
  return {
    id: hashData(user.id).substring(0, 16),
    name: user.name.substring(0, 2) + '***',
    email: user.email.substring(0, 2) + '***@***.com',
    role: user.role,
    createdAt: user.createdAt
  };
};

module.exports = {
  encrypt,
  decrypt,
  hashData,
  generateToken,
  DATA_RETENTION_DAYS,
  shouldDeleteData,
  anonymizeUser
};