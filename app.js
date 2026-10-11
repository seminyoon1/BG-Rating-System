function getWlRatio(player) {
  const wins = Number(player.wins) || 0;
  const losses = Number(player.losses) || 0;

  if (wins === 0 && losses === 0) {
    return '—';
  }

  if (losses === 0) {
    return '∞';
  }

  return (wins / losses).toFixed(2);
}
