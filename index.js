const { Telegraf, Markup } = require('telegraf');

// --- ТОКЕН ТОЛЬКО ИЗ ПЕРЕМЕННОЙ ОКРУЖЕНИЯ ---
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('Не задан BOT_TOKEN!');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Хранилища
const games = new Map();          // gameId -> объект игры
const onlineUsers = new Map();    // userId -> timestamp

// Карты
const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

// Создание колоды
function createDeck() {
  const deck = [];
  for (const suit of SUITS)
    for (const value of VALUES)
      deck.push({ value, suit, code: value + suit });
  return shuffle(deck);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Упрощённая оценка силы руки (без кикеров, для демонстрации)
function evaluateHand(cards) {
  const vals = cards.map(c => VALUES.indexOf(c.value));
  const suits = cards.map(c => c.suit);
  const countByValue = {};
  vals.forEach(v => countByValue[v] = (countByValue[v] || 0) + 1);
  const counts = Object.values(countByValue).sort((a,b) => b - a);
  const isFlush = suits.every(s => s === suits[0]);

  // стрит: проверяем 5 подряд
  const uniqueSorted = [...new Set(vals)].sort((a,b) => a - b);
  let isStraight = false;
  if (uniqueSorted.length >= 5) {
    for (let i = 0; i <= uniqueSorted.length - 5; i++) {
      if (uniqueSorted[i+4] - uniqueSorted[i] === 4) {
        isStraight = true;
        break;
      }
    }
  }
  // спец-случай A-2-3-4-5
  if (uniqueSorted.includes(12) && uniqueSorted.includes(0) && uniqueSorted.includes(1) && uniqueSorted.includes(2) && uniqueSorted.includes(3))
    isStraight = true;

  if (isStraight && isFlush) return 9; // стрит-флэш
  if (counts[0] === 4) return 8;       // каре
  if (counts[0] === 3 && counts[1] === 2) return 7; // фулл-хаус
  if (isFlush) return 6;
  if (isStraight) return 5;
  if (counts[0] === 3) return 4;
  if (counts[0] === 2 && counts[1] === 2) return 3;
  if (counts[0] === 2) return 2;
  return 1;
}

function compareHands(cardsA, cardsB) {
  return evaluateHand(cardsA) - evaluateHand(cardsB);
}

// Создание игры
function createGame(hostId, hostName) {
  const gameId = Math.random().toString(36).substring(2, 8);
  const game = {
    id: gameId,
    players: [],
    hostId,
    status: 'waiting',   // waiting | active | finished
    deck: [],
    communityCards: [],
    pot: 0,
    currentBet: 0,
    dealerIndex: 0,
    currentPlayerIndex: 0,
    smallBlind: 10,
    bigBlind: 20,
    round: 'preflop',
    chatMessages: []     // для хранения последних сообщений чата (опционально)
  };
  games.set(gameId, game);
  return game;
}

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ИГРЫ ---
function nextActivePlayer(game, fromIndex) {
  let idx = (fromIndex + 1) % game.players.length;
  while (game.players[idx].folded && idx !== fromIndex) {
    idx = (idx + 1) % game.players.length;
  }
  return idx;
}

// Отправить кнопки действия только текущему игроку
function notifyCurrentPlayer(game) {
  const player = game.players[game.currentPlayerIndex];
  if (!player || player.folded) return;
  const hand = player.cards.map(c => c.code).join(' ');
  bot.telegram.sendMessage(player.id,
    `🎯 Ваш ход!\n` +
    `💰 Банк: ${game.pot} | Ваш стек: ${player.chips}\n` +
    `🃏 Ваши карты: ${hand}\n` +
    `📍 Общие карты: ${game.communityCards.map(c => c.code).join(' ') || '–'}\n` +
    `📈 Текущая ставка: ${game.currentBet}`,
    Markup.inlineKeyboard([
      [Markup.button.callback('✅ Колл', `action_call_${game.id}`)],
      [Markup.button.callback('📈 Рейз', `action_raise_${game.id}`)],
      [Markup.button.callback('❌ Фолд', `action_fold_${game.id}`)]
    ])
  ).catch(() => {});
}

// Переход к следующей стадии или завершение раздачи
function advanceGame(game) {
  if (game.round === 'preflop') {
    game.round = 'flop';
    game.communityCards.push(game.deck.pop(), game.deck.pop(), game.deck.pop());
  } else if (game.round === 'flop') {
    game.round = 'turn';
    game.communityCards.push(game.deck.pop());
  } else if (game.round === 'turn') {
    game.round = 'river';
    game.communityCards.push(game.deck.pop());
  } else {
    return showdown(game);
  }

  // Сброс ставок перед новым раундом
  game.currentBet = 0;
  game.players.forEach(p => p.currentBet = 0);
  // Первым ходит первый активный после дилера
  game.currentPlayerIndex = nextActivePlayer(game, game.dealerIndex);
  // Разослать всем игрокам общие карты и информацию
  const commStr = game.communityCards.map(c => c.code).join(' ');
  game.players.forEach(p => {
    if (!p.folded) {
      bot.telegram.sendMessage(p.id,
        `🃏 Новый раунд: ${game.round.toUpperCase()}\n` +
        `Общие карты: ${commStr}\n` +
        `💰 Банк: ${game.pot}`
      ).catch(() => {});
    }
  });
  notifyCurrentPlayer(game);
}

function showdown(game) {
  const active = game.players.filter(p => !p.folded);
  let winner;
  if (active.length === 1) {
    winner = active[0];
  } else {
    winner = active.reduce((best, p) => {
      return compareHands(p.cards.concat(game.communityCards), best.cards.concat(game.communityCards)) > 0 ? p : best;
    });
  }
  winner.chips += game.pot;
  const msg = `🏆 Победитель: ${winner.name} (+${game.pot} фишек)`;
  game.players.forEach(p => {
    bot.telegram.sendMessage(p.id, msg).catch(() => {});
  });
  game.status = 'finished';
  games.delete(game.id);
}

// Следующий ход после действия игрока
function nextTurn(game) {
  const nextIdx = nextActivePlayer(game, game.currentPlayerIndex);
  // Если вернулись к тому же игроку (все, кроме него, сфолдили или уравняли), завершаем раунд
  if (nextIdx === game.currentPlayerIndex || game.players.filter(p => !p.folded).length <= 1) {
    advanceGame(game);
  } else {
    game.currentPlayerIndex = nextIdx;
    notifyCurrentPlayer(game);
  }
}

// --- ОБРАБОТЧИКИ БОТА ---
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  onlineUsers.set(userId, Date.now());

  const payload = ctx.startPayload;
  if (payload && payload.startsWith('game_')) {
    const gameId = payload.slice(5);
    const game = games.get(gameId);
    if (!game) return ctx.reply('Стол не найден.');
    if (game.status !== 'waiting') return ctx.reply('Игра уже началась.');
    if (game.players.some(p => p.id === userId)) return ctx.reply('Вы уже за столом.');
    
    game.players.push({
      id: userId,
      name: ctx.from.first_name || 'Игрок',
      chips: 1000,
      cards: [],
      folded: false,
      currentBet: 0
    });
    
    ctx.reply(`✅ Вы присоединились к столу *${gameId}*!`, { parse_mode: 'Markdown' });
    try {
      await bot.telegram.sendMessage(game.hostId, `👤 ${ctx.from.first_name} присоединился к столу ${gameId}`);
    } catch (e) {}
    return;
  }

  ctx.reply(
    '♠️ Добро пожаловать в покерный клуб!\n\n' +
    '🎲 Создайте стол или присоединитесь по ссылке.\n' +
    '👥 Онлайн: /online\n' +
    '💬 Чат: /chat сообщение',
    Markup.inlineKeyboard([
      [Markup.button.callback('🎲 Создать стол', 'create_game')]
    ])
  );
});

bot.command('online', (ctx) => {
  const now = Date.now();
  for (const [id, time] of onlineUsers) if (now - time > 300000) onlineUsers.delete(id);
  ctx.reply(`👥 Сейчас в боте: ${onlineUsers.size} чел.`);
});

bot.command('chat', (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text.split(' ').slice(1).join(' ');
  if (!text) return ctx.reply('Используйте: /chat ваше сообщение');

  // Ищем игру, в которой участвует пользователь
  let game = null;
  for (const g of games.values()) {
    if (g.players.some(p => p.id === userId)) {
      game = g;
      break;
    }
  }
  if (!game) return ctx.reply('Вы не находитесь за столом.');

  const sender = game.players.find(p => p.id === userId);
  const msg = `💬 ${sender.name}: ${text}`;
  game.players.forEach(p => {
    bot.telegram.sendMessage(p.id, msg).catch(() => {});
  });
});

bot.action('create_game', async (ctx) => {
  const userId = ctx.from.id;
  const userName = ctx.from.first_name || 'Игрок';
  const game = createGame(userId, userName);
  game.players.push({ id: userId, name: userName, chips: 1000, cards: [], folded: false, currentBet: 0 });
  
  const inviteLink = `https://t.me/${ctx.botInfo.username}?start=game_${game.id}`;
  await ctx.answerCbQuery('Стол создан!');
  await ctx.reply(
    `🏆 Стол *${game.id}* создан!\n` +
    `🔗 Пригласите игроков: ${inviteLink}\n\n` +
    `Когда все будут готовы, нажмите «Начать игру».`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🚀 Начать игру', `start_game_${game.id}`)],
        [Markup.button.callback('❌ Удалить стол', `delete_game_${game.id}`)]
      ])
    }
  );
});

bot.action(/start_game_(.+)/, async (ctx) => {
  const gameId = ctx.match[1];
  const game = games.get(gameId);
  if (!game) return ctx.answerCbQuery('Стол не найден');
  if (game.players.length < 2) return ctx.answerCbQuery('Минимум 2 игрока');
  if (ctx.from.id !== game.hostId) return ctx.answerCbQuery('Только создатель может начать');

  game.status = 'active';
  game.deck = createDeck();
  game.communityCards = [];
  game.pot = 0;
  game.round = 'preflop';

  // Блайнды: SB и BB списываются до раздачи
  const sbPlayer = game.players[(game.dealerIndex + 1) % game.players.length];
  const bbPlayer = game.players[(game.dealerIndex + 2) % game.players.length];
  sbPlayer.chips -= game.smallBlind;
  bbPlayer.chips -= game.bigBlind;
  game.pot += game.smallBlind + game.bigBlind;
  game.currentBet = game.bigBlind;
  sbPlayer.currentBet = game.smallBlind;
  bbPlayer.currentBet = game.bigBlind;

  // Раздача по 2 карты
  game.players.forEach(p => {
    p.cards = [game.deck.pop(), game.deck.pop()];
    p.folded = false;
  });

  // Отправка карт всем
  for (const player of game.players) {
    const hand = player.cards.map(c => c.code).join(' ');
    try {
      await bot.telegram.sendMessage(player.id, `🃏 Ваши карты: ${hand}\n💰 Ваш стек: ${player.chips}`);
    } catch (e) {}
  }

  // Первый ход – после большого блайнда (дилер=0, SB=1, BB=2, первый активный после BB)
  game.currentPlayerIndex = nextActivePlayer(game, (game.dealerIndex + 2) % game.players.length);
  notifyCurrentPlayer(game);

  await ctx.answerCbQuery('Игра началась!');
  await ctx.editMessageText(`🎲 Стол ${game.id}: игра идёт. Управление в личных сообщениях.`);
});

bot.action(/delete_game_(.+)/, async (ctx) => {
  const gameId = ctx.match[1];
  const game = games.get(gameId);
  if (!game) return ctx.answerCbQuery('Не найдено');
  if (ctx.from.id !== game.hostId) return ctx.answerCbQuery('Вы не создатель');
  games.delete(gameId);
  await ctx.answerCbQuery('Стол удалён');
  await ctx.editMessageText('❌ Стол удалён.');
});

bot.action(/action_(.+)_(.+)/, async (ctx) => {
  const action = ctx.match[1];
  const gameId = ctx.match[2];
  const game = games.get(gameId);
  if (!game || game.status !== 'active') return ctx.answerCbQuery('Игра не активна');
  const userId = ctx.from.id;
  const player = game.players[game.currentPlayerIndex];
  if (!player || player.id !== userId) return ctx.answerCbQuery('Сейчас не ваш ход');
  if (player.folded) return ctx.answerCbQuery('Вы сбросили карты');

  switch (action) {
    case 'fold':
      player.folded = true;
      await ctx.editMessageText('❌ Вы сбросили карты.');
      break;
    case 'call': {
      const amountToCall = game.currentBet - (player.currentBet || 0);
      if (player.chips < amountToCall) return ctx.answerCbQuery('Недостаточно фишек');
      player.chips -= amountToCall;
      game.pot += amountToCall;
      player.currentBet = game.currentBet;
      await ctx.editMessageText('✅ Вы уравняли ставку.');
      break;
    }
    case 'raise': {
      const raiseAmount = game.bigBlind;
      if (player.chips < game.currentBet + raiseAmount) return ctx.answerCbQuery('Недостаточно фишек');
      player.chips -= (game.currentBet + raiseAmount - (player.currentBet || 0));
      game.pot += (game.currentBet + raiseAmount - (player.currentBet || 0));
      game.currentBet += raiseAmount;
      player.currentBet = game.currentBet;
      await ctx.editMessageText('📈 Вы повысили ставку.');
      break;
    }
  }

  await ctx.answerCbQuery();
  nextTurn(game);
});

// --- ЗАПУСК ---
const PORT = process.env.PORT || 3000;
bot.launch({
  webhook: {
    domain: `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'poker2026gemini-bot.onrender.com'}`,
    port: PORT
  }
}).then(() => console.log('♠️ Poker bot запущен'));
