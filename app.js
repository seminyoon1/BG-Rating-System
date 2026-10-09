let allPlayers = [];

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

  tbody.innerHTML = players.map((player, index) => {
    const rank = index + 1;
    let rankClass = '';
    if (rank === 1) rankClass = 'rank-1';
    if (rank === 2) rankClass = 'rank-2';
    if (rank === 3) rankClass = 'rank-3';

    return `
      <tr>
        <td class="${rankClass}">${rank}</td>
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
    if (!response.ok) {
      throw new Error('Could not load data.json');
    }

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
