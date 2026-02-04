import { getDb } from '../db/mongo';
import { SysUser } from '../types/sys';
import { JwtUtils } from '../utils/jwt';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';

const COLLECTION_NAME = 'sys用户';

export class AuthService {
  private static getCollection() {
    return getDb().collection<SysUser>(COLLECTION_NAME);
  }

  static async register(data: SysUser) {
    const col = this.getCollection();
    const exist = await col.findOne({ username: data.username });
    if (exist) {
      throw new Error('用户名已存在');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password || '123456', salt);

    const doc: SysUser = {
      ...data,
      password: hashedPassword,
      status: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // 如果没有 _id，mongodb 会自动生成，但 ts 类型定义里 _id 是可选的。
    // 如果传入了 _id，则使用传入的。
    
    const result = await col.insertOne(doc as any);
    const { password, ...userWithoutPassword } = doc;
    return { ...userWithoutPassword, _id: result.insertedId };
  }

  static async login(username: string, password: string) {
    const col = this.getCollection();
    const user = await col.findOne({ username });
    
    if (!user || !user.password) {
      throw new Error('用户名或密码错误');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('用户名或密码错误');
    }

    if (user.status === 0) {
      throw new Error('用户已被禁用');
    }

    const payload = {
      userId: user._id!.toString(),
      username: user.username,
      role: user.role
    };

    const accessToken = JwtUtils.generateAccessToken(payload);
    const refreshToken = JwtUtils.generateRefreshToken(payload);

    // Save refresh token to Redis
    await JwtUtils.saveRefreshToken(payload.userId, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        avatar: user.avatar
      }
    };
  }

  static async refreshToken(token: string) {
    const payload = JwtUtils.verifyRefreshToken(token);
    if (!payload) {
      throw new Error('刷新令牌无效');
    }

    // Check against Redis
    const isValid = await JwtUtils.validateRefreshToken(payload.userId, token);
    if (!isValid) {
      throw new Error('刷新令牌已过期或无效');
    }

    // Generate new access token
    const newAccessToken = JwtUtils.generateAccessToken({
      userId: payload.userId,
      username: payload.username,
      role: payload.role
    });

    // Optionally rotate refresh token here (security best practice but adds complexity)
    // For now, just return new access token. 
    // If we want to extend session life, we can re-issue refresh token too.
    
    return {
      accessToken: newAccessToken
    };
  }

  static async logout(userId: string) {
    await JwtUtils.removeRefreshToken(userId);
  }

  // 初始化超级管理员
  static async initSuperAdmin() {
    try {
      const col = this.getCollection();
      const count = await col.countDocuments();
      if (count === 0) {
        console.log('数据库中没有用户，正在创建超级管理员...');
        const adminUser: SysUser = {
          username: 'admin',
          password: 'password123', // 建议修改
          name: 'Super Admin',
          role: 'admin',
          status: 1
        };
        await this.register(adminUser);
        console.log('超级管理员创建成功: username=admin, password=password123');
      }
    } catch (error) {
      console.error('初始化超级管理员失败:', error);
    }
  }
}
