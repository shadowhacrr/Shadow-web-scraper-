const fs = require('fs-extra');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Ensure data directory exists
fs.ensureDirSync(DATA_DIR);

function getFilePath(filename) {
  return path.join(DATA_DIR, filename);
}

function readJSON(filename, defaultValue = {}) {
  const filePath = getFilePath(filename);
  if (!fs.existsSync(filePath)) {
    writeJSON(filename, defaultValue);
    return defaultValue;
  }
  try {
    return fs.readJsonSync(filePath);
  } catch {
    return defaultValue;
  }
}

function writeJSON(filename, data) {
  const filePath = getFilePath(filename);
  fs.writeJsonSync(filePath, data, { spaces: 2 });
}

// ========== USERS ==========
function getUsers() {
  return readJSON('users.json', {});
}

function saveUser(userId, userData) {
  const users = getUsers();
  users[userId] = {
    ...users[userId],
    ...userData,
    id: userId,
    joinedAt: users[userId]?.joinedAt || new Date().toISOString(),
    lastActive: new Date().toISOString()
  };
  writeJSON('users.json', users);
  return users[userId];
}

function getUser(userId) {
  const users = getUsers();
  return users[userId] || null;
}

function getUserList() {
  const users = getUsers();
  return Object.values(users);
}

function getTotalUsers() {
  return Object.keys(getUsers()).length;
}

// ========== OWNERS ==========
function getOwners() {
  const owners = readJSON('owners.json', { owners: [] });
  return owners.owners || [];
}

function addOwner(chatId) {
  const owners = getOwners();
  if (!owners.includes(chatId)) {
    owners.push(chatId);
    writeJSON('owners.json', { owners });
    return true;
  }
  return false;
}

function removeOwner(chatId) {
  let owners = getOwners();
  owners = owners.filter(id => id !== chatId);
  writeJSON('owners.json', { owners });
}

function isOwner(chatId) {
  return getOwners().includes(String(chatId));
}

// ========== SCRAPED WEBSITES ==========
function getScrapedWebsites() {
  return readJSON('scraped_websites.json', {});
}

function saveScrapedWebsite(userId, url, zipPath) {
  const scraped = getScrapedWebsites();
  const id = Date.now().toString();
  if (!scraped[userId]) scraped[userId] = [];
  scraped[userId].push({
    id,
    url,
    zipPath,
    createdAt: new Date().toISOString()
  });
  writeJSON('scraped_websites.json', scraped);
  return id;
}

function getUserScrapedWebsites(userId) {
  const scraped = getScrapedWebsites();
  return scraped[userId] || [];
}

// ========== BOT TOKENS ==========
function getBotTokens() {
  return readJSON('bot_tokens.json', { tokens: [] });
}

function addBotToken(token) {
  const data = getBotTokens();
  if (!data.tokens.includes(token)) {
    data.tokens.push(token);
    writeJSON('bot_tokens.json', data);
    return true;
  }
  return false;
}

function removeBotToken(token) {
  const data = getBotTokens();
  data.tokens = data.tokens.filter(t => t !== token);
  writeJSON('bot_tokens.json', data);
}

function getBotTokensList() {
  return getBotTokens().tokens;
}

// ========== STATS ==========
function incrementStat(key) {
  const stats = readJSON('stats.json', { totalScrapes: 0, totalDownloads: 0, commandsUsed: {} });
  if (key === 'scrape') stats.totalScrapes++;
  if (key === 'download') stats.totalDownloads++;
  writeJSON('stats.json', stats);
}

function logCommand(command) {
  const stats = readJSON('stats.json', { totalScrapes: 0, totalDownloads: 0, commandsUsed: {} });
  stats.commandsUsed[command] = (stats.commandsUsed[command] || 0) + 1;
  writeJSON('stats.json', stats);
}

function getStats() {
  return readJSON('stats.json', { totalScrapes: 0, totalDownloads: 0, commandsUsed: {} });
}

// ========== USER STATE ==========
const userStates = {};

function setUserState(userId, state) {
  userStates[userId] = state;
}

function getUserState(userId) {
  return userStates[userId] || null;
}

function clearUserState(userId) {
  delete userStates[userId];
}

module.exports = {
  // Users
  getUsers,
  saveUser,
  getUser,
  getUserList,
  getTotalUsers,
  
  // Owners
  getOwners,
  addOwner,
  removeOwner,
  isOwner,
  
  // Scraped
  getScrapedWebsites,
  saveScrapedWebsite,
  getUserScrapedWebsites,
  
  // Bot Tokens
  getBotTokens,
  addBotToken,
  removeBotToken,
  getBotTokensList,
  
  // Stats
  incrementStat,
  logCommand,
  getStats,
  
  // State
  setUserState,
  getUserState,
  clearUserState
};
