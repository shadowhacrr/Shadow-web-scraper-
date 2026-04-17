# 🤖 Web Scraper by Shadow - Telegram Bot

A powerful Telegram bot that scrapes websites and extracts JS, CSS, HTML, and DB files into ZIP format.

## ✨ Features

- 🔒 **Channel Verification** - Users must join channel before using
- 🌐 **Web Scraping** - Extracts HTML, CSS, JS, and DB hints
- 📁 **ZIP Export** - All files packaged in ZIP format
- 📊 **Statistics** - User and bot activity tracking
- 👑 **Owner Panel** - Broadcast, user management, add owners
- 🤖 **Multi-Bot Support** - Add multiple bot tokens
- 📦 **JSON Storage** - No database needed, all JSON based
- 🚀 **Railway Ready** - Easy deployment on Railway.app

## 🚀 Deployment on Railway

### Step 1: Create Bot
1. Open [@BotFather](https://t.me/BotFather) on Telegram
2. Create new bot with name `Web Scraper by Shadow`
3. Copy the bot token

### Step 2: Get Your Chat ID
1. Message [@userinfobot](https://t.me/userinfobot)
2. Copy your Chat ID

### Step 3: Update Config
1. Open `config.js`
2. Update `DEFAULT_OWNERS` with your Chat ID
3. Update `CHANNELS` with your channel links
4. Update `DEVELOPER` with your info

### Step 4: Deploy
1. Go to [Railway.app](https://railway.app)
2. Create new project from GitHub repo
3. Add environment variable: `BOT_TOKEN=your_bot_token_here`
4. Deploy!

### Environment Variables
```
BOT_TOKEN=your_telegram_bot_token
PORT=3000
```

## 📁 File Structure

```
├── index.js          # Main bot file
├── config.js         # Configuration
├── utils/
│   └── dataManager.js # JSON data management
├── data/             # JSON data storage (auto-created)
├── scraped/          # Scraped ZIP files (auto-created)
└── package.json
```

## 📝 Commands

### User Commands
| Command | Description |
|---------|-------------|
| /start | Start the bot |
| /help | Show help message |

### Owner Commands
| Command | Description |
|---------|-------------|
| Broadcast | Send message to all users |
| Bot Statics | View bot statistics |
| User List | List all users |
| Add Owner | Add new owner by Chat ID |
| Add Bot Token | Add new bot instance |

## 🛠️ Developer Info

- **Name:** Shadow
- **Telegram:** [@shadowdev](https://t.me/shadowdev)
- **GitHub:** [shadowdev](https://github.com/shadowdev)

---

Made with ❤️ by Shadow
