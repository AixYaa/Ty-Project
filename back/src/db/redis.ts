import Redis from 'ioredis';

let redis: Redis | null = null;

export async function connectRedis() {
  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = Number(process.env.REDIS_PORT || 6379);
  const password = process.env.REDIS_PASSWORD || undefined;

  redis = new Redis({ host, port, password });
  redis.on('connect', () => console.log('Connected to Redis'));
  redis.on('error', (err) => console.error('Redis error', err));
  // ensure connected
  await redis.ping();
}

export async function redisPing(): Promise<boolean> {
  if (!redis) return false;
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

export function getRedis(): Redis {
  if (!redis) throw new Error('Redis not connected');
  return redis;
}

export async function closeRedis() {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
