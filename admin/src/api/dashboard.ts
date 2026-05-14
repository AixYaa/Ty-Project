import request from '@/utils/request';

export interface DashboardStats {
  statistics: {
    users: number;
    menus: number;
    schemas: number;
    apiLogs: number;
  };
  trends: {
    apiLogs: Array<{ date: string; count: number }>;
  };
}

export function getDashboardStats() {
  return request.get<any, DashboardStats>('/dashboard/stats');
}