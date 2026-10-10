let allPlayers = [];
let allGames = [];

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

function calculateELO(winnerElo, loserElo, kFactor = 32) {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 190));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 190));

  const normalWinnerGain = kFactor * (1 - expectedWinner);
  const normalLoserLoss = kFactor * (0 - expectedLoser);

  const winnerChange = normalWinnerGain + 0.005;
  const loserChange = normalLoserLoss + 0.005;

  const newWinnerElo = truncateToHundredth(Number(winnerElo) + winnerChange);
  const newLoserElo = truncateToHundredth(Number(loserElo) + loserChange);

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
    tbody.innerHTML = '<tr><td colspan="4" class="empty-row">No games yet.</td></tr>';
    return;
  }

  tbody.innerHTML = games.map((game) => {
    const safeLink = game.link || '#';
    const whiteClass = game.winner === 'White' ? 'class="winner-highlight"' : '';
    const blackClass = game.winner === 'Black' ? 'class="winner-highlight"' : '';

    return `
      <tr>
        <td><span ${whiteClass}>${game.white || 'Unknown'}</span></td>
        <td><span ${blackClass}>${game.black || 'Unknown'}</span></td>
        <td>${game.name || 'Unnamed Game'}</td>
        <td><a href="${safeLink}" target="_blank" rel="noopener noreferrer">View Game</a></td>
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

async function loadGames() {
  const tbody = document.getElementById('gamesBody');

  try {
    const response = await fetch('games.json?t=' + Date.now(), { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load games.json');

    const data = await response.json();
    allGames = Array.isArray(data.games) ? data.games : [];
    renderGames(allGames);
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-row">Unable to load games: ${error.message}</td></tr>`;
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
  messageEl.textContent = message;
  messageEl.className = `message ${isSuccess ? 'success' : 'error'}`;
  setTimeout(() => {
    messageEl.className = 'message';
  }, 3000);
}

function handleAddPlayer(e) {
  e.preventDefault();
  
  const username = document.getElementById('playerUsername').value.trim();
  const elo = Number(document.getElementById('playerELO').value);
  const wins = Number(document.getElementById('playerWins').value);
  const losses = Number(document.getElementById('playerLosses').value);

  if (!username) {
    showMessage('addPlayerMessage', 'Please enter a username', false);
    return;
  }

  const newPlayer = {
    username,
    elo_rating: elo,
    wins,
    losses
  };

  // Add to local array (in a real app, this would POST to a backend)
  allPlayers.push(newPlayer);
  allPlayers.sort((a, b) => Number(b.elo_rating) - Number(a.elo_rating));
  renderLeaderboard(allPlayers);

  showMessage('addPlayerMessage', `Player "${username}" added successfully!`, true);
  document.getElementById('addPlayerForm').reset();
  document.getElementById('playerELO').value = '1500';
  document.getElementById('playerWins').value = '0';
  document.getElementById('playerLosses').value = '0';
}

function handleAddGame(e) {
  e.preventDefault();
  
  const white = document.getElementById('gameWhite').value.trim();
  const black = document.getElementById('gameBlack').value.trim();
  const winner = document.getElementById('gameWinner').value;
  const name = document.getElementById('gameName').value.trim();
  const link = document.getElementById('gameLink').value.trim();

  if (!white || !black || !winner) {
    showMessage('addGameMessage', 'Please fill in all required fields', false);
    return;
  }

  const newGame = {
    white,
    black,
    winner,
    name: name || 'Unnamed Game',
    link: link || 'https://example.com'
  };

  // Add to local array (in a real app, this would POST to a backend)
  allGames.push(newGame);
  renderGames(allGames);

  showMessage('addGameMessage', 'Game added successfully!', true);
  document.getElementById('addGameForm').reset();
}

window.addEventListener('DOMContentLoaded', () => {
  bindTabs();
  loadLeaderboard();
  loadGames();
  
  document.getElementById('addPlayerForm').addEventListener('submit', handleAddPlayer);
  document.getElementById('addGameForm').addEventListener('submit', handleAddGame);
});
