// src/firebase.js
const admin = require('firebase-admin');

const REQUIRED = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
const missing = REQUIRED.filter(k => !process.env[k]);

if (missing.length > 0) {
  console.error('\n🔴 [FIREBASE] Missing environment variables:');
  missing.forEach(k => console.error(`   • ${k}`));
  console.error('   Copy backend/.env.example → backend/.env and fill in your Firebase Admin SDK values.');
  console.error('   Get them from: Firebase Console → Project Settings → Service Accounts → Generate new private key\n');
}

if (!admin.apps.length) {
  if (missing.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log('[FIREBASE] Admin SDK initialised ✓');
  } else {
    console.warn('[FIREBASE] Running without credentials — Firestore calls will return 503');
  }
}

let db, auth;

if (admin.apps.length && missing.length === 0) {
  db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });
  auth = admin.auth();
} else {
  const notConfigured = () => new Proxy({}, {
    get: () => () => Promise.reject(
      Object.assign(
        new Error('Firebase not configured — set credentials in backend/.env'),
        { code: 'NOT_CONFIGURED' }
      )
    ),
  });
  db = notConfigured();
  auth = notConfigured();
}

module.exports = { admin, db, auth };