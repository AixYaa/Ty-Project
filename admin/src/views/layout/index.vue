<template>
  <div class="app-layout" :class="layoutClasses">
    <!-- Classic Layout -->
    <el-container v-if="isClassic" class="main-container" direction="vertical">
      <el-header class="header">
        <Header @open-settings="openSettings" />
        <TagsView v-if="settingStore.showTagsView" />
      </el-header>
      <el-container class="classic-content">
        <el-drawer
          v-if="settingStore.isMobile"
          v-model="settingStore.mobileDrawerVisible"
          direction="ltr"
          :with-header="false"
          size="260px"
          class="mobile-sidebar-drawer"
        >
          <Sidebar />
        </el-drawer>
        <el-aside v-if="!settingStore.isMobile" :width="sidebarWidth" class="aside">
          <Sidebar />
        </el-aside>
        <el-main class="main-content">
          <router-view v-slot="{ Component, route }">
            <transition name="fade-transform" mode="out-in">
              <keep-alive :include="tagsViewStore.cachedViews">
                <component :is="getComponent(Component, route)" :key="route.fullPath" />
              </keep-alive>
            </transition>
          </router-view>
        </el-main>
      </el-container>
    </el-container>

    <!-- Vertical / Columns / Transverse Layout -->
    <el-container v-else class="main-container">
      <el-drawer
        v-if="settingStore.isMobile"
        v-model="settingStore.mobileDrawerVisible"
        direction="ltr"
        :with-header="false"
        size="260px"
        class="mobile-sidebar-drawer"
      >
        <Sidebar />
      </el-drawer>

      <el-aside v-if="isVertical && !settingStore.isMobile" :width="sidebarWidth" class="aside">
        <Sidebar />
      </el-aside>

      <el-aside v-if="isColumns && !settingStore.isMobile" width="260px" class="aside">
        <ColumnsSidebar />
      </el-aside>

      <el-container class="is-vertical">
        <el-header class="header">
          <Header @open-settings="openSettings" />
          <TagsView v-if="settingStore.showTagsView" />
        </el-header>

        <el-main class="main-content">
          <router-view v-slot="{ Component, route }">
            <transition name="fade-transform" mode="out-in">
              <keep-alive :include="tagsViewStore.cachedViews">
                <component :is="getComponent(Component, route)" :key="route.fullPath" />
              </keep-alive>
            </transition>
          </router-view>
        </el-main>
      </el-container>
    </el-container>

    <Settings ref="settingsRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, h } from 'vue';
import Sidebar from './components/Sidebar.vue';
import ColumnsSidebar from './components/ColumnsSidebar.vue';
import Header from './components/Header.vue';
import TagsView from './components/TagsView/index.vue';
import Settings from './components/Settings/index.vue';
import { useSettingStore } from '@/store/setting';
import { useWatermark } from '@/hooks/useWatermark';
import { useResponsive } from '@/hooks/useResponsive';
import { useTagsViewStore } from '@/store/tagsView';
import type { RouteLocationNormalizedLoaded } from 'vue-router';

const settingStore = useSettingStore();
const tagsViewStore = useTagsViewStore();
const settingsRef = ref();
const { setWatermark, clear } = useWatermark();
useResponsive();

const isVertical = computed(() => settingStore.layoutMode === 'vertical');
const isClassic = computed(() => settingStore.layoutMode === 'classic');
const isTransverse = computed(() => settingStore.layoutMode === 'transverse');
const isColumns = computed(() => settingStore.layoutMode === 'columns');

const sidebarWidth = computed(() => (settingStore.isCollapse ? '64px' : '260px'));

const layoutClasses = computed(() => ({
  'layout-vertical': isVertical.value,
  'layout-classic': isClassic.value,
  'layout-transverse': isTransverse.value,
  'layout-columns': isColumns.value
}));

const openSettings = () => {
  settingsRef.value?.open();
};

// Watermark Effect
watch(
  () => [settingStore.showWatermark, settingStore.watermarkText, settingStore.watermarkShowTime],
  ([show, text, showTime]) => {
    if (show) {
      setWatermark(text as string, showTime as boolean);
    } else {
      clear();
    }
  },
  { immediate: true }
);

onMounted(() => {
  // Init theme
  settingStore.setThemeColor(settingStore.themeColor);
});

// KeepAlive Component Wrapper
const wrapperMap = new Map<string, any>();
const getComponent = (component: any, route: RouteLocationNormalizedLoaded) => {
  if (!component) return null;
  const name = route.name as string;
  if (!name) return component;

  if (wrapperMap.has(name)) {
    return wrapperMap.get(name);
  }

  // Create wrapper with route name to ensure KeepAlive works
  const wrapper = {
    name: name,
    render() {
      return h(component);
    }
  };
  wrapperMap.set(name, wrapper);
  return wrapper;
};
</script>

<style scoped>
.app-layout {
  height: 100vh;
  width: 100vw;
  display: flex;
  overflow: hidden;
}

.main-container {
  height: 100%;
  width: 100%;
  display: flex;
}

.is-vertical {
  flex-direction: column;
}

.classic-content {
  display: flex;
  height: calc(100% - 60px);
  overflow: hidden;
}

.aside {
  transition: width 0.3s;
  overflow: hidden;
  box-shadow: 2px 0 8px 0 rgba(29, 35, 41, 0.05);
  z-index: 10;
}

.header {
  padding: 0;
  height: auto;
}

.main-content {
  background-color: #f0f2f5;
  padding: 20px;
  overflow-x: hidden;
}

/* Transitions */
.fade-transform-leave-active,
.fade-transform-enter-active {
  transition: all 0.5s;
}

.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
