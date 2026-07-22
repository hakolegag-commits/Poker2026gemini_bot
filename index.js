const { Telegraf } = require('telegraf');
const http = require('http');

const bot = new Telegraf('8939019076:AAHTYvEE9VfYfl82epZlhEquPij3WzttMa4');

bot.start((ctx) => {
  ctx.reply('Привет! Добро пожаловать за столы Техасского Холдема! Делай ставки и побеждай.');
});

const PORT = process.env.PORT || 3000;

// Создаем сервер с простым путем /webhook
const server = http.createServer(bot.webhookCallback('/webhook'));

server.listen(PORT, async () => {
  console.log(`Server is listening on port ${PORT}`);
  
  // Указываем Telegram отправлять данные на /webhook
  const URL = process.env.RENDER_EXTERNAL_URL || `https://poker2026gemini-bot.onrender.com`;
  await bot.telegram.setWebhook(`${URL}/webhook`);
  console.log('Webhook is automatically set!');
});
