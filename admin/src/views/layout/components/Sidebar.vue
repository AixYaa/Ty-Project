<template>
  <div class="sidebar-container" :class="{ 'is-collapse': settingStore.isCollapse }">
    <div v-if="showLogo" class="logo">
      <span v-if="!settingStore.isCollapse">管理平台</span>
      <span v-else>Aix</span>
    </div>
    <el-scrollbar>
      <Menu mode="vertical" />
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSettingStore } from '@/store/setting';
import Menu from './Menu.vue';

const settingStore = useSettingStore();

const showLogo = computed(() => settingStore.layoutMode !== 'classic');
const menuBgColor = computed(() => {
  if (settingStore.isDark) return '#1d1e1f';
  return settingStore.themeColor === 'dark' ? '#001529' : '#ffffff';
});
const menuTextColor = computed(() => {
  if (settingStore.isDark) return '#CFD3DC';
  return settingStore.themeColor === 'dark' ? '#fff' : '#303133';
});
</script>

<style scoped>
.sidebar-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: v-bind(menuBgColor);
  transition: width 0.3s;
  width: 260px;
  border-right: 1px solid #dcdfe6;
}

.sidebar-container.is-collapse {
  width: 64px;
}

.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  font-size: 20px;
  font-weight: bold;
  background-color: rgba(0, 0, 0, 0.02);
  color: v-bind(menuTextColor);
  white-space: nowrap;
  overflow: hidden;
}
</style>
