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

function getWlRatio(player) {
  if (Number(player.losses) === 0) {
    return Number(player.wins) > 0 ? Number(player.wins).toFixed(1) : '—';
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

async function importSeedDataIfNeeded() {
  try {
    await eloDb.ready;

    const storedPlayers = await eloDb.getAllPlayers();
    if (storedPlayers.length === 0) {
      try {
        const playersResponse = await fetch('data.json?t=' + Date.now(), { cache: 'no-store' });
        if (playersResponse.ok) {
          const playersData = await playersResponse.json();
          if (Array.isArray(playersData.players)) {
            const normalizedPlayers = playersData.players.map((player) => ({
              username: String(player.username || '').trim(),
              elo_rating: Number(player.elo_rating) || 1000,
              wins: Number(player.wins) || 0,
              losses: Number(player.losses) || 0,
              created_at: player.created_at || new Date().toISOString()
            }));

            await eloDb.importData({
              players: normalizedPlayers,
              matches: []
            });
          }
        }
      } catch (e) {
        console.warn('Could not load data.json:', e);
      }
    }

    const matchesBeforeSeed = await eloDb.getAllMatches();
    if (matchesBeforeSeed.length === 0) {
      try {
        const gamesResponse = await fetch('games.json?t=' + Date.now(), { cache: 'no-store' });
        if (gamesResponse.ok) {
          const gamesData = await gamesResponse.json();
          if (Array.isArray(gamesData.games)) {
            const existingPlayers = await eloDb.getAllPlayers();
            const seedMatches = gamesData.games.map((game) => {
              const white = String(game.white || '').trim();
              const black = String(game.black || '').trim();
              const winnerSide = String(game.winner || '').trim();
              const winner = winnerSide === 'White' ? white : black;
              const loser = winnerSide === 'White' ? black : white;

              return {
                winner,
                loser,
                white,
                black,
                winner_side: winnerSide,
                name: game.name || 'Unnamed Game',
                link: game.link || '#',
                created_at: new Date().toISOString()
              };
            });

            await eloDb.importData({
              players: existingPlayers,
              matches: seedMatches
            });
          }
        }
      } catch (e) {
        console.warn('Could not load games.json:', e);
      }
    }
  } catch (error) {
    console.warn('Seed import failed:', error);
  }
}

async function loadLeaderboard() {
  const tbody = document.getElementById('leaderboardBody');

  try {
    await eloDb.ready;
    await importSeedDataIfNeeded();
    const players = await eloDb.getAllPlayers();
    allPlayers = players;

    const searchValue = document.getElementById('searchInput')?.value.trim().toLowerCase() || '';
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
    await eloDb.ready;
    await importSeedDataIfNeeded();
    const matches = await eloDb.getAllMatches();

    allGames = matches.map((match) => ({
      white: match.white || match.winner || 'Unknown',
      black: match.black || match.loser || 'Unknown',
      winner: match.winner_side || (match.white === match.winner ? 'White' : 'Black') || 'White',
      name: match.name || 'Unnamed Game',
      link: match.link || '#'
    }));

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
    await eloDb.ready;
    const players = await eloDb.getAllPlayers();
    const data = { players };
    downloadJSON(data, 'data.json');
  } catch (error) {
    console.error('Export players failed:', error);
    alert('Failed to export players: ' + error.message);
  }
}

async function handleExportGames() {
  try {
    await eloDb.ready;
    const matches = await eloDb.getAllMatches();
    
    const games = matches.map((match) => ({
      white: match.white || 'Unknown',
      black: match.black || 'Unknown',
      winner: match.winner_side || 'White',
      name: match.name || 'Unnamed Game',
      link: match.link || '#'
    }));
    
    const data = { games };
    downloadJSON(data, 'games.json');
  } catch (error) {
    console.error('Export games failed:', error);
    alert('Failed to export games: ' + error.message);
  }
}

async function handleAddPlayer(event) {
  event.preventDefault();

  const username = document.getElementById('playerUsername').value.trim();
  const elo = Number(document.getElementById('playerELO').value) || 1500;

  try {
    await eloDb.ready;
    const player = await eloDb.addPlayer(username, elo);
    allPlayers.push(player);
    allPlayers.sort((a, b) => Number(b.elo_rating) - Number(a.elo_rating));
    renderLeaderboard(allPlayers);
    showMessage('addPlayerMessage', `Player "${player.username}" added successfully!`, true);
    document.getElementById('addPlayerForm').reset();
    document.getElementById('playerELO').value = '1500';
  } catch (error) {
    showMessage('addPlayerMessage', error.message, false);
  }
}

async function handleAddGame(event) {
  event.preventDefault();

  const white = document.getElementById('gameWhite').value.trim();
  const black = document.getElementById('gameBlack').value.trim();
  const winner = document.getElementById('gameWinner').value;
  const name = document.getElementById('gameName').value.trim();
  const link = document.getElementById('gameLink').value.trim();

  try {
    if (!white || !black || !winner) {
      throw new Error('Please fill in all required fields');
    }

    if (white === black) {
      throw new Error('White and black cannot be the same player');
    }

    if (winner !== 'White' && winner !== 'Black') {
      throw new Error('Winner must be White or Black');
    }

    const winnerName = winner === 'White' ? white : black;
    const loserName = winner === 'White' ? black : white;

    await eloDb.ready;
    const result = await eloDb.recordMatch(winnerName, loserName, {
      white,
      black,
      winnerSide: winner,
      name: name || 'Unnamed Game',
      link: link || '#'
    });

    allGames.unshift({
      white,
      black,
      winner,
      name: name || 'Unnamed Game',
      link: link || '#'
    });

    renderGames(allGames);
    await loadLeaderboard();
    showMessage('addGameMessage', `${winnerName} beat ${loserName}. ELO updated successfully!`, true);
    document.getElementById('addGameForm').reset();
  } catch (error) {
    showMessage('addGameMessage', error.message, false);
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  bindTabs();
  await importSeedDataIfNeeded();
  await loadLeaderboard();
  await loadGames();

  const addPlayerForm = document.getElementById('addPlayerForm');
  const addGameForm = document.getElementById('addGameForm');
  const exportPlayersBtn = document.getElementById('exportPlayersBtn');
  const exportGamesBtn = document.getElementById('exportGamesBtn');

  console.log('Export buttons found:', { exportPlayersBtn, exportGamesBtn });

  if (addPlayerForm) {
    addPlayerForm.addEventListener('submit', handleAddPlayer);
  }

  if (addGameForm) {
    addGameForm.addEventListener('submit', handleAddGame);
  }

  if (exportPlayersBtn) {
    console.log('Attaching click handler to export players button');
    exportPlayersBtn.addEventListener('click', handleExportPlayers);
  } else {
    console.warn('Export players button not found');
  }

  if (exportGamesBtn) {
    console.log('Attaching click handler to export games button');
    exportGamesBtn.addEventListener('click', handleExportGames);
  } else {
    console.warn('Export games button not found');
  }
});
