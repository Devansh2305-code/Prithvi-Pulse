/* ═══════════════════════════════════════════════════════════════════════════
   PRITHIVI PULSE – Static File Server
   Node.js / Express

   Start:  node server.js   (or: npm start)
═══════════════════════════════════════════════════════════════════════════ */

'use strict';

const path    = require('path');
const express = require('express');
const dotenv  = require('dotenv');

dotenv.config();

const app = express();

// ─── Serve static frontend files ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname)));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time:   new Date().toISOString(),
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001', 10);
app.listen(PORT, () => {
  console.log(`\n🌿 Prithivi Pulse server running on http://localhost:${PORT}\n`);
});
