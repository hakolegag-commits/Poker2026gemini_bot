// --- ИСПРАВЛЕННЫЙ БЛОК УПРАВЛЕНИЯ ТОРГАМИ ---

function nextTurn(game) {
  // Проверяем, сделали ли все активные игроки равные ставки
  const activePlayers = game.players.filter(p => !p.folded);
  const maxBet = Math.max(...activePlayers.map(p => p.currentBet || 0));
  
  // Если все не сбросившие игроки уравняли максимальную ставку или пошли ва-банк
  const allMatched = activePlayers.every(p => (p.currentBet || 0) === maxBet || p.chips === 0);

  if (allMatched) {
    advanceGame(game);
  } else {
    game.currentPlayerIndex = nextActivePlayer(game, game.currentPlayerIndex);
    notifyCurrentPlayer(game);
  }
}

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
      const actualCall = Math.min(player.chips, amountToCall);
      player.chips -= actualCall;
      game.pot += actualCall;
      player.currentBet = (player.currentBet || 0) + actualCall;
      await ctx.editMessageText('✅ Вы уравняли ставку.');
      break;
    }
    case 'raise': {
      const raiseAmount = game.bigBlind;
      const totalCost = (game.currentBet - (player.currentBet || 0)) + raiseAmount;
      if (player.chips < totalCost) return ctx.answerCbQuery('Недостаточно фишек для рейза');
      
      player.chips -= totalCost;
      game.pot += totalCost;
      game.currentBet += raiseAmount;
      player.currentBet = game.currentBet;
      await ctx.editMessageText('📈 Вы повысили ставку.');
      break;
    }
  }

  await ctx.answerCbQuery();

  // Проверка: если остался всего 1 игрок (остальные фолднули) — сразу победа
  const active = game.players.filter(p => !p.folded);
  if (active.length === 1) {
    active[0].chips += game.pot;
    const winMsg = `🏆 Все противники сбросили карты! Победитель: ${active[0].name} (+${game.pot} фишек)`;
    game.players.forEach(p => bot.telegram.sendMessage(p.id, winMsg).catch(() => {}));
    games.delete(game.id);
    return;
  }

  nextTurn(game);
});
