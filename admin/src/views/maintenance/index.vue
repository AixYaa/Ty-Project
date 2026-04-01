<template>
  <div class="maintenance-page">
    <div class="load"></div>
    <h1>{{ message }}</h1>
    <p>正在重构代码、优化架构<br />打磨细节，只为更好的体验</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const message = ref('系统升级维护中');
let checkInterval: ReturnType<typeof setInterval> | null = null;

const checkMaintenanceStatus = async () => {
  try {
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const rootApi = baseUrl.replace(/\/admin$/, '');
    const response = await fetch(`${rootApi}/common/maintenance-status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const result = await response.json();
      if (result.data && result.data.enabled === false) {
        if (checkInterval) {
          clearInterval(checkInterval);
          checkInterval = null;
        }
        window.location.href = '/#/login';
      }
    }
  } catch (error) {
    console.error('Failed to check maintenance status:', error);
  }
};

onMounted(() => {
  checkMaintenanceStatus();
  checkInterval = setInterval(checkMaintenanceStatus, 10000);
});

onUnmounted(() => {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
});
</script>

<style scoped>
html,
body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  height: 100%;
}

.maintenance-page {
  min-height: 100vh;
  margin: 0;
  background: #0a0e17;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: monospace, sans-serif;
  color: #8ee7ff;
  text-align: center;
  overflow: hidden;
}

.load {
  width: 80px;
  height: 80px;
  border: 4px solid #1f2937;
  border-top-color: #4fc3f7;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 30px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

h1 {
  font-size: 32px;
  font-weight: normal;
  margin: 0 0 15px;
  color: #8ee7ff;
}

p {
  font-size: 16px;
  opacity: 0.8;
  line-height: 1.8;
  max-width: 450px;
  margin: 0;
}
</style>
