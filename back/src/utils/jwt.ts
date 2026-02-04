import jwt from 'jsonwebtoken';
import { getRedis } from '../db/redis';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access_secret_123';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh_secret_456';

const ACCESS_TOKEN_EXPIRE = '5m'; // 5分钟
const REFRESH_TOKEN_EXPIRE = 7 * 24 * 60 * 60; // 7天 (秒)

export interface TokenPayload {
  userId: string;
  username: string;
  role?: string;
}

export class JwtUtils {
  
  static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRE });
  }

  static generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRE });
  }

  static verifyAccessToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;
    } catch (err) {
      return null;
    }
  }

  static verifyRefreshToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, REFRESH_TOKEN_SECRET) as TokenPayload;
    } catch (err) {
      return null;
    }
  }

  // Redis operations for Refresh Token
  static async saveRefreshToken(userId: string, token: string) {
    const redis = getRedis();
    const key = `refresh_token:${userId}`;
    // 允许一个用户多端登录，这里用 Set 或者 Hash 存可能更好，
    // 但为了简单，暂时只允许一个 Refresh Token (单点登录) 或者 简单的 KV
    // 需求没提多端，先按单端处理，覆盖旧的
    await redis.set(key, token, 'EX', REFRESH_TOKEN_EXPIRE);
  }

  static async validateRefreshToken(userId: string, token: string): Promise<boolean> {
    const redis = getRedis();
    const storedToken = await redis.get(`refresh_token:${userId}`);
    return storedToken === token;
  }

  static async removeRefreshToken(userId: string) {
    const redis = getRedis();
    await redis.del(`refresh_token:${userId}`);
  }
}
