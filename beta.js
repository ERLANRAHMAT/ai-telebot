const Telegraf = require('node-telegram-bot-api');
const { openai } = require('betabotz-tools');
const util = require('util');
const chalk = require('chalk');
const figlet = require('figlet');
const fs = require('fs');
const express = require('express'); 
const app = express();
const port = process.env.PORT || 8080;

const { token, ownerUsername } = JSON.parse(fs.readFileSync('./settings.json'));

// express endpoint
app.set('json spaces', 2);
app.get('/', (req, res) => {
  const data = {
    status: 'true',
    message: `Telegram Bot Successfully Activated! Bot Token: ${token}`,
    author: 'Lann',
  };
  const result = {
    response: data,
  };
  res.json(result);
});

function listenOnPort(port) {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
  app.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is already in use. Trying another port...`);
      listenOnPort(port + 1);
    } else {
      console.error(err);
    }
  });
}

listenOnPort(port);

// Bot config token 
const bot = new Telegraf(token, { polling: true });
let Start = new Date();

let senderInfo;
let dateInfo;

const logs = (message, color, senderInfo, dateInfo) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(chalk[color](`[${timestamp}] ${senderInfo} ${dateInfo} => ${message}`));
};

const Figlet = () => {
  figlet('ChatBot Ai', { font: 'Block', horizontalLayout: 'default' }, function (err, data) {
    if (err) {
      console.log('Error:', err);
      return;
    }
    console.log(chalk.yellow.bold(data));
    console.log(chalk.yellow(`Lann`));
  });
};

bot.on('polling_error', (error) => {
  logs(`Polling error: ${error.message}`, 'blue');
});

bot.onText(/^\/runtime$/, (msg) => {
  const now = new Date();
  const uptimeMilliseconds = now - Start;
  const uptimeSeconds = Math.floor(uptimeMilliseconds / 1000);
  const uptimeMinutes = Math.floor(uptimeSeconds / 60);
  const uptimeHours = Math.floor(uptimeMinutes / 60);

  const From = msg.chat.id;
  const uptimeMessage = `Active ⚙️: ${uptimeHours} hour ${uptimeMinutes % 60} minute ${uptimeSeconds % 60} second.`;

  senderInfo = `From: ${msg.from.first_name} (@${msg.from.username || 'N/A'})`;
  dateInfo = `Date: ${new Date(msg.date * 1000).toLocaleString()}`;

  const replyMarkup = {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Visit BetaBotz-Ai', url: 'https://api.betabotz.org' }],
      ],
    },
  };
  bot.sendMessage(From, uptimeMessage, { reply_to_message_id: msg.message_id, ...replyMarkup });

  // Tampilkan informasi di console
  logs('Runtime response sent', 'green', senderInfo, dateInfo);
});

bot.onText(/^\/start$/, (msg) => {
  const From = msg.chat.id;
  const user = msg.from;
  const caption = `Hi ${user.first_name}! Welcome to BetaBotz Ai. I am an AI chatbot created by Lann to help you with all your needs 😄. Please tell me what you need, and I will assist you as best as possible.`;

  senderInfo = `From: ${msg.from.first_name} (@${msg.from.username || 'N/A'})`;
  dateInfo = `Date: ${new Date(msg.date * 1000).toLocaleString()}`;

  const replyMarkup = {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Visit BetaBotz-Ai', url: 'https://api.betabotz.org' }],
      ],
    },
  };
  bot.sendMessage(From, caption, { reply_to_message_id: msg.message_id, ...replyMarkup });

  // Tampilkan informasi di console
  logs('Start response sent', 'green', senderInfo, dateInfo);
});

bot.on('message', async (msg) => {
  const From = msg.chat.id;
  if (msg.text && (msg.text.toLowerCase() === '/start' || msg.text.toLowerCase() === '/runtime')) {
    return;
  }

  const q = msg.text;
  const replyToMessageId = msg.message_id; 

  try {
    const data = await openai(q);
    const { result } = data;
    const replyMarkup = {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [{ text: 'BetaBotz Ai', url: 'http://api.betabotz.org' }],
        ],
      },
    };

    const responseMessage = `${result}`;
    bot.sendMessage(From, responseMessage, { reply_to_message_id: replyToMessageId, ...replyMarkup });
    logs('Response sent', 'green', senderInfo, dateInfo);
  } catch (error) {
    const errorMessage = `${senderInfo}\n${dateInfo}\n\nSorry, there was an error on our internal server when contacting AI.`;
    const userUrl = `https://t.me/${msg.from.username}`; 
    const ownerButtonMarkup = {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'User Profile', url: userUrl }],
        ],
      },
    };

    bot.sendMessage(`@${ownerUsername}`, `Error: ${error.message}\n\n${errorMessage}`, ownerButtonMarkup);

    bot.sendMessage(From, errorMessage, { reply_to_message_id: replyToMessageId });

    logs(`[ ERROR ] ${From}: ${error.message}`, 'red', senderInfo, dateInfo);
  }
});