<template>
  <div class="dashboard-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>{{ $t('system.welcome') }}</span>
        </div>
      </template>
      <div class="welcome-content">
        <h1>Hello, {{ userStore.userInfo?.name || userStore.userInfo?.username || 'Admin' }}</h1>
        <p>{{ $t('dashboard.overview') }}</p>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/store/user';

const userStore = useUserStore();
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
}

.welcome-content {
  text-align: center;
  padding: 40px 0;
}

h1 {
  color: #409EFF;
  margin-bottom: 20px;
}
</style>
