<template>
  <div class="app-layout" :class="layoutClasses">
    <el-container class="main-container">
      <!-- Vertical Mode: Sidebar on left -->
      <el-aside v-if="isVertical" :width="sidebarWidth" class="aside">
        <Sidebar />
      </el-aside>

      <el-container>
        <el-header class="header" :height="isHorizontal ? '60px' : 'auto'">
          <Header @openSettings="openSettings" />
        </el-header>
        
        <!-- Horizontal Mode: Sidebar (Menu) in Header area or below it? 
             Actually, for horizontal mode, the menu usually goes into the header.
             For simplicity, I will keep Sidebar component but style it differently or hide it if Header has menu.
             But the requirement says "Sidebar becomes Header Nav".
             Let's adjust Sidebar to support horizontal mode if possible, or just put Sidebar in Header.
             For now, let's stick to Vertical structure for Sidebar, and if Horizontal, we might need to adjust.
             
             Wait, standard Element Plus layout:
             Vertical: Aside + (Header + Main)
             Horizontal: Header (with Menu) + Main
             
             I will just hide Sidebar in Aside and maybe inject it into Header or render a horizontal menu in Header.
             Let's modify Header to support Horizontal Menu if needed, or keep it simple.
             If "Horizontal", maybe we hide Aside and put Sidebar content in Header?
             Let's try to keep it simple first: Vertical Layout is standard.
             If Horizontal, I will hide Aside and show a horizontal menu in Header.
        -->
        <el-main class="main-content">
           <router-view v-slot="{ Component, route }">
              <transition name="fade-transform" mode="out-in">
                <component :is="Component" :key="route.fullPath" />
              </transition>
           </router-view>
        </el-main>
      </el-container>
    </el-container>

    <Settings ref="settingsRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import Sidebar from './components/Sidebar.vue';
import Header from './components/Header.vue';
import Settings from './components/Settings/index.vue';
import { useSettingStore } from '@/store/setting';
import { useWatermark } from '@/hooks/useWatermark';

const settingStore = useSettingStore();
const settingsRef = ref();
const { setWatermark, clear } = useWatermark();

const isVertical = computed(() => settingStore.layoutMode === 'vertical');
const isHorizontal = computed(() => settingStore.layoutMode === 'horizontal');
const sidebarWidth = computed(() => settingStore.isCollapse ? '64px' : '210px');

const layoutClasses = computed(() => ({
  'layout-vertical': isVertical.value,
  'layout-horizontal': isHorizontal.value
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
</script>

<style scoped>
.app-layout {
  height: 100vh;
  width: 100%;
}

.main-container {
  height: 100%;
}

.aside {
  transition: width 0.3s;
  overflow: hidden;
  box-shadow: 2px 0 8px 0 rgba(29, 35, 41, 0.05);
  z-index: 10;
}

.header {
  padding: 0;
  height: 60px;
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
