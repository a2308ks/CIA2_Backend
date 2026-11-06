// Vercel serverless entry point: wraps the same Express app used locally.
import { createApp } from '../server/src/app.js';
import { connectDB } from '../server/src/config/db.js';
import { seedIfEmpty } from '../server/src/seed.js';

const app = createApp();

// Reuse the MongoDB connection across warm invocations
let ready = null;

export default async function handler(req, res) {
  if (!ready) {
    // MONGO_URI (set by hand) or MONGODB_URI (set by Vercel's MongoDB Atlas integration)
    ready = connectDB({ uri: process.env.MONGO_URI || process.env.MONGODB_URI }).then(seedIfEmpty);
  }
  try {
    await ready;
  } catch (err) {
    ready = null; // retry on the next request
    console.error('[db] connection failed:', err.message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Database unavailable. Please try again shortly.' }));
  }
  return app(req, res);
}
