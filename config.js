module.exports = {
  // Bot Configuration
  BOT_NAME: "Web Scraper by Shadow",
  
  // Developer Info - AAP YAHAN APNI INFO DALEN
  DEVELOPER: {
    name: "Shadow",
    title: "Full Stack Developer & cyber hacrr",
    bio: "Passionate developer creating powerful tools and automation solutions.",
    social: {
      telegram: "https://t.me/shadowhacrrr",
      youtube: "https://youtube.com/@shadowhere.460?si=F4X5rM5nvl94x1TA",
      whatsapp: "https://wa.me/923709515870",
      github: "https://github.com/shadowhacrr",
      instagram: "https://www.instagram.com/shadow76866?igsh=MTEydDF3ZXptMHNyNA=="
    }
  },

  // Channel Links - AAP YAHAN APNI CHANNELS DALEN
  CHANNELS: {
    telegram: {
      username: "@shadowhacrrr",  // Aapka Telegram channel
      link: "https://t.me/ssbugchannel",
      name: "SHADOW OFFICIAL"
    },
    youtube: {
      link: "https://youtube.com/@shadowhere.460?si=F4X5rM5nvl94x1TA",
      name: "HOW TO BE A HACKER"
    },
    whatsapp: {
      link: "https://whatsapp.com/channel/0029VbD54jxEgGfIqPaPSK24",
      name: "Shadow OFFICIAL"
    }
  },

  // Default Owner - AAPNI CHAT ID YAHAN DALEN
  // Apni chat ID jaanay ke liye @userinfobot ko message karein
  DEFAULT_OWNERS: ["8627624927"],  // <-- APNI TELEGRAM CHAT ID YAHAN DALEN

  // Bot Token - Railway pe BOT_TOKEN environment variable se bhi le sakta hai
  BOT_TOKEN: process.env.BOT_TOKEN || "8175499403:AAFMNWZJfsdUd8fkWgiREEazR4GAp-UnkN4",

  // Server
  PORT: process.env.PORT || 3000,

  // Scraping
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB max
  SCRAPE_TIMEOUT: 120000, // 2 minutes

  // Messages
  MESSAGES: {
    MUST_JOIN: "🔒 *Channel Verification Required*\n\nBot use karne ke liye aapko hamare channel join karna hoga!",
    VERIFY_JOIN: "✅ Maine check kiya, aap ne channel join kar liya hai!\n\nAb aap bot use kar sakte hain.",
    NOT_JOINED: "❌ Aap ne abhi tak channel join nahi kiya!\n\nPehle channel join karein, phir Verify button dabayein.",
    WELCOME: "🎉 *Welcome to Web Scraper by Shadow!*\n\nMain aapki website se JS, CSS, HTML, aur database files extract karke ZIP mein dunga.",
    INTRODUCTION: `👨‍💻 *Developer Introduction*

*Name:* Shadow
*Role:* Full Stack Developer & Bot Creator
*Bio:* Passionate developer creating powerful tools and automation solutions.

🌐 *Social Media:*
📱 Telegram: {telegram}
▶️ YouTube: {youtube}
💬 WhatsApp: {whatsapp}
🐙 GitHub: {github}
📸 Instagram: {instagram}`,
  }
};
