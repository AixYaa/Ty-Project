import { defineStore } from 'pinia';
import request from '../utils/request';

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('accessToken') || '',
    userInfo: null as any
  }),
  actions: {
    async login(loginForm: any) {
      try {
        const res: any = await request.post('/auth/login', loginForm);
        this.token = res.accessToken;
        this.userInfo = res.user;
        localStorage.setItem('accessToken', res.accessToken);
        localStorage.setItem('refreshToken', res.refreshToken);
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
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    }
  },
  persist: true
});
