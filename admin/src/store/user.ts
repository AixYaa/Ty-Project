import { defineStore } from 'pinia';
import request from '../utils/request';
import { resetRouter } from '@/router';
import { getToken, setToken, setRefreshToken, clearTokens } from '@/utils/auth';

export const useUserStore = defineStore('user', {
  state: () => ({
    token: getToken() || '',
    userInfo: null as any
  }),
  actions: {
    async login(loginForm: any) {
      try {
        const res: any = await request.post('/auth/login', loginForm);
        this.token = res.accessToken;
        this.userInfo = res.user;
        setToken(res.accessToken);
        setRefreshToken(res.refreshToken);
        return res;
      } catch (error) {
        throw error;
      }
    },
    async logout() {
      try {
        await request.post('/auth/logout');
      } finally {
        this.token = '';
        this.userInfo = null;
        clearTokens();
        // Clear tagsView persistence
        localStorage.removeItem('tagsView');
        resetRouter();
      }
    }
  },
  persist: true
});
