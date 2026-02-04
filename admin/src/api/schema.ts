import request from '../utils/request';
// import type { SysMenu } from './sys';

export interface SysSchema {
  _id?: string;
  name: string;
  vue: {
    template: string;
    script: string;
    style: string;
  };
}

export const getSchemaById = (id: string) => {
  return request.get<any, SysSchema>(`/sys/schema/${id}`);
};

export const updateSchema = (id: string, data: Partial<SysSchema>) => {
  return request.put<any, SysSchema>(`/sys/schema/${id}`, data);
};

// 导出所有 sys.ts 的内容，方便统一引用
export * from './sys';
