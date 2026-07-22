const { Telegraf } = require('telegraf');
const http = require('http');

const bot = new Telegraf('8939019076:AAHTYvEE9VfYfl82epZlhEquPij3WzttMa4');

bot.start((ctx) => {
  ctx.reply('Привет! Добро пожаловать за столы Техасского Холдема! Делай ставки и побеждай.');
});

// Настройка вебхука для Render
const PORT = process.env.PORT || 3000;
const TOKEN = '8939019076:AAHTYvEE9VfYfl82epZlhEquPij3WzttMa4';
const URL = process.env.RENDER_EXTERNAL_URL || `https://poker2026gemini-bot.onrender.com`;

const server = http.createServer(bot.webhookCallback(`/${TOKEN}`));

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
  bot.telegram.setWebhook(`${URL}/${TOKEN}`);
  console.log('Webhook is set');
});
