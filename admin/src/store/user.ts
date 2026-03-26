import { defineStore } from 'pinia';
import request from '../utils/request';
import { resetRouter } from '@/router';
import { getToken, setToken, setRefreshToken, clearTokens } from '@/utils/auth';

export const useUserStore = defineStore('user', {
  state: () => ({
    token: getToken() || '',
    userInfo: null as any,
    permissions: [] as string[]
  }),
  getters: {
    hasPermission: (state) => (perm: string) => {
      if (state.permissions.includes('*')) return true;
      return state.permissions.includes(perm);
    },
    hasAnyPermission: (state) => (perms: string[]) => {
      if (state.permissions.includes('*')) return true;
      return perms.some((p) => state.permissions.includes(p));
    }
  },
  actions: {
    async login(loginForm: any) {
      const res: any = await request.post('/auth/login', loginForm);
      this.token = res.accessToken;
      this.userInfo = res.user;
      setToken(res.accessToken);
      setRefreshToken(res.refreshToken);
      await this.fetchPermissions();
      return res;
    },
    async fetchPermissions() {
      try {
        const res: any = await request.get('/auth/permissions');
        this.permissions = res.permissions || [];
      } catch (error) {
        console.error('Failed to fetch permissions:', error);
        this.permissions = [];
      }
    },
    async logout() {
      try {
        await request.post('/auth/logout');
      } finally {
        this.token = '';
        this.userInfo = null;
        this.permissions = [];
        clearTokens();
        localStorage.removeItem('tagsView');
        resetRouter();
      }
    },
    setPermissions(permissions: string[]) {
      this.permissions = permissions;
    }
  },
  persist: true
});
