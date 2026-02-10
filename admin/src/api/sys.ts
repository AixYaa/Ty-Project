import request from '../utils/request';

// --- Types ---
export interface SysMenu {
  _id?: string;
  name: string;
  parentId?: string;
  schemaId?: string;
  path: string;
  icon?: string;
  sort?: number;
  children?: SysMenu[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SysEntity {
  _id?: string;
  name: string;
  displayName: string;
  fields?: any[];
}

export interface AuditLog {
  _id: string;
  userId: string;
  username: string;
  method: string;
  path: string;
  params: string;
  status: number;
  duration: number;
  ip: string;
  createdAt: string;
}

// --- Menu API ---
export const getMenuTree = () => {
  return request.get<any, SysMenu[]>('/sys/menu/tree');
};

export const getMenus = (params?: any) => {
  return request.get<any, SysMenu[]>('/sys/menu', { params });
};

export const createMenu = (data: SysMenu) => {
  return request.post<any, SysMenu>('/sys/menu', data);
};

export const updateMenu = (id: string, data: SysMenu) => {
  return request.put<any, SysMenu>(`/sys/menu/${id}`, data);
};

export const deleteMenu = (id: string) => {
  return request.delete<any, any>(`/sys/menu/${id}`);
};

// --- Entity API ---
export const getEntities = (params?: any) => {
  return request.get<any, SysEntity[]>('/sys/entity', { params });
};

export const createEntity = (data: SysEntity) => {
  return request.post<any, SysEntity>('/sys/entity', data);
};

// --- Audit API ---
export const getAuditLogs = (params?: any) => {
  return request.get<any, { list: AuditLog[]; total: number }>('/admin/audit', { params });
};

export const rollbackAuditLog = (id: string) => {
  return request.post<any, any>(`/admin/audit/${id}/rollback`);
};
