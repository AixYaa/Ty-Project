import axios from 'axios';
import { ElMessage } from 'element-plus';
const BASE_URL = import.meta.env.VITE_API_URL;
const service = axios.create({
  baseURL: BASE_URL, // 指向后台管理接口 (修正为 /api/admin)
  timeout: 5000
});

// Request interceptor
service.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
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

// Response interceptor
service.interceptors.response.use(
  (response) => {
    const res = response.data;
    // 假设后端返回结构 { status: 200, msg: 'success', data: ... }
    if (res.status !== 200) {
      ElMessage.error(res.msg || 'Error');
      return Promise.reject(new Error(res.msg || 'Error'));
    } else {
      return res.data;
    }
  },
  async (error) => {
    console.error('err' + error);
    const originalRequest = error.config;

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        if (!isRefreshing) {
          isRefreshing = true;
          originalRequest._retry = true;

          try {
            // Call refresh token API
            const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
              refreshToken
            });

            if (data.status === 200) {
              const { accessToken } = data.data;
              localStorage.setItem('accessToken', accessToken);
              service.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

              // Execute queued requests
              requests.forEach((cb) => cb(accessToken));
              requests = [];

              return service(originalRequest);
            } else {
              throw new Error('Refresh failed');
            }
          } catch (refreshError) {
            // Refresh failed, clear tokens and redirect
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        } else {
          // Queue requests while refreshing
          return new Promise((resolve) => {
            requests.push((token: string) => {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
              resolve(service(originalRequest));
            });
          });
        }
      } else {
        // No refresh token, redirect to login
        ElMessage.error('登录过期，请重新登录');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    } else {
      ElMessage.error(error.message);
    }
    return Promise.reject(error);
  }
);

export default service;
