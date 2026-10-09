const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('./ratings.db', (err) => {
  if (err) console.error('Database connection error:', err);
  else console.log('Connected to SQLite database');
});

// Initialize database
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    elo_rating REAL DEFAULT 1000,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// ELO calculation function
function calculateELO(winnerELO, loserELO, K = 32) {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserELO - winnerELO) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerELO - loserELO) / 400));
  
  const newWinnerELO = Math.round(winnerELO + K * (1 - expectedWinner));
  const newLoserELO = Math.round(loserELO + K * (0 - expectedLoser));
  
  return { newWinnerELO, newLoserELO };
}

// Routes

// Get all players sorted by ELO
app.get('/api/leaderboard', (req, res) => {
  db.all(
    'SELECT id, username, elo_rating, wins, losses FROM players ORDER BY elo_rating DESC LIMIT 10000',
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

// Add new player
app.post('/api/players', (req, res) => {
  const { username } = req.body;
  
  if (!username || username.trim() === '') {
    return res.status(400).json({ error: 'Username is required' });
  }
  
  db.run(
    'INSERT INTO players (username, elo_rating) VALUES (?, ?)',
    [username.trim(), 1000],
    (err) => {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          res.status(409).json({ error: 'Username already exists' });
        } else {
          res.status(500).json({ error: err.message });
        }
        return;
      }
      res.status(201).json({ message: 'Player added successfully', username });
    }
  );
});

// Update ELO after a match
app.post('/api/match', (req, res) => {
  const { winner, loser } = req.body;
  
  if (!winner || !loser) {
    return res.status(400).json({ error: 'Winner and loser usernames required' });
  }
  
  db.get('SELECT elo_rating FROM players WHERE username = ?', [winner], (err, winnerRow) => {
    if (err || !winnerRow) {
      return res.status(404).json({ error: 'Winner not found' });
    }
    
    db.get('SELECT elo_rating FROM players WHERE username = ?', [loser], (err, loserRow) => {
      if (err || !loserRow) {
        return res.status(404).json({ error: 'Loser not found' });
      }
      
      const { newWinnerELO, newLoserELO } = calculateELO(winnerRow.elo_rating, loserRow.elo_rating);
      
      db.run('BEGIN TRANSACTION');
      
      db.run(
        'UPDATE players SET elo_rating = ?, wins = wins + 1, updated_at = CURRENT_TIMESTAMP WHERE username = ?',
        [newWinnerELO, winner],
        (err) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: err.message });
          }
          
          db.run(
            'UPDATE players SET elo_rating = ?, losses = losses + 1, updated_at = CURRENT_TIMESTAMP WHERE username = ?',
            [newLoserELO, loser],
            (err) => {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
              }
              
              db.run('COMMIT');
              res.json({
                message: 'Match recorded',
                winner: { username: winner, newELO: newWinnerELO },
                loser: { username: loser, newELO: newLoserELO }
              });
            }
          );
        }
      );
    });
  });
});

// Get player details
app.get('/api/players/:username', (req, res) => {
  db.get(
    'SELECT * FROM players WHERE username = ?',
    [req.params.username],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (!row) {
        return res.status(404).json({ error: 'Player not found' });
      }
      res.json(row);
    }
  );
});

app.listen(PORT, () => {
  console.log(`ELO Rating System running on http://localhost:${PORT}`);
});
