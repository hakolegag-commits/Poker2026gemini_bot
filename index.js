const { Telegraf, Markup } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN || '8939019076:AAHTYvEE9VFYfl82epZlhEquPij3WzttMa4';

const bot = new Telegraf(BOT_TOKEN);

// Хранилище игр и активных пользователей
const games = new Map();
const onlineUsers = new Map();

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ value, suit, code: value + suit });
    }
  }
  return shuffle(deck);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createGame(hostId, hostName) {
  const gameId = Math.random().toString(36).substring(2, 8);
  const game = {
    id: gameId,
    players: [],
    hostId,
    status: 'waiting', 
    deck: [],
    communityCards: [],
    pot: 0,
    currentPlayerIndex: 0,
    dealerIndex: 0,
    bigBlind: 20,
    currentBet: 0,
    round: 'preflop'
  };
  games.set(gameId, game);
  return game;
}

bot.start(async (ctx) => {
  const userId = ctx.from.id;
  onlineUsers.set(userId, Date.now());

  const payload = ctx.startPayload;
  if (payload && payload.startsWith('game_')) {
    const gameId = payload.slice(5);
    const game = games.get(gameId);
    if (!game) return ctx.reply('Стол не найден.');
    if (game.status !== 'waiting') return ctx.reply('Игра уже началась.');
    
    if (game.players.some(p => p.id === userId)) {
      return ctx.reply('Вы уже за столом.');
    }
    
    game.players.push({ 
      id: userId, 
      name: ctx.from.first_name || 'Игрок', 
      chips: 1000, 
      cards: [], 
      folded: false 
    });
    
    ctx.reply(`✅ Вы успешно присоединились к столу *${gameId}*! Ожидайте начала игры.`, { parse_mode: 'Markdown' });
    
    // Оповещаем хоста о новом игроке
    try {
      await bot.telegram.sendMessage(game.hostId, `👤 К столу ${gameId} присоединился игрок: ${ctx.from.first_name || 'Игрок'}`);
    } catch (e) {}
    
    return;
  }

  ctx.reply(
    '♠️ **Добро пожаловать в покерный клуб!**\n\n' +
    '🎮 Создайте свой стол или присоединитесь по приглашению.',
    Markup.inlineKeyboard([
      [Markup.button.callback('🎲 Создать стол', 'create_game')]
    ])
  );
});

bot.action('create_game', async (ctx) => {
  const userId = ctx.from.id;
  const userName = ctx.from.first_name || 'Игрок';
  const game = createGame(userId, userName);
  
  game.players.push({ id: userId, name: userName, chips: 1000, cards: [], folded: false });
  
  const inviteLink = `https://t.me/${ctx.botInfo.username}?start=game_${game.id}`;
  
  await ctx.answerCbQuery('Стол создан!');
  await ctx.reply(
    `🏆 **Стол создан!** (ID: \`${game.id}\`)\n\n` +
    `🔗 **Ссылка для приглашения игроков:**\n${inviteLink}\n\n` +
    `Когда все участники перейдут по ссылке, нажмите кнопку ниже.`,
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
  if (game.players.length < 1) return ctx.answerCbQuery('Недостаточно игроков');
  if (ctx.from.id !== game.hostId) return ctx.answerCbQuery('Только создатель может начать игру');

  game.status = 'active';
  game.deck = createDeck();
  game.communityCards = [game.deck.pop(), game.deck.pop(), game.deck.pop()];
  game.pot = game.players.length * 20;

  for (const player of game.players) {
    player.cards = [game.deck.pop(), game.deck.pop()];
    player.folded = false;
    
    try {
      await bot.telegram.sendMessage(
        player.id,
        `🎲 **Раздача началась!**\n\n` +
        `🃏 Ваши карты: ${player.cards[0].code}  ${player.cards[1].code}\n` +
        `📍 Флоп: ${game.communityCards.map(c => c.code).join(' ')}\n` +
        `🏦 Банк стола: ${game.pot} фишек`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback('💵 Колл', `action_call_${game.id}`),
            Markup.button.callback('📈 Рейз', `action_raise_${game.id}`)
          ],
          [
            Markup.button.callback('❌ Фолд', `action_fold_${game.id}`)
          ]
        ])
      );
    } catch (e) {}
  }

  await ctx.answerCbQuery('Игра запущена!');
  await ctx.editMessageText(`🎲 **Стол ${game.id}**: игра началась, карты и управление отправлены участникам в личные сообщения.`);
});

bot.action(/delete_game_(.+)/, async (ctx) => {
  const gameId = ctx.match[1];
  const game = games.get(gameId);
  if (!game) return ctx.answerCbQuery('Стол не найден');
  if (ctx.from.id !== game.hostId) return ctx.answerCbQuery('Вы не создатель этого стола');

  games.delete(gameId);
  await ctx.answerCbQuery('Стол удален');
  await ctx.editMessageText('❌ Стол был удален.');
});

bot.action(/action_(.+)_(.+)/, async (ctx) => {
  const action = ctx.match[1]; // call, raise, fold
  const gameId = ctx.match[2];
  const game = games.get(gameId);

  if (!game || game.status !== 'active') {
    return ctx.answerCbQuery('Игра не активна или завершена.');
  }

  const userId = ctx.from.id;
  const player = game.players.find(p => p.id === userId);

  if (!player || player.folded) {
    return ctx.answerCbQuery('Вы не участвуете в этой раздаче.');
  }

  if (action === 'fold') {
    player.folded = true;
    await ctx.answerCbQuery('Вы сбросили карты');
    await ctx.editMessageText('❌ Вы сбросили карты (Фолд) и выбыли из текущей раздачи.');
  } else if (action === 'call') {
    await ctx.answerCbQuery('Ставка принята (Колл)');
    await ctx.editMessageText('✅ Вы уравняли ставку. Ожидаем остальных игроков.');
  } else if (action === 'raise') {
    await ctx.answerCbQuery('Ставка повышена (Рейз)');
    await ctx.editMessageText('📈 Вы сделали рейз. Торги продолжаются.');
  }
});

const PORT = process.env.PORT || 3000;
bot.launch({
  webhook: {
    domain: 'poker2026gemini-bot.onrender.com',
    port: PORT
  }
}).then(() => {
  console.log('Poker bot successfully started via Webhook!');
});
