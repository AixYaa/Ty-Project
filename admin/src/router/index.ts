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
        component: () => import('../views/dashboard/index.vue'),
        meta: { title: 'common.home', icon: 'House' }
      }
    ]
  },
  {
    path: '/403',
    name: '403',
    component: () => import('../views/error/403.vue'),
    meta: { title: '403 Forbidden' }
  },
  {
    path: '/404',
    name: '404',
    component: () => import('../views/error/404.vue'),
    meta: { title: '404 Not Found' }
  },
  {
    path: '/500',
    name: '500',
    component: () => import('../views/error/500.vue'),
    meta: { title: '500 Server Error' }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export const resetRouter = () => {
  const whiteList = ['Login', 'Layout', 'Dashboard', '403', '404', '500'];
  router.getRoutes().forEach((route) => {
    const name = route.name as string;
    if (name && !whiteList.includes(name)) {
      router.removeRoute(name);
    }
  });
};

// 移除这里的 beforeEach，统一在 permission.ts 处理
export default router;
