# ELO Rating System 🎮

A **completely free**, client-side ELO rating system that runs entirely in your browser! No server needed, no hosting costs.

## ✨ Features

- 📊 **Live Leaderboard** - Display and sort thousands of players
- ➕ **Add Players** - New accounts start at 1000 ELO
- 🏆 **Record Matches** - Auto-calculate ELO changes
- 💾 **Persistent Storage** - Data saved in your browser (IndexedDB)
- 📥 **Export/Import** - Backup and restore as JSON
- 📱 **Responsive Design** - Works on mobile and desktop
- 🔄 **Offline Ready** - Works without internet after first load
- **FREE** - Host on GitHub Pages at no cost!

## 🚀 Getting Started

### Option 1: Use My Version
Just visit: https://seminyoon1.github.io/BG-Rating-System

### Option 2: Host Your Own Copy

1. **Fork this repo** on GitHub
2. **Enable GitHub Pages** in repo settings (Settings → Pages → Deploy from main branch)
3. **Access your version** at: `https://YOUR-USERNAME.github.io/BG-Rating-System`

That's it! No backend, no server setup needed.

## 📖 How to Use

### Add a Player
1. Enter a username
2. Click "Add Player"
3. Player starts with **1000 ELO**

### Record a Match
1. Enter **winner's username**
2. Enter **loser's username**
3. Click "Record Match"
4. ELO ratings update automatically
5. Stats update in real-time

### View Leaderboard
- Sorted by ELO rating (highest first)
- Search to find specific players
- Shows wins, losses, and W/L ratio

### Backup Your Data
- Click **"Export Data"** to download as JSON
- Click **"Import Data"** to restore from JSON
- Share backups across devices or with friends

## 💾 How Data is Stored

All data is stored in **IndexedDB** (browser database):
- ✅ Persists between sessions
- ✅ Survives browser refresh
- ✅ ~500MB storage per domain
- ✅ Can hold 10,000+ players easily

**Note:** Data is stored locally in your browser. Clear browser data → data is gone.

## 🧮 ELO Calculation

Uses the standard ELO formula:
- **K-factor**: 32 points per game
- **Expected score**: Based on rating difference
- **Upsets**: Gain more points when beating higher-rated players

Formula:
```
New ELO = Old ELO + K × (1 - Expected Score)
Expected Score = 1 / (1 + 10^((opponent ELO - your ELO) / 400))
```

## 📁 File Structure

```
BG-Rating-System/
├── index.html       # Main app page
├── app.js          # Frontend logic
├── db.js           # IndexedDB database manager
├── styles.css      # Styling
└── README.md       # This file
```

## 🔧 Customization

Want to modify it? Just edit the files:

- **K-factor**: Change in `db.js` line ~100 (default: 32)
- **Starting ELO**: Change in `db.js` line ~43 (default: 1000)
- **Colors**: Edit `styles.css`

## 🌐 Deploy to GitHub Pages

1. Go to **Settings → Pages**
2. Select **Deploy from a branch**
3. Choose **main** branch
4. Click **Save**
5. Access at `https://YOUR-USERNAME.github.io/BG-Rating-System`

## ⚠️ Important Notes

- **Browser Storage Only**: Data is stored in your browser only
- **Not Shared**: Each browser/device has separate data (use Export/Import to share)
- **No Cloud Sync**: Edits on one device won't sync to another
- **Clear Cache = Lost Data**: Be careful when clearing browser data!

## 🤔 FAQ

**Q: Will my data sync across devices?**  
A: No, but you can export from one device and import on another.

**Q: Can I share this with others?**  
A: Yes! Share the link. Each person gets their own separate database.

**Q: Can I add custom K-factors per player?**  
A: Edit the `calculateELO()` function in `db.js` to customize.

**Q: How many players can it hold?**  
A: Browser IndexedDB typically allows ~500MB, easily handling 10,000+ players.

## 🛠️ Advanced: Self-Hosting Backend

Want a real backend with cloud sync? Fork and modify to use:
- **Backend**: Node.js + Express + Firebase/MongoDB
- **Hosting**: Heroku, Railway, Vercel

But for personal use, the free GitHub Pages version works great!

## 📝 License

MIT - Use freely!

## 🙌 Contributing

Found a bug? Have a feature idea? Open an issue!

---

**Made with ❤️ for competitive gaming communities**
