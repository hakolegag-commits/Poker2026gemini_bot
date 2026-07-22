const { Telegraf, Markup } = require('telegraf');
const http = require('http');

const bot = new Telegraf('8939019076:AAHTYvEE9VfYfl82epZlhEquPij3WzttMa4');

// Простая колода для игры
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
                  ` flop (общие): ${flop1}  ${flop2}  ${flop3}\n\n` +
                  `Твой ход, выбирай действие:`;

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback('💵 Чек / Колл', 'action_call'),
        Markup.button.callback('📈 Рейз', 'action_raise')
      ],
      [
        Markup.button.callback('❌ Сбросить (Фолд)', 'action_fold')
      ]
    ])
  });
});

bot.action('action_call', async (ctx) => {
  await ctx.answerCbQuery('Вы приняли ставку!');
  const turn = getRandomCard();
  await ctx.editMessageText(`💵 Вы уравняли ставку.\n\nКарта Тёрн: ${turn}\n\nЧто делаем дальше?`, Markup.inlineKeyboard([
    [Markup.button.callback('🃏 Ривер и вскрытие', 'action_river')]
  ]));
});

bot.action('action_raise', async (ctx) => {
  await ctx.answerCbQuery('Вы повысили ставку!');
  await ctx.editMessageText(`📈 Вы сделали рейз! Соперник думает над ответом...`, Markup.inlineKeyboard([
    [Markup.button.callback('🔄 Сдавать заново', 'deal_cards')]
  ]));
});

bot.action('action_fold', async (ctx) => {
  await ctx.answerCbQuery('Вы сбросили карты.');
  await ctx.editMessageText(`❌ Вы сбросили карты в пас. Раздача окончена.`, Markup.inlineKeyboard([
    [Markup.button.callback('🃏 Новая раздача', 'deal_cards')]
  ]));
});

bot.action('action_river', async (ctx) => {
  await ctx.answerCbQuery('Вскрываемся!');
  const river = getRandomCard();
  await ctx.editMessageText(`rivers: Карта Ривер: ${river}\n\n🏆 Банька ваша! Вы выиграли раздачу! 🎉`, Markup.inlineKeyboard([
    [Markup.button.callback('🃏 Сыграть еще раз', 'deal_cards')]
  ]));
});

const PORT = process.env.PORT || 3000;
const server = http.createServer(bot.webhookCallback('/webhook'));

server.listen(PORT, async () => {
  console.log(`Server is listening on port ${PORT}`);
  const URL = process.env.RENDER_EXTERNAL_URL || `https://poker2026gemini-bot.onrender.com`;
  await bot.telegram.setWebhook(`${URL}/webhook`);
  console.log('Webhook is automatically set!');
});
