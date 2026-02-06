import { defineStore } from 'pinia';
import { ref } from 'vue';

export type LayoutMode = 'vertical' | 'classic' | 'transverse' | 'columns';
export type ThemeColor = 'default' | 'dark' | 'blue' | 'green' | 'red' | 'purple';
export type TagsViewStyle = 'google' | 'button' | 'smooth';

export const useSettingStore = defineStore('setting', () => {
  // Layout Config
  const isCollapse = ref(false);
  const layoutMode = ref<LayoutMode>('vertical');
  const isMobile = ref(false);
  const mobileDrawerVisible = ref(false);
  
  // Theme Config
  const themeColor = ref<ThemeColor>('default');
  const primaryColor = ref('#409EFF');
  const isDark = ref(false); // Dark mode state
  
  // Feature Config
  const showWatermark = ref(false);
  const watermarkText = ref('Aix Admin');
  const watermarkShowTime = ref(false);
  const showTagsView = ref(true);
  const tagsViewStyle = ref<TagsViewStyle>('button');

  // Debug Config
  const showDebugDrawer = ref(false);
  const debugDrawerVisible = ref(false); // Controls the drawer open/close state

  // Actions
  const toggleCollapse = () => {
    isCollapse.value = !isCollapse.value;
  };

  const setIsMobile = (val: boolean) => {
    isMobile.value = val;
  };

  const setMobileDrawerVisible = (val: boolean) => {
    mobileDrawerVisible.value = val;
  };

  const toggleMobileDrawer = () => {
    mobileDrawerVisible.value = !mobileDrawerVisible.value;
  };

  const setLayoutMode = (mode: LayoutMode) => {
    layoutMode.value = mode;
  };

  const setThemeColor = (color: ThemeColor) => {
    themeColor.value = color;
    // You might want to map theme names to hex colors here or in a separate util
    switch (color) {
      case 'default': primaryColor.value = '#409EFF'; break;
      case 'dark': primaryColor.value = '#409EFF'; break; // Dark mode usually affects background
      case 'blue': primaryColor.value = '#409EFF'; break;
      case 'green': primaryColor.value = '#67C23A'; break;
      case 'red': primaryColor.value = '#F56C6C'; break;
      case 'purple': primaryColor.value = '#909399'; break; // Example
    }
    updateTheme();
  };

  const setWatermark = (show: boolean, text?: string, showTime?: boolean) => {
    showWatermark.value = show;
    if (text) watermarkText.value = text;
    if (showTime !== undefined) watermarkShowTime.value = showTime;
  };

  const setTagsView = (show: boolean) => {
    showTagsView.value = show;
  };

  const setTagsViewStyle = (style: TagsViewStyle) => {
    tagsViewStyle.value = style;
  };

  const setDebugDrawer = (show: boolean) => {
    showDebugDrawer.value = show;
  };

  const toggleDebugDrawer = () => {
    debugDrawerVisible.value = !debugDrawerVisible.value;
  };

  const toggleDark = () => {
    isDark.value = !isDark.value;
    updateTheme();
  };

  // Helper to update CSS variables
  const updateTheme = () => {
    const el = document.documentElement;
    el.style.setProperty('--el-color-primary', primaryColor.value);
    
    // Toggle dark class on html element
    if (isDark.value) {
      el.classList.add('dark');
    } else {
      el.classList.remove('dark');
    }
  };

  return {
    isCollapse,
    layoutMode,
    isMobile,
    isDark,
    mobileDrawerVisible,
    themeColor,
    primaryColor,
    showWatermark,
    watermarkText,
    watermarkShowTime,
    showTagsView,
    tagsViewStyle,
    showDebugDrawer,
    debugDrawerVisible,
    toggleCollapse,
    setIsMobile,
    setMobileDrawerVisible,
    toggleMobileDrawer,
    setLayoutMode,
    setThemeColor,
    setWatermark,
    setTagsView,
    setTagsViewStyle,
    setDebugDrawer,
    toggleDebugDrawer,
    toggleDark
  };
}, {
  persist: {
    pick: ['layoutMode', 'themeColor', 'primaryColor', 'isDark', 'showWatermark', 'watermarkText', 'showTagsView', 'tagsViewStyle']
  }
});
