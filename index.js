const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const AdmZip = require('adm-zip');

const config = require('./config');
const db = require('./utils/dataManager');

// ============ EXPRESS SERVER (Railway Health Check) ============
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    status: 'alive',
    bot: config.BOT_NAME,
    users: db.getTotalUsers(),
    uptime: process.uptime()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
});

// ============ BOT INITIALIZATION ============
const bot = new TelegramBot(config.BOT_TOKEN, { polling: true });
console.log(`${config.BOT_NAME} started!`);

// Ensure directories exist
fs.ensureDirSync(path.join(__dirname, 'scraped'));

// Initialize default owners
const owners = db.getOwners();
if (owners.length === 0) {
  config.DEFAULT_OWNERS.forEach(owner => db.addOwner(owner));
}

// ============ KEYBOARD MARKUPS ============
function getChannelKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '📢 Join Telegram Channel', url: config.CHANNELS.telegram.link }
      ],
      [
        { text: '▶️ Subscribe YouTube', url: config.CHANNELS.youtube.link }
      ],
      [
        { text: '💬 Join WhatsApp', url: config.CHANNELS.whatsapp.link }
      ],
      [
        { text: '✅ Verify Join', callback_data: 'verify_join' }
      ]
    ]
  };
}

function getMainMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '👤 User Menu', callback_data: 'user_menu' },
        { text: '👑 Owner Menu', callback_data: 'owner_menu' }
      ]
    ]
  };
}

function getUserMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🆕 Scrap New Web', callback_data: 'scrap_new' }
      ],
      [
        { text: '📁 Old Scraped Webs', callback_data: 'old_scraped' }
      ],
      [
        { text: '📊 My Statics', callback_data: 'my_statics' }
      ],
      [
        { text: '🔙 Back to Main', callback_data: 'main_menu' }
      ]
    ]
  };
}

function getOwnerMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '📢 Broadcast', callback_data: 'broadcast' }
      ],
      [
        { text: '📊 Bot Statics', callback_data: 'bot_statics' }
      ],
      [
        { text: '👥 User List', callback_data: 'user_list' }
      ],
      [
        { text: '➕ Add Owner', callback_data: 'add_owner' }
      ],
      [
        { text: '🤖 Add Bot Token', callback_data: 'add_bot_token' }
      ],
      [
        { text: '🔙 Back to Main', callback_data: 'main_menu' }
      ]
    ]
  };
}

// ============ CHANNEL VERIFICATION ============
async function isUserInChannel(userId) {
  try {
    const channelUsername = config.CHANNELS.telegram.username.replace('@', '');
    const member = await bot.getChatMember(`@${channelUsername}`, userId);
    return ['member', 'administrator', 'creator'].includes(member.status);
  } catch (error) {
    console.error('Channel check error:', error.message);
    return false;
  }
}

async function sendChannelVerification(chatId) {
  await bot.sendMessage(chatId, config.MESSAGES.MUST_JOIN, {
    parse_mode: 'Markdown',
    reply_markup: getChannelKeyboard()
  });
}

// ============ STYLISH INTRODUCTION ============
function getStylishIntro() {
  const d = config.DEVELOPER;
  return `╔═══════════════════════════════════════╗
║     👨‍💻 *WEB SCRAPER BY SHADOW*      ║
╠═══════════════════════════════════════╣
║                                       ║
║  *Developer:* ${d.name}               ║
║  *Role:* ${d.title}    ║
║                                       ║
║  *About:*                             ║
║  ${d.bio.substring(0, 40)}...        ║
║                                       ║
╠═══════════════════════════════════════╣
║     🌐 *SOCIAL MEDIA LINKS*           ║
╠═══════════════════════════════════════╣
║  📱 *Telegram:* ${d.social.telegram.replace('https://t.me/', '@')}   ║
║  ▶️ *YouTube:* @shadowdev             ║
║  💬 *WhatsApp:* Available             ║
║  🐙 *GitHub:* shadowdev               ║
║  📸 *Instagram:* @shadowdev           ║
║                                       ║
╚═══════════════════════════════════════╝

*Choose an option below:*`;
}

// ============ WEB SCRAPER ============
async function scrapeWebsite(url, userId) {
  const scrapeDir = path.join(__dirname, 'scraped', `${userId}_${Date.now()}`);
  fs.ensureDirSync(scrapeDir);

  try {
    // Fetch main page
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const domain = new URL(url).hostname;

    // Extract HTML
    const htmlContent = $.html();
    fs.writeFileSync(path.join(scrapeDir, 'index.html'), htmlContent);

    // Extract and save CSS
    const stylesheets = [];
    $('link[rel="stylesheet"]').each((i, el) => {
      const href = $(el).attr('href');
      if (href) stylesheets.push(new URL(href, url).href);
    });

    // Inline styles
    const inlineStyles = [];
    $('style').each((i, el) => {
      inlineStyles.push($(el).html());
    });

    // Extract and save JS
    const scripts = [];
    $('script[src]').each((i, el) => {
      const src = $(el).attr('src');
      if (src) scripts.push(new URL(src, url).href);
    });

    const inlineScripts = [];
    $('script:not([src])').each((i, el) => {
      inlineScripts.push($(el).html());
    });

    // Save CSS files
    const cssDir = path.join(scrapeDir, 'css');
    fs.ensureDirSync(cssDir);

    for (let i = 0; i < stylesheets.length; i++) {
      try {
        const cssRes = await axios.get(stylesheets[i], { timeout: 15000 });
        fs.writeFileSync(path.join(cssDir, `style_${i + 1}.css`), cssRes.data);
      } catch (e) {
        console.log(`Failed to fetch CSS: ${stylesheets[i]}`);
      }
    }

    if (inlineStyles.length > 0) {
      fs.writeFileSync(path.join(cssDir, 'inline_styles.css'), inlineStyles.join('\n\n'));
    }

    // Save JS files
    const jsDir = path.join(scrapeDir, 'js');
    fs.ensureDirSync(jsDir);

    for (let i = 0; i < scripts.length; i++) {
      try {
        const jsRes = await axios.get(scripts[i], { timeout: 15000 });
        fs.writeFileSync(path.join(jsDir, `script_${i + 1}.js`), jsRes.data);
      } catch (e) {
        console.log(`Failed to fetch JS: ${scripts[i]}`);
      }
    }

    if (inlineScripts.length > 0) {
      fs.writeFileSync(path.join(jsDir, 'inline_scripts.js'), inlineScripts.join('\n\n'));
    }

    // Extract database/config files (common patterns)
    const dbDir = path.join(scrapeDir, 'db');
    fs.ensureDirSync(dbDir);

    // Look for common DB/config patterns in the HTML
    const dbPatterns = {
      'firebase_config.txt': /firebaseConfig\s*=\s*\{[^}]+\}/gi,
      'api_endpoints.txt': /(https?:\/\/[^\s"'<>]+\/(api|graphql|rest|v1|v2)[^\s"'<>]*)/gi,
      'database_connections.txt': /(mongodb|mysql|postgres|redis|firebase)[^\s"'<>]*/gi,
      'environment_vars.txt': /process\.env\.[A-Z_]+/gi
    };

    for (const [filename, pattern] of Object.entries(dbPatterns)) {
      const matches = htmlContent.match(pattern);
      if (matches) {
        fs.writeFileSync(path.join(dbDir, filename), matches.join('\n'));
      }
    }

    // Try to fetch robots.txt and sitemap.xml
    try {
      const robotsRes = await axios.get(`${url.protocol}//${domain}/robots.txt`, { timeout: 10000 });
      fs.writeFileSync(path.join(scrapeDir, 'robots.txt'), robotsRes.data);
    } catch (e) {}

    try {
      const sitemapRes = await axios.get(`${url.protocol}//${domain}/sitemap.xml`, { timeout: 10000 });
      fs.writeFileSync(path.join(scrapeDir, 'sitemap.xml'), sitemapRes.data);
    } catch (e) {}

    // Create info file
    const info = {
      scrapedUrl: url,
      domain: domain,
      scrapedAt: new Date().toISOString(),
      files: {
        html: 'index.html',
        css: stylesheets.length + (inlineStyles.length > 0 ? 1 : 0),
        js: scripts.length + (inlineScripts.length > 0 ? 1 : 0),
        dbHints: Object.keys(dbPatterns).filter(f => fs.existsSync(path.join(dbDir, f)))
      }
    };
    fs.writeFileSync(path.join(scrapeDir, 'info.json'), JSON.stringify(info, null, 2));

    // Create ZIP
    const zip = new AdmZip();
    zip.addLocalFolder(scrapeDir, domain);
    const zipPath = path.join(scrapeDir, '..', `${domain}_${Date.now()}.zip`);
    zip.writeZip(zipPath);

    // Cleanup extracted files, keep ZIP
    fs.removeSync(scrapeDir);

    return { zipPath, domain, info };
  } catch (error) {
    fs.removeSync(scrapeDir);
    throw error;
  }
}

// ============ BOT COMMAND HANDLERS ============

// /start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username || 'Unknown';
  const firstName = msg.from.first_name || 'User';

  // Save user
  db.saveUser(userId, { username, firstName });
  db.logCommand('/start');

  // Check channel membership
  const isJoined = await isUserInChannel(userId);
  if (!isJoined) {
    await sendChannelVerification(chatId);
    return;
  }

  // Send stylish introduction
  const introText = getStylishIntro();
  await bot.sendMessage(chatId, introText, {
    parse_mode: 'Markdown',
    reply_markup: getMainMenuKeyboard()
  });
});

// /help command
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  db.logCommand('/help');

  const helpText = `*🤖 ${config.BOT_NAME} - Help*

*User Commands:*
/scrapnewweb - Kisi bhi website ka data extract karein
/oldscrapedweb - Pehle scrape ki hui websites dekhein
/mystatics - Apni usage statistics dekhein

*Owner Commands:*
/broadcast - Sab users ko message bhejein
/botstatics - Bot ki statistics dekhein
/userlist - Users ki list dekhein
/addowner - Naya owner add karein
/addbottoken - Naya bot token add karein`;

  await bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
});

// ============ CALLBACK QUERY HANDLERS ============
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;
  const messageId = query.message.message_id;

  await bot.answerCallbackQuery(query.id);

  // Channel verification
  if (data === 'verify_join') {
    const isJoined = await isUserInChannel(userId);
    if (isJoined) {
      await bot.deleteMessage(chatId, messageId);
      await bot.sendMessage(chatId, config.MESSAGES.VERIFY_JOIN, { parse_mode: 'Markdown' });

      const introText = getStylishIntro();
      await bot.sendMessage(chatId, introText, {
        parse_mode: 'Markdown',
        reply_markup: getMainMenuKeyboard()
      });
    } else {
      await bot.answerCallbackQuery(query.id, {
        text: '❌ Aap ne channel join nahi kiya!',
        show_alert: true
      });
    }
    return;
  }

  // Main Menu
  if (data === 'main_menu') {
    const introText = getStylishIntro();
    await bot.editMessageText(introText, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: getMainMenuKeyboard()
    });
    return;
  }

  // User Menu
  if (data === 'user_menu') {
    const user = db.getUser(userId);
    const totalScraped = db.getUserScrapedWebsites(userId).length;

    const text = `*👤 User Menu*\n\n👤 Name: ${user?.firstName || 'User'}\n🆔 ID: \`${userId}\`\n📊 Total Scraped: ${totalScraped}\n\n*Choose an option:*`;

    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: getUserMenuKeyboard()
    });
    return;
  }

  // Scrap New Web
  if (data === 'scrap_new') {
    db.setUserState(userId, { action: 'scraping' });
    const text = `*🆕 Scrap New Website*\n\n🌐 Kisi bhi website ka link bhejein.\n\nMain uski files extract karke ZIP mein dunga:\n• HTML Files\n• CSS Files\n• JavaScript Files\n• Database Hints\n• API Endpoints\n\n*Example:*\n\`https://example.com\``;

    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Back', callback_data: 'user_menu' }]
        ]
      }
    });
    return;
  }

  // Old Scraped Websites
  if (data === 'old_scraped') {
    const websites = db.getUserScrapedWebsites(userId);

    if (websites.length === 0) {
      await bot.editMessageText('*📁 Old Scraped Websites*\n\n❌ Aap ne abhi tak koi website scrape nahi ki!', {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Back', callback_data: 'user_menu' }]
          ]
        }
      });
      return;
    }

    const keyboard = websites.map((site, index) => [
      { text: `${index + 1}. ${new URL(site.url).hostname}`, callback_data: `download_${site.id}` }
    ]);
    keyboard.push([{ text: '🔙 Back', callback_data: 'user_menu' }]);

    const text = `*📁 Your Scraped Websites (${websites.length})*\n\nApni scrape ki hui files download karein:`;

    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
    return;
  }

  // Download specific scraped file
  if (data.startsWith('download_')) {
    const siteId = data.replace('download_', '');
    const websites = db.getUserScrapedWebsites(userId);
    const site = websites.find(w => w.id === siteId);

    if (site && fs.existsSync(site.zipPath)) {
      await bot.sendDocument(chatId, site.zipPath, {
        caption: `📁 *Scraped Files*\n\n🌐 URL: ${site.url}\n📅 Date: ${new Date(site.createdAt).toLocaleDateString()}`,
        parse_mode: 'Markdown'
      });
    } else {
      await bot.sendMessage(chatId, '❌ File not found or expired!');
    }
    return;
  }

  // My Statics
  if (data === 'my_statics') {
    const user = db.getUser(userId);
    const websites = db.getUserScrapedWebsites(userId);
    const stats = db.getStats();

    const text = `*📊 Your Statistics*\n\n👤 *Name:* ${user?.firstName || 'User'}\n🆔 *ID:* \`${userId}\`\n📅 *Joined:* ${new Date(user?.joinedAt).toLocaleDateString()}\n\n📊 *Activity:*\n🌐 Websites Scraped: ${websites.length}\n📁 Total Downloads: ${websites.length}\n\n*Last Active:* ${new Date(user?.lastActive).toLocaleString()}`;

    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Back', callback_data: 'user_menu' }]
        ]
      }
    });
    return;
  }

  // Owner Menu
  if (data === 'owner_menu') {
    if (!db.isOwner(userId)) {
      await bot.answerCallbackQuery(query.id, {
        text: '❌ Sirf Owner is menu ko use kar sakta hai!',
        show_alert: true
      });
      return;
    }

    const text = `*👑 Owner Menu*\n\nWelcome Owner!\n\n*Choose an option:*`;

    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: getOwnerMenuKeyboard()
    });
    return;
  }

  // Broadcast
  if (data === 'broadcast') {
    if (!db.isOwner(userId)) return;

    db.setUserState(userId, { action: 'broadcast' });
    await bot.editMessageText('*📢 Broadcast Message*\n\nJo message sab users ko bhejna hai, yahan type karein:', {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Cancel', callback_data: 'owner_menu' }]
        ]
      }
    });
    return;
  }

  // Bot Statics
  if (data === 'bot_statics') {
    if (!db.isOwner(userId)) return;

    const stats = db.getStats();
    const totalUsers = db.getTotalUsers();
    const totalOwners = db.getOwners().length;
    const totalBots = db.getBotTokensList().length;

    const text = `*📊 Bot Statistics*\n\n👥 *Total Users:* ${totalUsers}\n👑 *Total Owners:* ${totalOwners}\n🤖 *Connected Bots:* ${totalBots + 1}\n\n📈 *Activity:*\n🌐 Total Scrapes: ${stats.totalScrapes}\n📁 Total Downloads: ${stats.totalDownloads}\n\n*Command Usage:*\n${Object.entries(stats.commandsUsed).map(([cmd, count]) => `/${cmd}: ${count}`).join('\n')}`;

    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Back', callback_data: 'owner_menu' }]
        ]
      }
    });
    return;
  }

  // User List
  if (data === 'user_list') {
    if (!db.isOwner(userId)) return;

    const users = db.getUserList();
    if (users.length === 0) {
      await bot.editMessageText('*👥 User List*\n\n❌ Koi users nahi mile!', {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Back', callback_data: 'owner_menu' }]
          ]
        }
      });
      return;
    }

    const userText = users.map((u, i) => `${i + 1}. ${u.firstName || 'Unknown'} (@${u.username || 'N/A'}) - \`${u.id}\``).join('\n');
    const text = `*👥 User List (${users.length})*\n\n${userText}`;

    await bot.editMessageText(text.substring(0, 4000), {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Back', callback_data: 'owner_menu' }]
        ]
      }
    });
    return;
  }

  // Add Owner
  if (data === 'add_owner') {
    if (!db.isOwner(userId)) return;

    db.setUserState(userId, { action: 'add_owner' });
    await bot.editMessageText('*➕ Add Owner*\n\nJis user ko owner banana hai uski Chat ID enter karein:\n\n*Example:* \`123456789\`\n\n_Chat ID jaanay ke liye @userinfobot se check karein._', {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Cancel', callback_data: 'owner_menu' }]
        ]
      }
    });
    return;
  }

  // Add Bot Token
  if (data === 'add_bot_token') {
    if (!db.isOwner(userId)) return;

    db.setUserState(userId, { action: 'add_bot_token' });
    await bot.editMessageText('*🤖 Add Bot Token*\n\nNaye bot ka token enter karein:\n\n*Example:* \`123456789:ABCdefGHIjklMNOpqrSTUvwxYZ\`\n\n_Ye bot bilkul isi bot ki tarah kaam karega._', {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Cancel', callback_data: 'owner_menu' }]
        ]
      }
    });
    return;
  }
});

// ============ MESSAGE HANDLER (For states) ============
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  if (!text || text.startsWith('/')) return;

  const state = db.getUserState(userId);
  if (!state) return;

  // Scraping state
  if (state.action === 'scraping') {
    db.clearUserState(userId);

    // Validate URL
    let url;
    try {
      url = new URL(text);
    } catch {
      await bot.sendMessage(chatId, '❌ Invalid URL! Please send a valid URL starting with http:// or https://');
      return;
    }

    await bot.sendMessage(chatId, `⏳ *Scraping in progress...*\n\n🌐 URL: ${url.href}\n\nPlease wait, this may take a minute...`, { parse_mode: 'Markdown' });

    try {
      const result = await scrapeWebsite(url, userId);

      // Save to database
      db.saveScrapedWebsite(userId, url.href, result.zipPath);
      db.incrementStat('scrape');

      await bot.sendMessage(chatId, `✅ *Scraping Complete!*\n\n🌐 Domain: ${result.domain}\n📁 Files extracted:\n${Object.entries(result.info.files).map(([k, v]) => `• ${k}: ${Array.isArray(v) ? v.length : v}`).join('\n')}`, { parse_mode: 'Markdown' });

      // Send ZIP file
      if (fs.existsSync(result.zipPath)) {
        await bot.sendDocument(chatId, result.zipPath, {
          caption: `📁 *${result.domain}*\n\nScraped by ${config.BOT_NAME}`,
          parse_mode: 'Markdown'
        });
      }
    } catch (error) {
      console.error('Scrape error:', error);
      await bot.sendMessage(chatId, `❌ *Scraping Failed!*\n\nError: ${error.message}\n\nPlease try again with a different URL.`, { parse_mode: 'Markdown' });
    }

    // Show user menu again
    await bot.sendMessage(chatId, '*👤 User Menu*\n\nChoose an option:', {
      parse_mode: 'Markdown',
      reply_markup: getUserMenuKeyboard()
    });
    return;
  }

  // Broadcast state
  if (state.action === 'broadcast') {
    db.clearUserState(userId);

    const users = db.getUserList();
    let sent = 0;
    let failed = 0;

    await bot.sendMessage(chatId, `*📢 Broadcasting to ${users.length} users...*`, { parse_mode: 'Markdown' });

    for (const user of users) {
      try {
        await bot.sendMessage(user.id, `*📢 Broadcast Message*\n\n${text}`, { parse_mode: 'Markdown' });
        sent++;
      } catch {
        failed++;
      }
    }

    await bot.sendMessage(chatId, `*✅ Broadcast Complete!*\n\n📤 Sent: ${sent}\n❌ Failed: ${failed}`, { parse_mode: 'Markdown' });
    return;
  }

  // Add Owner state
  if (state.action === 'add_owner') {
    db.clearUserState(userId);

    const newOwnerId = text.trim();
    if (!/^\d+$/.test(newOwnerId)) {
      await bot.sendMessage(chatId, '❌ Invalid Chat ID! Please enter numbers only.');
      return;
    }

    const added = db.addOwner(newOwnerId);
    if (added) {
      await bot.sendMessage(chatId, `✅ *Owner Added!*\n\n🆔 Chat ID: \`${newOwnerId}\`\n\nAb ye user Owner Menu use kar sakta hai.`, { parse_mode: 'Markdown' });
    } else {
      await bot.sendMessage(chatId, '⚠️ Ye user already owner hai!');
    }
    return;
  }

  // Add Bot Token state
  if (state.action === 'add_bot_token') {
    db.clearUserState(userId);

    const token = text.trim();
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
      await bot.sendMessage(chatId, '❌ Invalid Bot Token Format!');
      return;
    }

    // Save token
    db.addBotToken(token);

    // Start new bot instance
    try {
      const newBot = new TelegramBot(token, { polling: true });

      newBot.onText(/\/start/, async (msg) => {
        const newChatId = msg.chat.id;
        const newUserId = msg.from.id;
        const username = msg.from.username || 'Unknown';
        const firstName = msg.from.first_name || 'User';

        db.saveUser(newUserId, { username, firstName });

        const isJoined = await (async () => {
          try {
            const channelUsername = config.CHANNELS.telegram.username.replace('@', '');
            const member = await newBot.getChatMember(`@${channelUsername}`, newUserId);
            return ['member', 'administrator', 'creator'].includes(member.status);
          } catch {
            return false;
          }
        })();

        if (!isJoined) {
          await newBot.sendMessage(newChatId, config.MESSAGES.MUST_JOIN, {
            parse_mode: 'Markdown',
            reply_markup: getChannelKeyboard()
          });
          return;
        }

        const introText = getStylishIntro();
        await newBot.sendMessage(newChatId, introText, {
          parse_mode: 'Markdown',
          reply_markup: getMainMenuKeyboard()
        });
      });

      // Add callback handlers for new bot
      newBot.on('callback_query', async (query) => {
        const newChatId = query.message.chat.id;
        const newUserId = query.from.id;
        const data = query.data;
        const messageId = query.message.message_id;

        await newBot.answerCallbackQuery(query.id);

        if (data === 'verify_join') {
          const isJoined = await (async () => {
            try {
              const channelUsername = config.CHANNELS.telegram.username.replace('@', '');
              const member = await newBot.getChatMember(`@${channelUsername}`, newUserId);
              return ['member', 'administrator', 'creator'].includes(member.status);
            } catch {
              return false;
            }
          })();

          if (isJoined) {
            await newBot.deleteMessage(newChatId, messageId);
            await newBot.sendMessage(newChatId, config.MESSAGES.VERIFY_JOIN, { parse_mode: 'Markdown' });
            const introText = getStylishIntro();
            await newBot.sendMessage(newChatId, introText, {
              parse_mode: 'Markdown',
              reply_markup: getMainMenuKeyboard()
            });
          }
          return;
        }

        if (data === 'main_menu') {
          await newBot.editMessageText(getStylishIntro(), {
            chat_id: newChatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: getMainMenuKeyboard()
          });
          return;
        }

        if (data === 'user_menu') {
          const user = db.getUser(newUserId);
          const totalScraped = db.getUserScrapedWebsites(newUserId).length;
          const text = `*👤 User Menu*\n\n👤 Name: ${user?.firstName || 'User'}\n🆔 ID: \`${newUserId}\`\n📊 Total Scraped: ${totalScraped}\n\n*Choose an option:*`;
          await newBot.editMessageText(text, {
            chat_id: newChatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: getUserMenuKeyboard()
          });
          return;
        }

        if (data === 'scrap_new') {
          db.setUserState(newUserId, { action: 'scraping' });
          await newBot.editMessageText(`*🆕 Scrap New Website*\n\n🌐 Website URL bhejein:`, {
            chat_id: newChatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: '🔙 Back', callback_data: 'user_menu' }]] }
          });
          return;
        }

        if (data === 'old_scraped') {
          const websites = db.getUserScrapedWebsites(newUserId);
          if (websites.length === 0) {
            await newBot.editMessageText('*📁 Old Scraped Websites*\n\n❌ Koi websites nahi!', {
              chat_id: newChatId,
              message_id: messageId,
              parse_mode: 'Markdown',
              reply_markup: { inline_keyboard: [[{ text: '🔙 Back', callback_data: 'user_menu' }]] }
            });
            return;
          }
          const keyboard = websites.map((site, index) => [
            { text: `${index + 1}. ${new URL(site.url).hostname}`, callback_data: `download_${site.id}` }
          ]);
          keyboard.push([{ text: '🔙 Back', callback_data: 'user_menu' }]);
          await newBot.editMessageText(`*📁 Your Scraped Websites (${websites.length})*`, {
            chat_id: newChatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
          });
          return;
        }

        if (data === 'my_statics') {
          const user = db.getUser(newUserId);
          const websites = db.getUserScrapedWebsites(newUserId);
          const text = `*📊 Your Statistics*\n\n👤 *Name:* ${user?.firstName || 'User'}\n🆔 *ID:* \`${newUserId}\`\n📅 *Joined:* ${new Date(user?.joinedAt).toLocaleDateString()}\n🌐 Websites Scraped: ${websites.length}`;
          await newBot.editMessageText(text, {
            chat_id: newChatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: '🔙 Back', callback_data: 'user_menu' }]] }
          });
          return;
        }

        if (data === 'owner_menu') {
          if (!db.isOwner(newUserId)) {
            await newBot.answerCallbackQuery(query.id, { text: '❌ Sirf Owner!', show_alert: true });
            return;
          }
          await newBot.editMessageText('*👑 Owner Menu*\n\nWelcome Owner!', {
            chat_id: newChatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: getOwnerMenuKeyboard()
          });
          return;
        }

        // Handle downloads for new bot
        if (data.startsWith('download_')) {
          const siteId = data.replace('download_', '');
          const websites = db.getUserScrapedWebsites(newUserId);
          const site = websites.find(w => w.id === siteId);
          if (site && fs.existsSync(site.zipPath)) {
            await newBot.sendDocument(newChatId, site.zipPath, {
              caption: `📁 *Scraped Files*\n\n🌐 URL: ${site.url}`,
              parse_mode: 'Markdown'
            });
          } else {
            await newBot.sendMessage(newChatId, '❌ File not found!');
          }
          return;
        }
      });

      // Message handler for new bot
      newBot.on('message', async (msg) => {
        const newChatId = msg.chat.id;
        const newUserId = msg.from.id;
        const text = msg.text;

        if (!text || text.startsWith('/')) return;

        const state = db.getUserState(newUserId);
        if (!state) return;

        if (state.action === 'scraping') {
          db.clearUserState(newUserId);
          let url;
          try {
            url = new URL(text);
          } catch {
            await newBot.sendMessage(newChatId, '❌ Invalid URL!');
            return;
          }

          await newBot.sendMessage(newChatId, `⏳ *Scraping...*\n\n🌐 ${url.href}`, { parse_mode: 'Markdown' });

          try {
            const result = await scrapeWebsite(url, newUserId);
            db.saveScrapedWebsite(newUserId, url.href, result.zipPath);
            db.incrementStat('scrape');
            await newBot.sendMessage(newChatId, `✅ *Scraping Complete!*\n\n🌐 ${result.domain}`, { parse_mode: 'Markdown' });
            if (fs.existsSync(result.zipPath)) {
              await newBot.sendDocument(newChatId, result.zipPath, {
                caption: `📁 *${result.domain}*\n\nScraped by ${config.BOT_NAME}`,
                parse_mode: 'Markdown'
              });
            }
          } catch (error) {
            await newBot.sendMessage(newChatId, `❌ Error: ${error.message}`, { parse_mode: 'Markdown' });
          }
          return;
        }
      });

      console.log(`New bot started with token: ${token.substring(0, 15)}...`);
      await bot.sendMessage(chatId, `✅ *Bot Connected!*\n\n🤖 New bot is now online and working!\n\n_Token: ${token.substring(0, 15)}..._`, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Bot token error:', error);
      await bot.sendMessage(chatId, `❌ *Failed to connect bot!*\n\nError: ${error.message}`, { parse_mode: 'Markdown' });
    }

    return;
  }
});

// ============ ERROR HANDLING ============
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
});

bot.on('error', (error) => {
  console.error('Bot error:', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

console.log(`${config.BOT_NAME} is fully operational!`);
