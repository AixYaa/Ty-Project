import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongo() {
  const host = process.env.MONGO_HOST || '127.0.0.1';
  const port = process.env.MONGO_PORT || '27017';
  const user = process.env.MONGO_USER;
  const password = process.env.MONGO_PASSWORD;
  const authSource = process.env.MONGO_AUTH_SOURCE || 'admin';
  const dbName = process.env.MONGO_DB || 'test';

  const uri = user && password
    ? `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/?authSource=${authSource}`
    : `mongodb://${host}:${port}`;

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);
  console.log('Connected to MongoDB');
}

export async function mongoPing(): Promise<boolean> {
  if (!client) return false;
  try {
    await client.db().command({ ping: 1 });
    return true;
  } catch (err) {
    return false;
  }
}

export function getDb(): Db {
  if (!db) throw new Error('MongoDB not connected');
  return db;
}

export async function closeMongo() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
