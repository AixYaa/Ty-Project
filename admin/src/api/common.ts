import request from '@/utils/request';

export interface GitCommit {
  hash: string;
  author: string;
  date: string;
  message: string;
}

export interface SystemInfo {
  systemName: string;
  systemVersion: string;
  systemDescription: string;
  defaultLanguage: string;
  timezone: string;
}

export interface MaintenanceStatus {
  enabled: boolean;
  message: string;
}

export interface CopyrightInfo {
  copyright: string;
  icpLicense: string;
}

export const getGitLogs = () => {
  const baseUrl = import.meta.env.VITE_API_URL || '/api/admin';
  const rootApi = baseUrl.replace(/\/admin$/, '');

  return request.get<any, GitCommit[]>('/common/git-logs', {
    baseURL: rootApi
  });
};

export const getSystemInfo = () => {
  const baseUrl = import.meta.env.VITE_API_URL || '/api/admin';
  const rootApi = baseUrl.replace(/\/admin$/, '');

  return request.get<any, SystemInfo>('/common/system-info', {
    baseURL: rootApi
  });
};

export const getMaintenanceStatus = () => {
  const baseUrl = import.meta.env.VITE_API_URL || '/api/admin';
  const rootApi = baseUrl.replace(/\/admin$/, '');

  return request.get<any, MaintenanceStatus>('/common/maintenance-status', {
    baseURL: rootApi
  });
};

export const getCopyrightInfo = () => {
  const baseUrl = import.meta.env.VITE_API_URL || '/api/admin';
  const rootApi = baseUrl.replace(/\/admin$/, '');

  return request.get<any, CopyrightInfo>('/common/copyright-info', {
    baseURL: rootApi
  });
};
