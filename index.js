bot.action('start_game', async (ctx) => {
  const chatId = ctx.chat.id;
  const game = games[chatId];

  if (!game || game.players.length === 0) {
    await ctx.answerCbQuery('Недостаточно игроков для начала!');
    return;
  }

  game.status = 'playing';

  // Функция для генерации случайной карты
  const suits = ['♠', '♥', '♦', '♣'];
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const getRandomCard = () => `${values[Math.floor(Math.random() * values.length)]}${suits[Math.floor(Math.random() * suits.length)]}`;

  // Общие карты флопа
  const flop = [getRandomCard(), getRandomCard(), getRandomCard()];

  // Раздаем карты каждому игроку
  for (const player of game.players) {
    player.cards = [getRandomCard(), getRandomCard()];
    
    // Пытаемся отправить игроку личные карты в личные сообщения или пишем в чат
    try {
      await bot.telegram.sendMessage(
        player.id,
        `🃏 Ваши карты для текущей раздачи: ${player.cards[0]}  ${player.cards[1]}`
      );
    } catch (e) {
      // Если бот не может написать в личку, выводим в общий чат (для теста)
      await ctx.reply(`Игрок ${player.name получает карты в закрытую 🤫}`);
    }
  }

  await ctx.answerCbQuery('Игра началась, карты разданы!');
  await ctx.editMessageText(
    `🎲 **Раздача началась!**\n\n` +
    `Общий стол (Флоп): ${flop.join('  ')}\n\n` +
    `Игроки сделали ставки. Ожидаем ходов!`,
    { parse_mode: 'Markdown' }
  );
});
