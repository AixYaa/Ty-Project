import axios from 'axios';
import { ElMessage } from 'element-plus';
import { getToken, getRefreshToken, setToken, clearTokens } from '@/utils/auth';
import { ErrorCode } from '@/api/errorCode';

const BASE_URL = import.meta.env.VITE_API_URL;
const service = axios.create({
  baseURL: BASE_URL,
  timeout: 5000
});

service.interceptors.request.use(
  (config) => {
    if (config.url?.startsWith('/mock')) {
      config.baseURL = '';
    }

    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let requests: any[] = [];

service.interceptors.response.use(
  (response) => {
    const res = response.data;
    if (res.status !== 200) {
      ElMessage.error(res.msg || 'Error');
      return Promise.reject(new Error(res.msg || 'Error'));
    } else {
      if (res.code !== undefined && res.code !== ErrorCode.SUCCESS) {
        if (res.code === ErrorCode.TOKEN_EXPIRED || res.code === ErrorCode.INVALID_TOKEN) {
        }
        ElMessage.error(res.msg || 'Error');
        return Promise.reject(new Error(res.msg || 'Error'));
      }
      return res.data;
    }
  },
  async (error) => {
    console.error('err' + error);
    const originalRequest = error.config;

    if (error.response && error.response.status === 503) {
      const res = error.response.data;
      const isMaintenancePage = window.location.hash.includes('/maintenance');
      console.log('[Request] 503 received, msg:', res.msg, 'isMaintenancePage:', isMaintenancePage);
      if (res.msg && res.msg.includes('维护') && !isMaintenancePage) {
        sessionStorage.setItem('maintenanceMessage', res.msg || '系统正在维护中，请稍后再试...');
        ElMessage.warning(res.msg || '系统正在维护中，请稍后再试...');
        console.log('[Request] Redirecting to maintenance page');
        window.location.href = window.location.origin + '/#/maintenance';
      }
      return Promise.reject(error);
    }

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      const refreshToken = getRefreshToken();

      if (refreshToken) {
        if (!isRefreshing) {
          isRefreshing = true;
          originalRequest._retry = true;

          try {
            const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
              refreshToken
            });

            if (data.status === 200) {
              const { accessToken } = data.data;
              setToken(accessToken);
              service.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

              requests.forEach((cb) => cb(accessToken));
              requests = [];

              return service(originalRequest);
            } else {
              throw new Error('Refresh failed');
            }
          } catch (refreshError) {
            clearTokens();
            window.location.href = '/#/login';
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        } else {
          return new Promise((resolve) => {
            requests.push((token: string) => {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
              resolve(service(originalRequest));
            });
          });
        }
      } else {
        ElMessage.error('登录过期，请重新登录');
        clearTokens();
        window.location.href = '/#/login';
      }
    } else {
      ElMessage.error(error.message);
    }
    return Promise.reject(error);
  }
);

export default service;
