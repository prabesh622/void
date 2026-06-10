const crypto = require('crypto');

/** Split array into chunks of given size */
function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

/** Capitalize first letter */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Truncate string to max length with ellipsis */
function truncate(str, max = 2048) {
  return str.length > max ? str.slice(0, max - 3) + '...' : str;
}

/** Generate a short unique ID */
function generateId(length = 8) {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

/** Replace template variables in a string */
function replaceVariables(str, vars) {
  let result = str;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

/** Clean content for safe display */
function cleanContent(str) {
  return str.replace(/@everyone/g, '@\u200Beveryone').replace(/@here/g, '@\u200Bhere');
}

/** Simple math captcha generator */
function generateCaptcha() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  return { question: `${a} + ${b} = ?`, answer: String(a + b) };
}

module.exports = { chunk, capitalize, truncate, generateId, replaceVariables, cleanContent, generateCaptcha };
