import { onMounted, onUnmounted, onBeforeMount } from 'vue';
import { useSettingStore } from '@/store/setting';

export const useResponsive = () => {
  const settingStore = useSettingStore();

  const resizeHandler = () => {
    const width = document.body.clientWidth;
    const isMobile = width < 992; 
    
    settingStore.setIsMobile(isMobile);
    
    // Auto collapse sidebar on tablet/small laptop screens (992px - 1200px)
    if (!isMobile) {
      if (width < 1200) {
        if (!settingStore.isCollapse) settingStore.toggleCollapse();
      } else {
        if (settingStore.isCollapse) settingStore.toggleCollapse();
      }
    } else {
       // On mobile, close sidebar drawer
       settingStore.setMobileDrawerVisible(false);
    }
  };

  onBeforeMount(() => {
    resizeHandler();
  });

  onMounted(() => {
    window.addEventListener('resize', resizeHandler);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', resizeHandler);
  });
};
