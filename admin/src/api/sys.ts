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

export interface SysDictionary {
  _id?: string;
  code: string;
  name: string;
  description?: string;
  items: {
    label: string;
    value: string | number;
    sort?: number;
    color?: string;
  }[];
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

// --- Audit API ---
export const getAuditLogs = (params?: any) => {
  return request.get<any, { list: AuditLog[]; total: number }>('/admin/audit', { params });
};

export const rollbackAuditLog = (id: string) => {
  return request.post<any, any>(`/admin/audit/${id}/rollback`);
};

// --- Dictionary API ---
export const getDictionaries = (params?: any) => {
  return request.get<any, { list: SysDictionary[]; total: number }>('/sys/dict', { params });
};

export const getDictionaryByCode = (code: string) => {
  return request.get<any, SysDictionary>(`/sys/dict/code/${code}`);
};

export const createDictionary = (data: SysDictionary) => {
  return request.post<any, SysDictionary>('/sys/dict', data);
};

export const updateDictionary = (id: string, data: SysDictionary) => {
  return request.put<any, SysDictionary>(`/sys/dict/${id}`, data);
};

export const deleteDictionary = (id: string) => {
  return request.delete<any, any>(`/sys/dict/${id}`);
};
