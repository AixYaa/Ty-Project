import dotenv from 'dotenv';
import path from 'path';

// Load .env file
// Explicitly specify path if needed, but default is process.cwd()/.env
dotenv.config();

console.log('[Env] Loaded environment variables');
if (!process.env.CORS_WHITELIST) {
  console.warn('[Env] CORS_WHITELIST is not set in environment variables');
} else {
  console.log('[Env] CORS_WHITELIST loaded:', process.env.CORS_WHITELIST);
}
