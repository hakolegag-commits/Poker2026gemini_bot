const { Telegraf } = require('telegraf');
const http = require('http');

const bot = new Telegraf('8939019076:AAHTYvEE9VFYfl82epZlhEquPij3WzttMa4');

bot.start((ctx) => {
  ctx.reply('Привет! Добро пожаловать за столы Техасского Холдема! Делай ставки и побеждай.');
});

bot.launch();
console.log('Покерный бот запущен!');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is running');
});

server.listen(process.env.PORT || 3000, () => {
  console.log('Server is listening...');
});
