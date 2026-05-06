<template>
  <div class="sidebar-container" :class="{ 'is-collapse': settingStore.isCollapse }">
    <div v-if="showLogo" class="logo">
      <span v-if="!settingStore.isCollapse">{{ systemInfo.systemName || '管理平台' }}</span>
      <span v-else>{{ systemInfo.systemName ? systemInfo.systemName.slice(0, 3) : 'Aix' }}</span>
    </div>
    <el-scrollbar>
      <Menu mode="vertical" />
    </el-scrollbar>
    <div class="sidebar-footer">
      <el-popover
        :width="popoverWidth"
        trigger="hover"
        :placement="popoverPlacement"
        :show-after="200"
      >
        <template #reference>
          <a href="#" class="api-doc-link" @click.prevent="openApiDoc">
            <el-icon :size="18"><Document /></el-icon>
            <span v-if="!settingStore.isCollapse" class="link-text">{{
              $t('common.apiDoc') || 'API文档'
            }}</span>
          </a>
        </template>
        <template #default>
          <div class="system-info-iframe-wrapper">
            <iframe :src="apiDocUrl" frameborder="0" class="api-iframe" />
            <div v-if="systemInfo.systemVersion" class="version-badge">
              v{{ systemInfo.systemVersion }}
            </div>
          </div>
        </template>
      </el-popover>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSettingStore } from '@/store/setting';
import { useSystemStore } from '@/store/system';
import Menu from './Menu.vue';
import { Document } from '@element-plus/icons-vue';

const settingStore = useSettingStore();
const systemStore = useSystemStore();

const systemInfo = computed(() => systemStore.getSystemInfo());

const showLogo = computed(() => settingStore.layoutMode !== 'classic');
const menuBgColor = computed(() => {
  if (settingStore.isDark) return '#1d1e1f';
  return settingStore.themeColor === 'dark' ? '#001529' : '#ffffff';
});
const menuTextColor = computed(() => {
  if (settingStore.isDark) return '#CFD3DC';
  return settingStore.themeColor === 'dark' ? '#fff' : '#303133';
});

const apiDocUrl = computed(() => {
  const isProd = import.meta.env.PROD;
  if (isProd) {
    return '/api/api-docs';
  }
  return 'http://localhost:6631/api/api-docs';
});

const popoverWidth = computed(() => {
  switch (settingStore.layoutMode) {
    case 'columns':
      return 400;
    case 'transverse':
      return 600;
    case 'classic':
      return 700;
    case 'vertical':
    default:
      return 800;
  }
});

const popoverPlacement = computed(() => {
  switch (settingStore.layoutMode) {
    case 'columns':
      return 'right';
    case 'transverse':
      return 'bottom';
    case 'classic':
      return 'bottom';
    case 'vertical':
    default:
      return 'right';
  }
});

const iframeHeight = computed(() => {
  switch (settingStore.layoutMode) {
    case 'columns':
      return '400px';
    case 'transverse':
      return '450px';
    case 'classic':
      return '500px';
    case 'vertical':
    default:
      return '500px';
  }
});

const openApiDoc = () => {
  window.open(apiDocUrl.value, '_blank');
};
</script>

<style scoped>
.sidebar-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: v-bind(menuBgColor);
  transition: width 0.3s;
  width: 260px;
  /* border-right: 1px solid #dcdfe6; */
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

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid rgba(128, 128, 128, 0.2);
  margin-top: auto;
}

.api-doc-link {
  display: flex;
  align-items: center;
  gap: 8px;
  color: v-bind(menuTextColor);
  text-decoration: none;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.api-doc-link:hover {
  background-color: rgba(64, 158, 255, 0.1);
}

.link-text {
  font-size: 14px;
  white-space: nowrap;
}

.sidebar-container.is-collapse .sidebar-footer {
  padding: 12px 0;
  display: flex;
  justify-content: center;
}

.sidebar-container.is-collapse .api-doc-link {
  flex-direction: column;
  gap: 4px;
  padding: 8px;
}

.system-info-iframe-wrapper {
  position: relative;
}

.api-iframe {
  width: 100%;
  height: v-bind(iframeHeight);
}

.version-badge {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background-color: rgba(64, 158, 255, 0.8);
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}
</style>
