<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
// @ts-expect-error element-plus locale types
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';
// @ts-expect-error element-plus locale types
import en from 'element-plus/dist/locale/en.mjs';
import { useSystemStore } from '@/store/system';
import { ElMessage } from 'element-plus';
import { Loading } from '@element-plus/icons-vue';

const { locale } = useI18n();
const route = useRoute();
const systemStore = useSystemStore();
const isChecking = ref(true);

const elLocale = computed(() => {
  return locale.value === 'zh-CN' ? zhCn : en;
});

const maintenanceStatus = computed(() => systemStore.getMaintenanceStatus());

const isLoginPage = computed(() => {
  return route.path === '/login' || route.path === '/auth/login';
});

onMounted(async () => {
  try {
    await systemStore.loadSystemInfo();
  } catch (e) {
    console.error('Failed to load system info:', e);
  }
  isChecking.value = false;

  if (maintenanceStatus.value.enabled && !isLoginPage.value) {
    ElMessage.warning(maintenanceStatus.value.message);
  }
});
</script>

<template>
  <el-config-provider :locale="elLocale">
    <router-view v-if="!isChecking" />
    <div v-else class="maintenance-loading">
      <el-icon class="is-loading" :size="32"><Loading /></el-icon>
    </div>
  </el-config-provider>
</template>

<style scoped>
.maintenance-loading {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fa;
}

.maintenance-mode {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.maintenance-content {
  text-align: center;
  padding: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  max-width: 500px;
}

.maintenance-content h1 {
  margin-bottom: 20px;
  font-size: 32px;
}

.maintenance-content p {
  font-size: 18px;
  margin-bottom: 12px;
}

.maintenance-hint {
  font-size: 14px !important;
  opacity: 0.8;
}

body {
  margin: 0;
  padding: 0;
}
#app {
  height: 100vh;
  width: 100vw;
}
</style>
