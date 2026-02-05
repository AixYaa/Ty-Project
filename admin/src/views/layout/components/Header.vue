<template>
  <div class="header-container">
    <div class="header-left">
      <div v-if="isVertical" class="collapse-btn" @click="settingStore.toggleCollapse">
        <el-icon :size="20">
          <component :is="settingStore.isCollapse ? Expand : Fold" />
        </el-icon>
      </div>
      
      <div v-if="!isVertical" class="logo">
        管理平台
      </div>

      <!-- Horizontal Menu -->
      <div v-if="!isVertical" class="horizontal-menu-wrapper">
        <Menu mode="horizontal" />
      </div>
    </div>
    <div class="header-right">
      <span class="username" v-if="userStore.userInfo">
        {{ userStore.userInfo.name || userStore.userInfo.username }}
      </span>
      <el-button type="primary" link @click="handleLogout">退出登录</el-button>
      <div class="setting-btn" @click="emit('openSettings')">
        <el-icon :size="20"><Setting /></el-icon>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/store/user';
import { useSettingStore } from '@/store/setting';
import { Fold, Expand, Setting } from '@element-plus/icons-vue';
import Menu from './Menu.vue';

const emit = defineEmits(['openSettings']);
const router = useRouter();
const userStore = useUserStore();
const settingStore = useSettingStore();

const isVertical = computed(() => settingStore.layoutMode === 'vertical');

const handleLogout = async () => {
  await userStore.logout();
  router.push('/login');
};
</script>

<style scoped>
.header-container {
  height: 60px;
  background-color: #fff;
  border-bottom: 1px solid #dcdfe6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
  flex: 1;
  height: 100%;
}

.logo {
  font-size: 20px;
  font-weight: bold;
  margin-right: 20px;
  white-space: nowrap;
}

.horizontal-menu-wrapper {
  flex: 1;
  height: 100%;
}

.collapse-btn {
  cursor: pointer;
  margin-right: 20px;
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.setting-btn {
  cursor: pointer;
  display: flex;
  align-items: center;
}

.username {
  font-size: 14px;
  color: #606266;
}
</style>
