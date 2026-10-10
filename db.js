class ELODatabase {
  constructor() {
    this.dbName = 'bg-rating-system';
    this.dbVersion = 1;
    this.db = null;
    this.ready = this.initDB();
  }

  initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('players')) {
          const players = db.createObjectStore('players', { keyPath: 'username' });
          players.createIndex('elo_rating', 'elo_rating');
        }

        if (!db.objectStoreNames.contains('matches')) {
          db.createObjectStore('matches', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  applyDanAdjustment(oldElo, newElo) {
    const safeOldElo = Number(oldElo) || 0;
    const safeNewElo = Number(newElo) || 0;
    const eloChange = safeNewElo - safeOldElo;

    if (safeOldElo >= 3100) {
      const adjustedChange = eloChange > 0
        ? Math.max(0, eloChange - 0.005)
        : eloChange - 0.005;

      return Math.max(0, Number((safeOldElo + adjustedChange).toFixed(3)));
    }

    return Math.max(0, safeNewElo);
  }

  async addPlayer(username, initialElo = 1000) {
    const clean = String(username || '').trim();
    if (!clean) throw new Error('Username is required');
    if (clean.length > 40) throw new Error('Username must be 40 characters or fewer');

    const existing = await this.getPlayer(clean);
    if (existing) throw new Error('Username already exists');

    const player = {
      username: clean,
      elo_rating: Math.max(0, Number(initialElo) || 1000),
      wins: 0,
      losses: 0,
      created_at: new Date().toISOString()
    };

    await new Promise((resolve, reject) => {
      const tx = this.db.transaction('players', 'readwrite');
      const store = tx.objectStore('players');
      const request = store.add(player);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    return player;
  }

  async getPlayer(username) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('players', 'readonly');
      const store = tx.objectStore('players');
      const request = store.get(username);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllPlayers() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('players', 'readonly');
      const store = tx.objectStore('players');
      const request = store.getAll();

      request.onsuccess = () => {
        const players = request.result || [];
        players.sort((a, b) => b.elo_rating - a.elo_rating || a.username.localeCompare(b.username));
        resolve(players);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getAllMatches() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('matches', 'readonly');
      const store = tx.objectStore('matches');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  calculateELO(winnerElo, loserElo, kFactor = 24) {
    const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 200));
    const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 200));
    const newWinnerElo = Math.round(winnerElo + kFactor * (1 - expectedWinner));
    const newLoserElo = Math.max(0, Math.round(loserElo + kFactor * (0 - expectedLoser)));
    return { newWinnerElo, newLoserElo };
  }

  async recordMatch(winnerName, loserName, options = {}) {
    const winner = String(winnerName || '').trim();
    const loser = String(loserName || '').trim();
    const white = String(options.white || winner).trim();
    const black = String(options.black || loser).trim();
    const winnerSide = String(options.winnerSide || '').trim() || (white === winner ? 'White' : 'Black');
    const matchName = String(options.name || 'Unnamed Game').trim();
    const link = String(options.link || '#').trim();
    const handicap = Number(options.handicap) || 0;

    if (!winner || !loser) throw new Error('Both usernames are required');
    if (winner === loser) throw new Error('Winner and loser must be different');

    const winnerPlayer = await this.getPlayer(winner);
    const loserPlayer = await this.getPlayer(loser);

    if (!winnerPlayer) throw new Error(`Winner "${winner}" not found`);
    if (!loserPlayer) throw new Error(`Loser "${loser}" not found`);

    const oldWinnerElo = winnerPlayer.elo_rating;
    const oldLoserElo = loserPlayer.elo_rating;
    const { newWinnerElo, newLoserElo } = this.calculateELO(oldWinnerElo, oldLoserElo);

    const adjustedWinnerElo = this.applyDanAdjustment(oldWinnerElo, newWinnerElo);
    const adjustedLoserElo = this.applyDanAdjustment(oldLoserElo, newLoserElo);

    winnerPlayer.elo_rating = adjustedWinnerElo;
    winnerPlayer.wins = (winnerPlayer.wins || 0) + 1;
    loserPlayer.elo_rating = adjustedLoserElo;
    loserPlayer.losses = (loserPlayer.losses || 0) + 1;

    await new Promise((resolve, reject) => {
      const tx = this.db.transaction(['players', 'matches'], 'readwrite');
      const playerStore = tx.objectStore('players');
      const matchStore = tx.objectStore('matches');

      playerStore.put(winnerPlayer);
      playerStore.put(loserPlayer);
      matchStore.add({
        winner: winner,
        loser: loser,
        white,
        black,
        winner_side: winnerSide,
        handicap,
        name: matchName,
        link,
        winner_before: oldWinnerElo,
        winner_after: adjustedWinnerElo,
        loser_before: oldLoserElo,
        loser_after: adjustedLoserElo,
        created_at: new Date().toISOString()
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    return {
      winner: {
        username: winner,
        oldElo: oldWinnerElo,
        newElo: adjustedWinnerElo
      },
      loser: {
        username: loser,
        oldElo: oldLoserElo,
        newElo: adjustedLoserElo
      }
    };
  }

  async exportData() {
    const players = await this.getAllPlayers();
    const matches = await this.getAllMatches();
    return { players, matches };
  }

  async importData(data) {
    if (!data || !Array.isArray(data.players) || !Array.isArray(data.matches)) {
      throw new Error('Invalid import data format');
    }

    await new Promise((resolve, reject) => {
      const tx = this.db.transaction(['players', 'matches'], 'readwrite');
      const playerStore = tx.objectStore('players');
      const matchStore = tx.objectStore('matches');

      playerStore.clear();
      matchStore.clear();

      data.players.forEach((player) => playerStore.put(player));
      data.matches.forEach((match) => matchStore.put({
        ...match,
        handicap: Number(match.handicap) || 0
      }));

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearAllData() {
    await new Promise((resolve, reject) => {
      const tx = this.db.transaction(['players', 'matches'], 'readwrite');
      const playersStore = tx.objectStore('players');
      const matchesStore = tx.objectStore('matches');

      playersStore.clear();
      matchesStore.clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

const eloDb = new ELODatabase();
