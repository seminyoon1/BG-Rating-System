let allPlayers = [];

function calculateRank(elo) {
  const eloNum = Number(elo) || 0;

  if (eloNum < 3000) {
    const kyuIndex = Math.floor(eloNum / 100);
    if (kyuIndex >= 30) return '30 Kyu';
    if (kyuIndex <= 0) return '30 Kyu';
    return `${30 - kyuIndex} Kyu`;
  }

  const danIndex = Math.floor((eloNum - 3000) / 100) + 1;
  if (danIndex >= 9) return '9 Dan';
  return `${danIndex} Dan`;
}

function calculateELO(winnerElo, loserElo, kFactor = 32) {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));
  
  // Normal ELO calculation
  const normalWinnerGain = kFactor * (1 - expectedWinner);
  const normalLoserLoss = kFactor * (0 - expectedLoser);
  
  // Divide by 2 and add 0.005 bonus
  const winnerChange = (normalWinnerGain / 2) + 0.005;
  const loserChange = (normalLoserLoss / 2) + 0.005;
  
  const newWinnerElo = Math.round((Number(winnerElo) + winnerChange) * 1000) / 1000;
  const newLoserElo = Math.round((Number(loserElo) + loserChange) * 1000) / 1000;
  
  return { newWinnerElo, newLoserElo };
}

function getWlRatio(player) {
  if (player.losses === 0) {
    return player.wins > 0 ? Number(player.wins).toFixed(1) : '—';
  }
  return (Number(player.wins) / Number(player.losses)).toFixed(2);
}

function renderLeaderboard(players) {
  const tbody = document.getElementById('leaderboardBody');

  if (!players.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-row">No players yet.</td></tr>';
    return;
  }

  tbody.innerHTML = players.map((player) => {
    const rankLabel = calculateRank(player.elo_rating);

    return `
      <tr>
        <td>${rankLabel}</td>
        <td>${player.username}</td>
        <td><strong>${player.elo_rating}</strong></td>
        <td>${player.wins || 0}</td>
        <td>${player.losses || 0}</td>
        <td>${getWlRatio(player)}</td>
      </tr>
    `;
  }).join('');
}

async function loadLeaderboard() {
  const tbody = document.getElementById('leaderboardBody');

  try {
    const response = await fetch('data.json?t=' + Date.now(), { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load data.json');

    const data = await response.json();
    const players = Array.isArray(data.players) ? data.players : [];

    allPlayers = players
      .slice()
      .sort((a, b) => Number(b.elo_rating) - Number(a.elo_rating) || String(a.username).localeCompare(String(b.username)));

    const searchValue = document.getElementById('searchInput').value.trim().toLowerCase();
    const filtered = searchValue
      ? allPlayers.filter((player) => String(player.username).toLowerCase().includes(searchValue))
      : allPlayers;

    renderLeaderboard(filtered);
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row">Unable to load leaderboard: ${error.message}</td></tr>`;
  }
}

function filterLeaderboard() {
  const searchValue = document.getElementById('searchInput').value.trim().toLowerCase();
  const filtered = searchValue
    ? allPlayers.filter((player) => String(player.username).toLowerCase().includes(searchValue))
    : allPlayers;
  renderLeaderboard(filtered);
}

window.addEventListener('DOMContentLoaded', () => {
  loadLeaderboard();
});
