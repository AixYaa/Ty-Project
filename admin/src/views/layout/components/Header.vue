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
      <!-- Fullscreen Toggle -->
      <div class="header-icon-btn" @click="toggleFullscreen">
        <el-tooltip
          :content="isFullscreen ? $t('header.exitFullscreen') : $t('header.fullscreen')"
          placement="bottom"
        >
          <el-icon :size="20"><FullScreen /></el-icon>
        </el-tooltip>
      </div>

      <!-- Language Switch -->
      <div class="header-icon-btn" @click="toggleLanguage">
        <el-tooltip :content="$t('header.switchLanguage')" placement="bottom">
          <span style="font-size: 16px; font-weight: bold">{{
            locale === 'zh-CN' ? '中' : 'En'
          }}</span>
        </el-tooltip>
      </div>

      <el-dropdown trigger="click">
        <span class="user-dropdown">
          <el-avatar :size="30" :src="userAvatar" :icon="UserFilled" class="user-avatar" />
          <span v-if="userStore.userInfo" class="username">
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
import {
  Fold,
  Expand,
  Setting,
  UserFilled,
  SwitchButton,
  ArrowDown,
  FullScreen
} from '@element-plus/icons-vue';
import { ElMessageBox } from 'element-plus';
import Menu from './Menu.vue';
import Breadcrumb from './Breadcrumb.vue';
import { useFullscreen } from '@vueuse/core';
import { useI18n } from 'vue-i18n';
import { loadLocaleMessages } from '@/locales';
import { ElMessage } from 'element-plus';

const emit = defineEmits(['openSettings']);
const userStore = useUserStore();
const settingStore = useSettingStore();
const { t, locale } = useI18n();
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();

const toggleLanguage = async () => {
  const newLocale = locale.value === 'zh-CN' ? 'en-US' : 'zh-CN';
  await loadLocaleMessages(newLocale);
  locale.value = newLocale;
  localStorage.setItem('language', newLocale);
  ElMessage.success(
    t('header.languageChanged', { lang: newLocale === 'zh-CN' ? '简体中文' : 'English' })
  );
};

const userAvatar = computed(() => {
  const avatar = userStore.userInfo?.avatar;
  if (!avatar) return '';
  if (typeof avatar === 'string') {
    try {
      const obj = JSON.parse(avatar);
      return obj.compressed || obj.original || '';
    } catch {
      return avatar;
    }
  }
  return avatar.compressed || avatar.original || '';
});

const showCollapse = computed(
  () =>
    ['vertical', 'classic', 'columns'].includes(settingStore.layoutMode) || settingStore.isMobile
);
const showLogo = computed(
  () => ['classic', 'transverse'].includes(settingStore.layoutMode) && !settingStore.isMobile
);
const showMenu = computed(() => settingStore.layoutMode === 'transverse' && !settingStore.isMobile);
const showBreadcrumb = computed(
  () => !['transverse'].includes(settingStore.layoutMode) && !settingStore.isMobile
); // Hide breadcrumb in transverse mode if space is tight, or keep it? Usually vertical layouts need it more. Let's keep it generally but maybe hide in transverse if it conflicts. actually, let's just show it unless user says otherwise, or maybe stick to common patterns. In transverse, menu is on top. Breadcrumb below? Or in content?

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
    type: 'warning'
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
  justify-content: center;
  height: 100%;
  padding: 0 10px;
  transition: background-color 0.3s;
  border-radius: 4px;
}

.setting-btn:hover {
  background-color: rgba(0, 0, 0, 0.025);
}

.header-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0 10px;
  cursor: pointer;
  transition: background-color 0.3s;
  border-radius: 4px;
}

.header-icon-btn:hover {
  background-color: rgba(0, 0, 0, 0.025);
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
