import { ObjectId, Document } from 'mongodb';

export interface SysEntity extends Document {
  _id?: ObjectId;
  name: string;        // 集合名称 (Collection Name)
  displayName?: string; // 显示名称
  fields?: any[];      // 字段定义 (可选)
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SysView extends Document {
  _id?: ObjectId;
  name: string;
  entityId: string;    // 关联的实体 ID
  type: string;        // 视图类型 (如: list, form)
  config?: any;        // 视图配置 json
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SysSchema extends Document {
  _id?: ObjectId;
  name: string;
  entityId?: string;   // 关联实体
  viewId?: string;     // 关联视图
  vue: {
    template: string;
    script: string;
    style: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SysMenu extends Document {
  _id?: ObjectId;
  name: string;
  parentId?: string;   // 父菜单 ID
  schemaId?: string;   // 绑定的架构 ID
  path: string;        // 路由路径
  icon?: string;
  sort?: number;
  roles?: string[];    // 可见角色
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SysUser extends Document {
  _id?: ObjectId;
  username: string;
  password?: string;   // 加密后的密码
  name?: string;       // 真实姓名
  avatar?: string;
  role?: string;       // 角色
  status?: number;     // 1: 启用, 0: 禁用
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SysRole extends Document {
  _id?: ObjectId;
  name: string;        // 角色名称 (如: 管理员)
  code: string;        // 角色标识 (如: admin)
  description?: string;
  status?: number;     // 1: 启用, 0: 禁用
  createdAt?: Date;
  updatedAt?: Date;
}
