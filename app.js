let allPlayers = [];

function showMessage(element, message, type) {
  element.textContent = message;
  element.className = `message ${type}`;
  clearTimeout(element._timer);
  element._timer = setTimeout(() => {
    element.className = 'message';
  }, 4000);
}

async function addPlayer() {
  const usernameInput = document.getElementById('usernameInput');
  const username = usernameInput.value.trim();
  const messageEl = document.getElementById('addPlayerMessage');

  if (!username) {
    showMessage(messageEl, 'Please enter a username.', 'error');
    return;
  }

  try {
    const player = await eloDb.addPlayer(username);
    showMessage(messageEl, `Added ${player.username} with 1000 ELO.`, 'success');
    usernameInput.value = '';
    await loadLeaderboard();
    await updateStats();
  } catch (error) {
    showMessage(messageEl, error.message, 'error');
  }
}

async function recordMatch() {
  const winnerInput = document.getElementById('winnerInput');
  const loserInput = document.getElementById('loserInput');
  const winner = winnerInput.value.trim();
  const loser = loserInput.value.trim();
  const messageEl = document.getElementById('matchMessage');

  if (!winner || !loser) {
    showMessage(messageEl, 'Both winner and loser usernames are required.', 'error');
    return;
  }

  try {
    const result = await eloDb.recordMatch(winner, loser);
    const winnerDelta = result.winner.newElo - result.winner.oldElo;
    const loserDelta = result.loser.newElo - result.loser.oldElo;

    showMessage(
      messageEl,
      `${result.winner.username}: ${winnerDelta >= 0 ? '+' : ''}${winnerDelta} ELO (${result.winner.oldElo} → ${result.winner.newElo}) | ${result.loser.username}: ${loserDelta >= 0 ? '+' : ''}${loserDelta} ELO (${result.loser.oldElo} → ${result.loser.newElo})`,
      'success'
    );

    winnerInput.value = '';
    loserInput.value = '';
    await loadLeaderboard();
    await updateStats();
  } catch (error) {
    showMessage(messageEl, error.message, 'error');
  }
}

function getWlRatio(player) {
  if (player.losses === 0) {
    return player.wins > 0 ? player.wins.toFixed(1) : '—';
  }
  return (player.wins / player.losses).toFixed(2);
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
  allPlayers = await eloDb.getAllPlayers();
  const searchValue = document.getElementById('searchInput').value.trim().toLowerCase();
  const filtered = searchValue
    ? allPlayers.filter((player) => player.username.toLowerCase().includes(searchValue))
    : allPlayers;
  renderLeaderboard(filtered);
}

function filterLeaderboard() {
  const searchValue = document.getElementById('searchInput').value.trim().toLowerCase();
  const filtered = searchValue
    ? allPlayers.filter((player) => player.username.toLowerCase().includes(searchValue))
    : allPlayers;
  renderLeaderboard(filtered);
}

async function updateStats() {
  const players = await eloDb.getAllPlayers();
  const matches = await eloDb.getTotalMatches();
  document.getElementById('totalPlayers').textContent = players.length;
  document.getElementById('totalMatches').textContent = matches;
}

async function exportData() {
  try {
    const data = await eloDb.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bg-rating-data.json';
    a.click();
    URL.revokeObjectURL(url);
    showMessage(document.getElementById('addPlayerMessage'), 'Data exported successfully.', 'success');
  } catch (error) {
    showMessage(document.getElementById('addPlayerMessage'), error.message, 'error');
  }
}

async function importData() {
  const fileInput = document.getElementById('importFile');
  fileInput.click();
}

document.getElementById('importFile').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);
    await eloDb.importData(data);
    await loadLeaderboard();
    await updateStats();
    showMessage(document.getElementById('addPlayerMessage'), 'Data imported successfully.', 'success');
  } catch (error) {
    showMessage(document.getElementById('addPlayerMessage'), 'Import failed: ' + error.message, 'error');
  } finally {
    event.target.value = '';
  }
});

async function clearAllData() {
  const shouldClear = confirm('This will delete all players and match history. Continue?');
  if (!shouldClear) return;

  try {
    await eloDb.clearAllData();
    await loadLeaderboard();
    await updateStats();
    showMessage(document.getElementById('addPlayerMessage'), 'All data cleared.', 'success');
  } catch (error) {
    showMessage(document.getElementById('addPlayerMessage'), error.message, 'error');
  }
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    const active = document.activeElement.id;
    if (active === 'usernameInput') addPlayer();
    if (active === 'winnerInput' || active === 'loserInput') recordMatch();
  }
});

window.addEventListener('DOMContentLoaded', async () => {
  await eloDb.ready;
  await loadLeaderboard();
  await updateStats();
});
