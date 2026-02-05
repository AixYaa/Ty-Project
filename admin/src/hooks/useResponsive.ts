import { onMounted, onUnmounted, onBeforeMount } from 'vue';
import { useSettingStore } from '@/store/setting';

export const useResponsive = () => {
  const settingStore = useSettingStore();

  const resizeHandler = () => {
    const width = document.body.clientWidth;
    const isMobile = width < 992; // Bootstrap lg breakpoint or 768 for tablet? 992 is safer for sidebar layouts.
    
    settingStore.setIsMobile(isMobile);
    
    if (isMobile) {
      // Auto close sidebar logic if needed, or just rely on layout change
      // settingStore.isCollapse = true; // Not needed if we hide sidebar
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
