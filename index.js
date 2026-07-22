const { Telegraf } = require('telegraf');

// Вставь свой токен вместо текста ниже внутри кавычек
const bot = new Telegraf('8939019076:AAHTYvEE9VFYfl82epZlhEquPij3WzttMa4');

// Обработчик команды /start
bot.start((ctx) => {
    ctx.reply('Привет! Добро пожаловать за столы Техасского Холдема! Делай ставки и побеждай.');
});

// Запуск бота
bot.launch();
console.log('Покерный бот запущен!');
