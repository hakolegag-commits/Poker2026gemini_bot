const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf('8939019076:AAHTYvEE9VFYfl82epZlhEquPij3WzttMa4');

// Хранилище активных игр и игроков
const games = {};

bot.start((ctx) => {
  const chatId = ctx.chat.id;
  
  ctx.reply(
    '♠️ Добро пожаловать за покерный стол! Хотите запустить новую многопользовательскую игру?',
    Markup.inlineKeyboard([
      [Markup.button.callback('🎮 Создать стол', 'create_game')],
      [Markup.button.callback('🪑 Присоединиться к игре', 'join_game')]
    ])
  );
});

bot.action('create_game', async (ctx) => {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const userName = ctx.from.first_name || 'Игрок';

  // Инициализируем новую комнату/сессию
  games[chatId] = {
    host: userId,
    players: [{ id: userId, name: userName, chips: 1000, cards: [] }],
    status: 'waiting'
  };

  await ctx.answerCbQuery('Стол создан!');
  await ctx.editMessageText(
    `🏆 Покерный стол создан!\nИгрок ${userName} ожидает оппонентов.\n\nТекущие участники: 1`,
    Markup.inlineKeyboard([
      [Markup.button.callback('🪑 Присоединиться', 'join_game')],
      [Markup.button.callback('🚀 Начать игру', 'start_game')]
    ])
  );
});

bot.action('join_game', async (ctx) => {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const userName = ctx.from.first_name || 'Игрок';

  if (!games[chatId]) {
    games[chatId] = { host: userId, players: [], status: 'waiting' };
  }

  const game = games[chatId];
  
  // Проверяем, не зашел ли игрок уже
  if (!game.players.some(p => p.id === userId)) {
    game.players.push({ id: userId, name: userName, chips: 1000, cards: [] });
    await ctx.answerCbQuery('Вы успешно сели за стол!');
  } else {
    await ctx.answerCbQuery('Вы уже за столом!');
  }

  const playerList = game.players.map(p => `- ${p.name}`).join('\n');
  
  await ctx.editMessageText(
    `🏆 Покерный стол открыт!\n\nУчастники:\n${playerList}`,
    Markup.inlineKeyboard([
      [Markup.button.callback('🪑 Присоединиться', 'join_game')],
      [Markup.button.callback('🚀 Начать игру', 'start_game')]
    ])
  );
});

bot.action('start_game', async (ctx) => {
  const chatId = ctx.chat.id;
  const game = games[chatId];

  if (!game || game.players.length < 1) {
    await ctx.answerCbQuery('Недостаточно игроков!');
    return;
  }

  game.status = 'playing';
  await ctx.answerCbQuery('Игра начинается!');
  await ctx.editMessageText('🎲 Раздаем карты игрокам... Партия началась!');
});

// Запуск бота
const PORT = process.env.PORT || 3000;
bot.launch({
  webhook: {
    domain: 'poker2026gemini-bot.onrender.com',
    port: PORT
  }
});

console.log('Multiplayer bot is running!');
