const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf('ВАШ_ТОКЕН_ЗДЕСЬ');

const games = {};

bot.start((ctx) => {
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

  if (!game || game.players.length === 0) {
    await ctx.answerCbQuery('Недостаточно игроков для начала!');
    return;
  }

  game.status = 'playing';

  const suits = ['♠', '♥', '♦', '♣'];
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const getRandomCard = () => `${values[Math.floor(Math.random() * values.length)]}${suits[Math.floor(Math.random() * suits.length)]}`;

  const flop = [getRandomCard(), getRandomCard(), getRandomCard()];

  for (const player of game.players) {
    player.cards = [getRandomCard(), getRandomCard()];
    try {
      await bot.telegram.sendMessage(
        player.id,
        `🃏 Ваши карты: ${player.cards[0]}  ${player.cards[1]}`
      );
    } catch (e) {
      await ctx.reply(`Игрок ${player.name} получил карты в закрытую 🤫`);
    }
  }

  await ctx.answerCbQuery('Игра началась, карты раздаты!');
  await ctx.editMessageText(
    `🎲 **Раздача началась!**\n\nОбщий стол (Флоп): ${flop.join('  ')}`,
    { parse_mode: 'Markdown' }
  );
});

const PORT = process.env.PORT || 3000;
bot.launch({
  webhook: {
    domain: 'poker2026gemini-bot.onrender.com',
    port: PORT
  }
});

console.log('Multiplayer bot is running!');
