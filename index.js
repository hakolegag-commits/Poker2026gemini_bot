const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf('8939019076:AAHTYvEE9VFYfl82epZlhEquPij3WzttMa4');

// Хранение состояния столов
const games = {};

const suits = ['♠', '♥', '♦', '♣'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const getRandomCard = () => `${values[Math.floor(Math.random() * values.length)]}${suits[Math.floor(Math.random() * suits.length)]}`;

bot.start((ctx) => {
  ctx.reply(
    '♠️ **Добро пожаловать в покерный клуб!**\nСоздайте стол для игры.',
    Markup.inlineKeyboard([
      [Markup.button.callback('🎮 Создать стол', 'create_game')],
      [Markup.button.callback('🪑 Сесть за стол', 'join_game')]
    ])
  );
});

bot.action('create_game', async (ctx) => {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const userName = ctx.from.first_name || 'Игрок';

  games[chatId] = {
    players: [{ id: userId, name: userName, chips: 1000, cards: [] }],
    pot: 0,
    communityCards: [],
    status: 'waiting'
  };

  await ctx.answerCbQuery('Стол создан!');
  await ctx.editMessageText(
    `🏆 **Покерный стол создан!**\nИгрок: ${userName}\n\nЖдем остальных участников...`,
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
    games[chatId] = { players: [], pot: 0, communityCards: [], status: 'waiting' };
  }

  const game = games[chatId];
  if (!game.players.some(p => p.id === userId)) {
    game.players.push({ id: userId, name: userName, chips: 1000, cards: [] });
    await ctx.answerCbQuery('Вы за столом!');
  } else {
    await ctx.answerCbQuery('Вы уже участвуете!');
  }

  const playerList = game.players.map(p => `👤 ${p.name} (${p.chips} фишек)`).join('\n');

  await ctx.editMessageText(
    `🏆 **Покерный стол**\n\n**Участники:**\n${playerList}`,
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
    await ctx.answerCbQuery('Нет игроков!');
    return;
  }

  game.status = 'playing';
  game.pot = game.players.length * 20; 
  game.communityCards = [getRandomCard(), getRandomCard(), getRandomCard()];

  for (const player of game.players) {
    player.cards = [getRandomCard(), getRandomCard()];
    
    try {
      await bot.telegram.sendMessage(
        player.id,
        `🃏 **Ваши карты:** ${player.cards[0]}  ${player.cards[1]}\n🏦 **Банк стола:** ${game.pot}\n📍 **Флоп:** ${game.communityCards.join(' ')}`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback('💵 Колл', 'action_call'),
            Markup.button.callback('📈 Рейз', 'action_raise')
          ],
          [
            Markup.button.callback('❌ Фолд', 'action_fold')
          ]
        ])
      );
    } catch (e) {
      // Игнорируем ошибку, если нет диалога с ботом в лс
    }
  }

  await ctx.answerCbQuery('Раздача началась!');
  await ctx.editMessageText(
    `🎲 **Идет игра!**\n\nБанк: ${game.pot} фишек\nОбщие карты: ${game.communityCards.join(' ')}\n\nКарты и кнопки действий отправлены игрокам в личные сообщения!`
  );
});

bot.action('action_call', async (ctx) => {
  await ctx.answerCbQuery('Вы уравняли ставку (Колл)!');
  await ctx.editMessageText('✅ Вы поддержали ставку. Ожидаем остальных игроков.');
});

bot.action('action_raise', async (ctx) => {
  await ctx.answerCbQuery('Вы повысили ставку (Рейз)!');
  await ctx.editMessageText('🚀 Вы сделали рейз. Торги продолжаются.');
});

bot.action('action_fold', async (ctx) => {
  await ctx.answerCbQuery('Вы сбросили карты (Фолд)');
  await ctx.editMessageText('❌ Вы сбросили карты и вышли из этой раздачи.');
});

const PORT = process.env.PORT || 3000;
bot.launch({
  webhook: {
    domain: 'poker2026gemini-bot.onrender.com',
    port: PORT
  }
});

console.log('Poker engine bot is running!');
🚀 Начать игру', 'start_game')]
    ])
  );
});

bot.action('join_game', async (ctx) => {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const userName = ctx.from.first_name || 'Игрок';

  if (!games[chatId]) {
    games[chatId] = { players: [], pot: 0, communityCards: [], status: 'waiting' };
  }

  const game = games[chatId];
  if (!game.players.some(p => p.id === userId)) {
    game.players.push({ id: userId, name: userName, chips: 1000, cards: [] });
    await ctx.answerCbQuery('Вы за столом!');
  } else {
    await ctx.answerCbQuery('Вы уже участвуете!');
  }

  const playerList = game.players.map(p => `👤 ${p.name} (${p.chips} фишек)`).join('\n');

  await ctx.editMessageText(
    `🏆 **Покерный стол**\n\n**Участники:**\n${playerList}`,
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
    await ctx.answerCbQuery('Нет игроков!');
    return;
  }

  game.status = 'playing';
  game.pot = game.players.length * 20; // Анте / блайнды
  game.communityCards = [getRandomCard(), getRandomCard(), getRandomCard()];

  // Раздаем карты и выводим кнопки управления для каждого
  for (const player of game.players) {
    player.cards = [getRandomCard(), getRandomCard()];
    
    try {
      await bot.telegram.sendMessage(
        player.id,
        `🃏 **Ваши карты:** ${player.cards[0]}  ${player.cards[1]}\n🏦 **Банк стола:** ${game.pot}\n📍 **Флоп:** ${game.communityCards.join(' ')}`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback('💵 Колл', 'action_call'),
            Markup.button.callback('📈 Рейз', 'action_raise')
          ],
          [
            Markup.button.callback('❌ Фолд', 'action_fold')
          ]
        ])
      );
    } catch (e) {
      // Если бот не в ЛС
    }
  }

  await ctx.answerCbQuery('Раздача началась!');
  await ctx.editMessageText(
    `🎲 **Идет игра!**\n\nБанк: ${game.pot} фишек\nОбщие карты: ${game.communityCards.join(' ')}\n\nКарты и кнопки действий отправлены игрокам в личные сообщения!`
  );
});

// Обработка действий в личных сообщениях
bot.action('action_call', async (ctx) => {
  await ctx.answerCbQuery('Вы уравняли ставку (Колл)!');
  await ctx.editMessageText('✅ Вы поддержали ставку. Ожидаем остальных игроков.');
});

bot.action('action_raise', async (ctx) => {
  await ctx.answerCbQuery('Вы повысили ставку (Рейз)!');
  await ctx.editMessageText('🚀 Вы сделали рейз. Торги продолжаются.');
});

bot.action('action_fold', async (ctx) => {
  await ctx.answerCbQuery('Вы сбросили карты (Фолд)');
  await ctx.editMessageText('❌ Вы сбросили карты и вышли из этой раздачи.');
});

const PORT = process.env.PORT || 3000;
bot.launch({
  webhook: {
    domain: 'poker2026gemini-bot.onrender.com',
    port: PORT
  }
});

console.log('Poker engine bot is running!');
');

// Хранение состояния столов
const games = {};

const suits = ['♠', '♥', '♦', '♣'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const getRandomCard = () => `${values[Math.floor(Math.random() * values.length)]}${suits[Math.floor(Math.random() * suits.length)]}`;

bot.start((ctx) => {
  ctx.reply(
    '♠️ **Добро пожаловать в покерный клуб!**\nСоздайте стол для игры.',
    Markup.inlineKeyboard([
      [Markup.button.callback('🎮 Создать стол', 'create_game')],
      [Markup.button.callback('🪑 Сесть за стол', 'join_game')]
    ])
  );
});

bot.action('create_game', async (ctx) => {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const userName = ctx.from.first_name || 'Игрок';

  games[chatId] = {
    players: [{ id: userId, name: userName, chips: 1000, cards: [] }],
    pot: 0,
    communityCards: [],
    status: 'waiting'
  };

  await ctx.answerCbQuery('Стол создан!');
  await ctx.editMessageText(
    `🏆 **Покерный стол создан!**\nИгрок: ${userName}\n\nЖдем остальных участников...`,
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
    games[chatId] = { players: [], pot: 0, communityCards: [], status: 'waiting' };
  }

  const game = games[chatId];
  if (!game.players.some(p => p.id === userId)) {
    game.players.push({ id: userId, name: userName, chips: 1000, cards: [] });
    await ctx.answerCbQuery('Вы за столом!');
  } else {
    await ctx.answerCbQuery('Вы уже участвуете!');
  }

  const playerList = game.players.map(p => `👤 ${p.name} (${p.chips} фишек)`).join('\n');

  await ctx.editMessageText(
    `🏆 **Покерный стол**\n\n**Участники:**\n${playerList}`,
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
    await ctx.answerCbQuery('Нет игроков!');
    return;
  }

  game.status = 'playing';
  game.pot = game.players.length * 20; // Анте / блайнды
  game.communityCards = [getRandomCard(), getRandomCard(), getRandomCard()];

  // Раздаем карты и выводим кнопки управления для каждого
  for (const player of game.players) {
    player.cards = [getRandomCard(), getRandomCard()];
    
    try {
      await bot.telegram.sendMessage(
        player.id,
        `🃏 **Ваши карты:** ${player.cards[0]}  ${player.cards[1]}\n🏦 **Банк стола:** ${game.pot}\n📍 **Флоп:** ${game.communityCards.join(' ')}`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback('💵 Колл', 'action_call'),
            Markup.button.callback('📈 Рейз', 'action_raise')
          ],
          [
            Markup.button.callback('❌ Фолд', 'action_fold')
          ]
        ])
      );
    } catch (e) {
      // Если бот не в ЛС
    }
  }

  await ctx.answerCbQuery('Раздача началась!');
  await ctx.editMessageText(
    `🎲 **Идет игра!**\n\nБанк: ${game.pot} фишек\nОбщие карты: ${game.communityCards.join(' ')}\n\nКарты и кнопки действий отправлены игрокам в личные сообщения!`
  );
});

// Обработка действий в личных сообщениях
bot.action('action_call', async (ctx) => {
  await ctx.answerCbQuery('Вы уравняли ставку (Колл)!');
  await ctx.editMessageText('✅ Вы поддержали ставку. Ожидаем остальных игроков.');
});

bot.action('action_raise', async (ctx) => {
  await ctx.answerCbQuery('Вы повысили ставку (Рейз)!');
  await ctx.editMessageText('🚀 Вы сделали рейз. Торги продолжаются.');
});

bot.action('action_fold', async (ctx) => {
  await ctx.answerCbQuery('Вы сбросили карты (Фолд)');
  await ctx.editMessageText('❌ Вы сбросили карты и вышли из этой раздачи.');
});

const PORT = process.env.PORT || 3000;
bot.launch({
  webhook: {
    domain: 'poker2026gemini-bot.onrender.com',
    port: PORT
  }
});

console.log('Poker engine bot is running!');
