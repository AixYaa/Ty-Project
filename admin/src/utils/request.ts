import axios from 'axios';
import { ElMessage } from 'element-plus';

const service = axios.create({
  baseURL: 'http://localhost:6632/api/admin', // 指向后台管理接口 (修正为 /api/admin)
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
  (error) => {
    console.error('err' + error);
    if (error.response && error.response.status === 401) {
      ElMessage.error('登录过期，请重新登录');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      // 避免循环依赖，这里使用 window.location 跳转
      window.location.href = '/login';
    } else {
      ElMessage.error(error.message);
    }
    return Promise.reject(error);
  }
);

export default service;
