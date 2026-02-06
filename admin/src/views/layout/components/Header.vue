<template>
  <div class="header-container">
    <div class="header-left">
      <div v-if="showCollapse" class="collapse-btn" @click="toggleSidebar">
        <el-icon :size="20">
          <component :is="settingStore.isCollapse && !settingStore.isMobile ? Expand : Fold" />
        </el-icon>
      </div>
      
      <div v-if="showLogo" class="logo">
        {{ $t('system.title') }}
      </div>

      <Breadcrumb v-if="showBreadcrumb" />

      <!-- Horizontal Menu -->
      <div v-if="showMenu" class="horizontal-menu-wrapper">
        <Menu mode="horizontal" />
      </div>
    </div>
    <div class="header-right">
      <el-dropdown trigger="click">
        <span class="user-dropdown">
          <el-avatar 
            :size="30" 
            :src="userStore.userInfo?.avatar || ''"
            :icon="UserFilled"
            class="user-avatar" 
          />
          <span class="username" v-if="userStore.userInfo">
            {{ userStore.userInfo.name || userStore.userInfo.username }}
          </span>
          <el-icon class="el-icon--right"><arrow-down /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="handleLogout">
              <el-icon><SwitchButton /></el-icon>{{ $t('header.logout') }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      
      <div class="setting-btn" @click="emit('openSettings')">
        <el-icon :size="20"><Setting /></el-icon>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useUserStore } from '@/store/user';
import { useSettingStore } from '@/store/setting';
import { Fold, Expand, Setting, UserFilled, SwitchButton, ArrowDown } from '@element-plus/icons-vue';
import { ElMessageBox } from 'element-plus';
import Menu from './Menu.vue';
import Breadcrumb from './Breadcrumb.vue';
import { useI18n } from 'vue-i18n';

const emit = defineEmits(['openSettings']);
const userStore = useUserStore();
const settingStore = useSettingStore();
const { t } = useI18n();

const showCollapse = computed(() => ['vertical', 'classic', 'columns'].includes(settingStore.layoutMode) || settingStore.isMobile);
const showLogo = computed(() => ['classic', 'transverse'].includes(settingStore.layoutMode) && !settingStore.isMobile);
const showMenu = computed(() => settingStore.layoutMode === 'transverse' && !settingStore.isMobile);
const showBreadcrumb = computed(() => !['transverse'].includes(settingStore.layoutMode) && !settingStore.isMobile); // Hide breadcrumb in transverse mode if space is tight, or keep it? Usually vertical layouts need it more. Let's keep it generally but maybe hide in transverse if it conflicts. actually, let's just show it unless user says otherwise, or maybe stick to common patterns. In transverse, menu is on top. Breadcrumb below? Or in content?

const toggleSidebar = () => {
  if (settingStore.isMobile) {
    settingStore.toggleMobileDrawer();
  } else {
    settingStore.toggleCollapse();
  }
};

// Usually breadcrumb is in header for vertical layouts.
// For now I will show it when not in transverse mode, as transverse usually has the menu there.


const handleLogout = () => {
  ElMessageBox.confirm(t('header.confirmLogout'), t('header.tip'), {
    confirmButtonText: t('common.confirm'),
    cancelButtonText: t('common.cancel'),
    type: 'warning',
  })
    .then(async () => {
      await userStore.logout();
      // Force reload to clear all states (router, store, etc.)
      window.location.href = '/login';
    })
    .catch(() => {
      // cancel
    });
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

.user-dropdown {
  display: flex;
  align-items: center;
  cursor: pointer;
  gap: 8px;
}

.username {
  font-size: 14px;
  color: #606266;
}

@media screen and (max-width: 768px) {
  .header-container {
    padding: 0 10px;
  }

  .collapse-btn {
    margin-right: 10px;
  }

  .logo {
    margin-right: 10px;
  }
}
</style>
