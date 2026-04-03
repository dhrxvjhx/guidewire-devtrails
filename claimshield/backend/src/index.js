// src/index.js
// ClaimShield API Server
// Boots Express, registers all routes, starts the scheduler.

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://claimshield.vercel.app',
  /\.vercel\.app$/,   // allows all vercel preview URLs
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow curl/postman
    const allowed = allowedOrigins.some(o =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    callback(null, allowed);
  },
  credentials: true,
}));
app.use(express.json());

// ── Request logger (dev) ────────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/policy', require('./routes/policy'));
app.use('/api/premium', require('./routes/premium'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/payouts', require('./routes/payout'));

// ── Health check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ClaimShield API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ── Global error handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🛡️  ClaimShield API running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health:      http://localhost:${PORT}/health\n`);

  // Start the scheduler (trigger engine + premium deduction)
  // We require it after server starts so Firebase is fully initialised
  try {
    require('./scheduler');
    console.log('⚡  Scheduler started — checking triggers every 5 minutes');
  } catch (err) {
    console.warn('⚠️  Scheduler failed to start:', err.message);
    console.warn('   (This is ok in development without real API keys)');
  }
});

module.exports = app;
