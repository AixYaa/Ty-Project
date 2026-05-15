import { getMenuTree, type SysMenu } from '@/api/sys';
import { useTagsViewStore } from '@/store/tagsView';
import { getToken, clearTokens } from '@/utils/auth';
import type {
  RouteRecordRaw,
  Router,
  NavigationGuardNext,
  RouteLocationNormalized
} from 'vue-router';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

NProgress.configure({ showSpinner: false });

let isRoutesLoaded = false;

// 递归转换菜单为路由
const generateRoutes = (menus: SysMenu[]): RouteRecordRaw[] => {
  const routes: RouteRecordRaw[] = [];

  for (const menu of menus) {
    if (menu.children && menu.children.length > 0) {
      routes.push(...generateRoutes(menu.children));
    }

    // 如果有 schemaId，说明是动态页面
    if (menu.schemaId && menu.path) {
      console.log('Generating route:', menu.path, menu.schemaId);

      // 特殊处理：API日志页面使用独立组件（支持echarts）
      if (menu.path === '/sys/api-log') {
        routes.push({
          path: menu.path,
          name: `Dynamic_${menu._id}`,
          component: () => import('@/views/sys/api-log/index.vue'),
          meta: {
            title: menu.name,
            icon: menu.icon
          }
        });
      } else if (menu.path === '/workflow/templates') {
        routes.push({
          path: menu.path,
          name: `Dynamic_${menu._id}`,
          component: () => import('@/views/workflow/templates/index.vue'),
          meta: {
            title: menu.name,
            icon: menu.icon
          }
        });
      } else if (menu.path === '/workflow/launch') {
        routes.push({
          path: menu.path,
          name: `Dynamic_${menu._id}`,
          component: () => import('@/views/workflow/launch/index.vue'),
          meta: {
            title: menu.name,
            icon: menu.icon
          }
        });
      } else if (menu.path === '/workflow/instances') {
        routes.push({
          path: menu.path,
          name: `Dynamic_${menu._id}`,
          component: () => import('@/views/workflow/instances/index.vue'),
          meta: {
            title: menu.name,
            icon: menu.icon
          }
        });
      } else if (menu.path === '/workflow/tasks') {
        routes.push({
          path: menu.path,
          name: `Dynamic_${menu._id}`,
          component: () => import('@/views/workflow/tasks/index.vue'),
          meta: {
            title: menu.name,
            icon: menu.icon
          }
        });
      } else {
        routes.push({
          path: menu.path,
          name: `Dynamic_${menu._id}`, // 确保 name 唯一
          component: () => import('@/views/sys/schema/DynamicRender.vue'),
          meta: {
            title: menu.name,
            schemaId: menu.schemaId,
            icon: menu.icon
          },
          props: {
            schemaId: menu.schemaId
          }
        });
      }
    }
  }

  return routes;
};

// Guard: Progress Bar Start
export const createProgressGuard = (router: Router) => {
  router.beforeEach(() => {
    NProgress.start();
  });

  router.afterEach(() => {
    NProgress.done();
  });
};

// Guard: Permission & Dynamic Routes
export const createPermissionGuard = (router: Router) => {
  router.beforeEach(
    async (
      to: RouteLocationNormalized,
      _from: RouteLocationNormalized,
      next: NavigationGuardNext
    ) => {
      console.log('Router beforeEach:', to.path);
      const token = getToken();

      if (token) {
        if (to.path === '/login' || to.path === '/maintenance') {
          next();
        } else {
          if (!isRoutesLoaded) {
            try {
              const menus = await getMenuTree();
              const dynamicRoutes = generateRoutes(menus);

              dynamicRoutes.forEach((route) => {
                router.addRoute('Layout', route);
              });

              router.addRoute({
                path: '/:pathMatch(.*)*',
                name: 'NotFound',
                redirect: '/404'
              });

              isRoutesLoaded = true;

              const tagsViewStore = useTagsViewStore();
              tagsViewStore.pruneVisitedViews(router);

              next({ ...to, replace: true });
            } catch (error: any) {
              console.error('Failed to generate dynamic routes', error);
              if (error.response && error.response.status === 503) {
                next();
              } else {
                clearTokens();
                next('/login');
              }
            }
          } else {
            next();
          }
        }
      } else {
        if (to.path === '/maintenance') {
          next();
        } else if (to.path !== '/login') {
          next('/login');
        } else {
          isRoutesLoaded = false;
          next();
        }
      }
    }
  );
};

// Initialize guards
export function setupRouterGuard(router: Router) {
  createProgressGuard(router);
  createPermissionGuard(router);
}
