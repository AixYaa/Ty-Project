<template>
  <div class="breadcrumb-container">
    <div class="breadcrumb-card">
      <el-breadcrumb separator="/">
        <transition-group name="breadcrumb">
          <el-breadcrumb-item v-for="(item, index) in breadcrumbList" :key="item.path">
            <span 
              v-if="item.redirect === 'noRedirect' || index === breadcrumbList.length - 1 || !item.redirect" 
              class="no-redirect"
            >
              {{ item.meta.title }}
            </span>
            <a v-else @click.prevent="handleLink(item)">
              {{ item.meta.title }}
            </a>
          </el-breadcrumb-item>
        </transition-group>
      </el-breadcrumb>
    </div>

    <!-- Debug Button -->
    <div 
      v-if="settingStore.showDebugDrawer && userStore.userInfo?.username === 'admin'" 
      class="debug-btn"
      @click="settingStore.toggleDebugDrawer()"
    >
      <el-icon><Monitor /></el-icon>
    </div>

    <DebugDrawer />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getMenuTree, type SysMenu } from '@/api/sys';
import { useSettingStore } from '@/store/setting';
import { useUserStore } from '@/store/user';
import { Monitor } from '@element-plus/icons-vue';
import DebugDrawer from './DebugDrawer.vue';

const route = useRoute();
const router = useRouter();
const settingStore = useSettingStore();
const userStore = useUserStore();
const breadcrumbList = ref<any[]>([]);
const menuTree = ref<SysMenu[]>([]);

// Helper to find path in menu tree
const findMenuPath = (menus: SysMenu[], path: string, parents: SysMenu[] = []): SysMenu[] | null => {
  for (const menu of menus) {
    // Check if this menu matches the path
    // Note: strict match
    if (menu.path === path) {
      return [...parents, menu];
    }
    if (menu.children && menu.children.length > 0) {
      const found = findMenuPath(menu.children, path, [...parents, menu]);
      if (found) return found;
    }
  }
  return null;
};

const getBreadcrumb = () => {
  const currentPath = route.path;
  const matched = [];

  // Always add Dashboard/Home first
  matched.push({
    path: '/dashboard',
    meta: { title: '首页' },
    redirect: '/dashboard'
  });

  // If we are at dashboard, stop here
  if (currentPath === '/dashboard') {
    breadcrumbList.value = matched;
    return;
  }

  // Find in menu tree
  const menuPath = findMenuPath(menuTree.value, currentPath);
  
  if (menuPath) {
    menuPath.forEach(menu => {
      matched.push({
        path: menu.path || '',
        meta: { title: menu.name },
        redirect: menu.children && menu.children.length > 0 ? 'noRedirect' : menu.path
      });
    });
  } else {
    // Fallback to router matched if not found in menu (e.g. static routes other than dashboard)
    // Filter out Home/Dashboard to avoid duplication if it's already in matched
    const routerMatched = route.matched.filter(item => item.meta && item.meta.title && item.path !== '/dashboard' && item.path !== '/');
    routerMatched.forEach(item => {
      matched.push({
        path: item.path,
        meta: item.meta,
        redirect: item.redirect || item.path
      });
    });
  }
  
  breadcrumbList.value = matched;
};

const handleLink = (item: any) => {
  const { redirect, path } = item;
  if (redirect && redirect !== 'noRedirect') {
    router.push(redirect);
    return;
  }
  if (path) {
    router.push(path);
  }
};

const init = async () => {
  try {
    const res = await getMenuTree();
    menuTree.value = res;
    getBreadcrumb();
  } catch (e) {
    console.error(e);
    // Fallback if menu load fails
    const matched = route.matched.filter(item => item.meta && item.meta.title);
    breadcrumbList.value = matched;
  }
};

watch(
  () => route.path,
  () => {
    getBreadcrumb();
  }
);

onMounted(() => {
  init();
});
</script>

<style scoped>
.breadcrumb-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.breadcrumb-card {
  display: inline-block;
  background-color: #f5f7fa;
  padding: 8px 16px;
  border-radius: 4px;
  margin-left: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  border: 1px solid #ebeef5;
}

.debug-btn {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background-color: #f5f7fa;
  cursor: pointer;
  border: 1px solid #ebeef5;
  color: #606266;
  transition: all 0.3s;
}

.debug-btn:hover {
  background-color: #e6e8eb;
  color: var(--el-color-primary);
}

.no-redirect {
  color: #97a8be;
  cursor: text;
}

/* Breadcrumb transition */
.breadcrumb-enter-active,
.breadcrumb-leave-active {
  transition: all 0.5s;
}

.breadcrumb-enter-from,
.breadcrumb-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.breadcrumb-leave-active {
  position: absolute;
}
</style>
