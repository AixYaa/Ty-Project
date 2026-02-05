<template>
  <el-menu
    router
    :default-active="$route.path"
    :collapse="isCollapse"
    :mode="mode"
    :unique-opened="true"
    :class="menuClass"
    :background-color="bgColor"
    :text-color="textColor"
    :active-text-color="activeTextColor"
    :ellipsis="false"
  >
    <el-menu-item index="/dashboard">
      <el-icon><House /></el-icon>
      <template #title>首页</template>
    </el-menu-item>
    
    <template v-for="menu in menuTree" :key="menu._id">
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
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { getMenuTree, type SysMenu } from '@/api/sys';
import { House } from '@element-plus/icons-vue';
import { useSettingStore } from '@/store/setting';

const props = defineProps<{
  mode: 'vertical' | 'horizontal';
}>();

const settingStore = useSettingStore();
const menuTree = ref<SysMenu[]>([]);

const isCollapse = computed(() => props.mode === 'vertical' && settingStore.isCollapse);

// Menu Colors
// If Horizontal: usually transparent or white in header, unless dark mode
// If Vertical: based on sidebar theme
const bgColor = computed(() => {
  if (props.mode === 'horizontal') return 'transparent';
  return settingStore.themeColor === 'dark' ? '#001529' : '#ffffff';
});

const textColor = computed(() => {
  if (props.mode === 'horizontal') return '#303133';
  return settingStore.themeColor === 'dark' ? '#fff' : '#303133';
});

const activeTextColor = computed(() => settingStore.primaryColor);

const menuClass = computed(() => {
  return props.mode === 'vertical' ? 'el-menu-vertical' : 'el-menu-horizontal-custom';
});

const loadMenus = async () => {
  try {
    const res = await getMenuTree();
    menuTree.value = res;
  } catch (e) {
    console.error('Failed to load menus', e);
  }
};

onMounted(() => {
  loadMenus();
});
</script>

<style scoped>
.el-menu-vertical {
  border-right: none;
}
.el-menu-horizontal-custom {
  border-bottom: none;
  height: 100%;
}

@media screen and (max-width: 768px) {
  .el-menu-vertical {
    --el-menu-base-level-padding: 10px;
    --el-menu-item-height: 50px;
  }
}
</style>
