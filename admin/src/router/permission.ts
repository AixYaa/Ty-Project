import router from './index';
import { getMenuTree, type SysMenu } from '@/api/sys';
import { useTagsViewStore } from '@/store/tagsView';
import type { RouteRecordRaw } from 'vue-router';
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
  
  return routes;
};

router.beforeEach(async (to, _from, next) => {
  NProgress.start();
  console.log('Router beforeEach:', to.path);
  const token = localStorage.getItem('accessToken');

  if (token) {
    if (to.path === '/login') {
      next({ path: '/' });
    } else {
      if (!isRoutesLoaded) {
        try {
          // 获取菜单树
          const menus = await getMenuTree();
          const dynamicRoutes = generateRoutes(menus);
          
          // 动态添加路由到 Layout 下
          // 注意：我们需要知道 Layout 的 name，在 router/index.ts 里定义为 'Layout'
          dynamicRoutes.forEach(route => {
            router.addRoute('Layout', route);
          });
          
          // 添加一个 404 捕获路由 (可选)
          router.addRoute({
            path: '/:pathMatch(.*)*',
            name: 'NotFound',
            redirect: '/dashboard' // 或者 404 页面
          });

          isRoutesLoaded = true;
          
          // 清理无效的 Tags
          const tagsViewStore = useTagsViewStore();
          tagsViewStore.pruneVisitedViews(router);

          // 替换当前跳转，确保新路由生效
          next({ ...to, replace: true });
        } catch (error: any) {
          console.error('Failed to generate dynamic routes', error);
          // 如果获取菜单失败（如 401），则强制退出
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          next('/login');
        }
      } else {
        next();
      }
    }
  } else {
    if (to.path !== '/login') {
      next('/login');
    } else {
      isRoutesLoaded = false;
      next();
    }
  }
});

router.afterEach(() => {
  NProgress.done();
});
