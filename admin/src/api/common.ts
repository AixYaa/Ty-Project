import request from '@/utils/request';

export interface GitCommit {
  hash: string;
  author: string;
  date: string;
  message: string;
}

export const getGitLogs = () => {
  // Base URL is usually /api/admin, but common routes are at /api/common
  // We need to override the baseURL or use a relative path that goes up
  const baseUrl = import.meta.env.VITE_API_URL || '/api/admin';
  const rootApi = baseUrl.replace(/\/admin$/, '');

  return request.get<any, GitCommit[]>('/common/git-logs', {
    baseURL: rootApi
  });
};
