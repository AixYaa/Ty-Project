import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/index.vue')
  },
  {
    path: '/',
    name: 'Layout',
    component: () => import('../views/layout/index.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../components/HelloWorld.vue'),
        meta: { title: '首页', icon: 'House' }
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// 移除这里的 beforeEach，统一在 permission.ts 处理
export default router;
