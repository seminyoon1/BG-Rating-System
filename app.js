let allPlayers = [];
let allGames = [];

const SHEET_URL = 'https://script.google.com/macros/s/AKfycbzpKOs_xiA3HpyxspXFb2fhYAEfh2tKuoSZ28pRqmBy_qxdcwK1QgX4yF2xld2054iQ/exec';

function truncateToHundredth(value) {
  const num = Number(value) || 0;
  return Math.floor(num * 100) / 100;
}

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

function getWlRatio(player) {
  if (Number(player.losses) === 0) {
    if (Number(player.wins) === 0) {
      return '-';
    return 1;
  }
  return (Number(player.wins) / (Number(player.wins) + Number(player.losses))).toFixed(2);
}

function renderLeaderboard(players) {
  const tbody = document.getElementById('leaderboardBody');

  if (!players.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-row">No players yet.</td></tr>';
    return;
  }

  tbody.innerHTML = players.map((player) => {
    const rankLabel = calculateRank(player.elo_rating);
    const truncatedElo = truncateToHundredth(player.elo_rating);

    return `
      <tr>
        <td>${rankLabel}</td>
        <td>${player.username}</td>
        <td><strong>${truncatedElo}</strong></td>
        <td>${player.wins || 0}</td>
        <td>${player.losses || 0}</td>
        <td>${getWlRatio(player)}</td>
      </tr>
    `;
  }).join('');
}

function renderGames(games) {
  const tbody = document.getElementById('gamesBody');

  if (!games.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-row">No games yet.</td></tr>';
    return;
  }

  tbody.innerHTML = games.map((game) => {
    const safeLink = game.link || '#';
    const whiteClass = game.winner === 'White' ? 'class="winner-highlight"' : '';
    const blackClass = game.winner === 'Black' ? 'class="winner-highlight"' : '';
    const handicap = Number(game.handicap) || 0;

    return `
      <tr>
        <td><span ${whiteClass}>${game.white || 'Unknown'}</span></td>
        <td><span ${blackClass}>${game.black || 'Unknown'}</span></td>
        <td>${handicap}</td>
        <td>${game.name || 'Unnamed Game'}</td>
        <td><a href="${safeLink}" target="_blank" rel="noopener noreferrer">View Game</a></td>
      </tr>
    `;
  }).join('');
}

async function fetchAndCache(type, key) {
  const res = await fetch(`${SHEET_URL}?type=${type}`);
  const data = await res.json();
  const list = data[type] || [];
  localStorage.setItem(key, JSON.stringify(list));
  return list;
}

async function loadPlayersFromSheet() {
  try {
    return await fetchAndCache('players', 'players_cache');
  } catch (error) {
    console.error('Failed to load players from sheet:', error);
    const cached = localStorage.getItem('players_cache');
    return cached ? JSON.parse(cached) : [];
  }
}

async function loadGamesFromSheet() {
  try {
    return await fetchAndCache('games', 'games_cache');
  } catch (error) {
    console.error('Failed to load games from sheet:', error);
    const cached = localStorage.getItem('games_cache');
    return cached ? JSON.parse(cached) : [];
  }
}

async function loadLeaderboard() {
  const tbody = document.getElementById('leaderboardBody');

  const apply = (players) => {
    allPlayers = players.slice().sort((a, b) => Number(b.elo_rating) - Number(a.elo_rating));
    const searchValue = document.getElementById('searchInput')?.value.trim().toLowerCase() || '';
    const filtered = searchValue
      ? allPlayers.filter((player) => String(player.username).toLowerCase().includes(searchValue))
      : allPlayers;
    renderLeaderboard(filtered);
  };

  const cached = localStorage.getItem('players_cache');
  if (cached) apply(JSON.parse(cached));

  try {
    apply(await loadPlayersFromSheet());
  } catch (error) {
    if (!cached) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-row">Unable to load leaderboard: ${error.message}</td></tr>`;
    }
  }
}

async function loadGames() {
  const tbody = document.getElementById('gamesBody');

  const cached = localStorage.getItem('games_cache');
  if (cached) {
    allGames = JSON.parse(cached).reverse();
    renderGames(allGames);
  }

  try {
    const games = await loadGamesFromSheet();
    allGames = games.slice().reverse();
    renderGames(allGames);
  } catch (error) {
    if (!cached) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-row">Unable to load games: ${error.message}</td></tr>`;
    }
  }
}

function filterLeaderboard() {
  const searchValue = document.getElementById('searchInput').value.trim().toLowerCase();
  const filtered = searchValue
    ? allPlayers.filter((player) => String(player.username).toLowerCase().includes(searchValue))
    : allPlayers;
  renderLeaderboard(filtered);
}

function setActiveTab(tabName) {
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  panels.forEach((panel) => {
    panel.classList.toggle('active', panel.id === `${tabName}View`);
  });
}

function bindTabs() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));
  });
}

function showMessage(elementId, message, isSuccess) {
  const messageEl = document.getElementById(elementId);
  if (!messageEl) return;

  messageEl.textContent = message;
  messageEl.className = `message ${isSuccess ? 'success' : 'error'}`;
  setTimeout(() => {
    messageEl.className = 'message';
  }, 3000);
}

function downloadJSON(data, filename) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function handleExportPlayers() {
  try {
    const players = await loadPlayersFromSheet();
    const data = { players };
    downloadJSON(data, 'data.json');
  } catch (error) {
    console.error('Export players failed:', error);
    alert('Failed to export players: ' + error.message);
  }
}

async function handleExportGames() {
  try {
    const games = await loadGamesFromSheet();
    const data = { games: games.slice().reverse() };
    downloadJSON(data, 'games.json');
  } catch (error) {
    console.error('Export games failed:', error);
    alert('Failed to export games: ' + error.message);
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  bindTabs();
  await loadLeaderboard();
  await loadGames();

  const exportPlayersBtn = document.getElementById('exportPlayersBtn');
  const exportGamesBtn = document.getElementById('exportGamesBtn');

  if (exportPlayersBtn) {
    exportPlayersBtn.addEventListener('click', handleExportPlayers);
  }

  if (exportGamesBtn) {
    exportGamesBtn.addEventListener('click', handleExportGames);
  }

  // Hide the "Add Test Player" and "Add Test Game" tabs since data is now Google Sheet driven
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach((tab) => {
    if (tab.dataset.tab === 'addPlayer' || tab.dataset.tab === 'addGame') {
      tab.style.display = 'none';
    }
  });
});
