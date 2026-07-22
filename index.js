const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf('8939019076:AAHTYvEE9VFYfl82epZlhEquPij3WzttMa4');

const suits = ['♠', '♥', '♦', '♣'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function getRandomCard() {
  const suit = suits[Math.floor(Math.random() * suits.length)];
  const value = values[Math.floor(Math.random() * values.length)];
  return `${value}${suit}`;
}

bot.start((ctx) => {
  ctx.reply(
    '🎲 Добро пожаловать за столы Техасского Холдема!\nНажми кнопку ниже, чтобы начать новую раздачу.',
    Markup.inlineKeyboard([
      [Markup.button.callback('🃏 Раздать карты', 'deal_cards')]
    ])
  );
});

bot.action('deal_cards', async (ctx) => {
  const p1Card1 = getRandomCard();
  const p1Card2 = getRandomCard();
  const flop1 = getRandomCard();
  const flop2 = getRandomCard();
  const flop3 = getRandomCard();

  const message = `🃏 **Твои карты:** ${p1Card1}  ${p1Card2}\n\n` +
                  `Общие карты (Флоп): ${flop1}  ${flop2}  ${flop3}\n\n` +
                  `Выбирай действие:`;

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback('💵 Колл', 'action_call'),
        Markup.button.callback('📈 Рейз', 'action_raise')
      ],
      [
        Markup.button.callback('❌ Фолд', 'action_fold')
      ]
    ])
  });
});

bot.action('action_call', async (ctx) => {
  await ctx.answerCbQuery('Ставка принята!');
  const turn = getRandomCard();
  await ctx.editMessageText(`💵 Вы уравняли.\n\nКарта Тёрн: ${turn}`, Markup.inlineKeyboard([
    [Markup.button.callback('🃏 Ривер и вскрытие', 'action_river')]
  ]));
});

bot.action('action_raise', async (ctx) => {
  await ctx.answerCbQuery('Рейз сделан!');
  await ctx.editMessageText(`📈 Вы повысили ставку!`, Markup.inlineKeyboard([
    [Markup.button.callback('🔄 Новая раздача', 'deal_cards')]
  ]));
});

bot.action('action_fold', async (ctx) => {
  await ctx.answerCbQuery('Пас.');
  await ctx.editMessageText(`❌ Вы сбросили карты.`, Markup.inlineKeyboard([
    [Markup.button.callback('🃏 Новая раздача', 'deal_cards')]
  ]));
});

bot.action('action_river', async (ctx) => {
  await ctx.answerCbQuery('Вскрываемся!');
  const river = getRandomCard();
  await ctx.editMessageText(`Карта Ривер: ${river}\n\n🏆 Банк ваш! Вы выиграли раздачу! 🎉`, Markup.inlineKeyboard([
    [Markup.button.callback('🃏 Сыграть еще раз', 'deal_cards')]
  ]));
});

// Запуск бота через вебхуки для Render
const PORT = process.env.PORT || 3000;
bot.launch({
  webhook: {
    domain: 'poker2026gemini-bot.onrender.com',
    port: PORT
  }
});

console.log('Bot is running!');
