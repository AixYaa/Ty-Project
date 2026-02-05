<template>
  <div class="columns-sidebar">
    <!-- Left Column: Top Level Menus -->
    <div class="left-column">
      <div class="logo">
        <img src="@/assets/logo.png" alt="logo" v-if="false" />
        <span v-else>Aix</span>
      </div>
      <el-scrollbar>
        <div 
          v-for="menu in menuTree" 
          :key="menu._id"
          class="column-item"
          :class="{ 'is-active': activeParentId === menu._id }"
          @click="handleParentClick(menu)"
        >
          <div class="icon-box">
            <el-icon v-if="menu.icon" :size="20"><component :is="menu.icon" /></el-icon>
            <el-icon v-else :size="20"><MenuIcon /></el-icon>
          </div>
          <span class="title">{{ menu.name }}</span>
        </div>
      </el-scrollbar>
    </div>

    <!-- Right Column: Sub Menus -->
    <div class="right-column">
      <div class="sub-menu-title">
        {{ activeParentName }}
      </div>
      <el-scrollbar>
        <el-menu
          router
          :default-active="activeMenu"
          class="sub-menu"
          :unique-opened="true"
        >
          <template v-for="menu in subMenus" :key="menu._id">
            <el-sub-menu v-if="menu.children && menu.children.length > 0" :index="menu._id || ''">
              <template #title>
                <el-icon v-if="menu.icon"><component :is="menu.icon" /></el-icon>
                <span>{{ menu.name }}</span>
              </template>
              <el-menu-item 
                v-for="child in menu.children" 
                :key="child._id" 
                :index="child.path"
              >
                <el-icon v-if="child.icon"><component :is="child.icon" /></el-icon>
                <template #title>{{ child.name }}</template>
              </el-menu-item>
            </el-sub-menu>
            <el-menu-item v-else :index="menu.path">
              <el-icon v-if="menu.icon"><component :is="menu.icon" /></el-icon>
              <template #title>{{ menu.name }}</template>
            </el-menu-item>
          </template>
        </el-menu>
      </el-scrollbar>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getMenuTree, type SysMenu } from '@/api/sys';
import { Menu as MenuIcon } from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();

const menuTree = ref<SysMenu[]>([]);
const activeParentId = ref<string>('');
const activeParentName = ref<string>('');

const activeMenu = computed(() => route.path);

const subMenus = computed(() => {
  const parent = menuTree.value.find(m => m._id === activeParentId.value);
  return parent ? (parent.children || []) : [];
});

const handleParentClick = (menu: SysMenu) => {
  activeParentId.value = menu._id!;
  activeParentName.value = menu.name;
  
  // Optional: Automatically jump to first child if no child is active
  // But usually we just show the submenu and let user click.
  // However, if the user clicks a top level menu that IS a route itself (no children), we should navigate.
  if (!menu.children || menu.children.length === 0) {
    if (menu.path) router.push(menu.path);
  }
};

const loadMenus = async () => {
  try {
    const res = await getMenuTree();
    menuTree.value = res;
    initActiveMenu();
  } catch (e) {
    console.error('Failed to load menus', e);
  }
};

const initActiveMenu = () => {
  if (menuTree.value.length === 0) return;

  // Find which parent contains the current route
  const currentPath = route.path;
  
  // Helper to check if a menu or its children contains the path
  const containsPath = (menu: SysMenu, path: string): boolean => {
    if (menu.path === path) return true;
    if (menu.children) {
      return menu.children.some(child => containsPath(child, path));
    }
    return false;
  };

  const activeParent = menuTree.value.find(m => containsPath(m, currentPath));
  
  if (activeParent) {
    activeParentId.value = activeParent._id!;
    activeParentName.value = activeParent.name;
  } else {
    // Default to first one if not found (or maybe dashboard?)
    if (menuTree.value.length > 0) {
      activeParentId.value = menuTree.value[0]?._id!;
      activeParentName.value = menuTree.value[0]?.name || '';
    }
  }
};

watch(() => route.path, () => {
  initActiveMenu();
});

onMounted(() => {
  loadMenus();
});
</script>

<style scoped>
.columns-sidebar {
  display: flex;
  height: 100%;
  background-color: #fff;
}

.left-column {
  width: 70px;
  height: 100%;
  background-color: #001529; /* Dark Sidebar */
  display: flex;
  flex-direction: column;
}

.logo {
  height: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #fff;
  font-weight: bold;
  font-size: 18px;
  background-color: #002140;
}

.column-item {
  height: 70px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #a6adb4;
  cursor: pointer;
  transition: all 0.3s;
}

.column-item:hover, .column-item.is-active {
  color: #fff;
  background-color: var(--el-color-primary);
}

.icon-box {
  margin-bottom: 4px;
}

.title {
  font-size: 12px;
}

.right-column {
  width: 140px; /* Reduced from 210px to fit better or match design */
  height: 100%;
  background-color: #fff;
  border-right: 1px solid #dcdfe6;
  display: flex;
  flex-direction: column;
}

.sub-menu-title {
  height: 60px;
  line-height: 60px;
  padding-left: 20px;
  font-size: 16px;
  font-weight: bold;
  color: #333;
  border-bottom: 1px solid #f0f0f0;
}

.sub-menu {
  border-right: none;
}
</style>
