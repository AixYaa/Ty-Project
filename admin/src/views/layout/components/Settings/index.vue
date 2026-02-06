<template>
  <el-drawer v-model="visible" title="系统配置" size="300px" append-to-body>
    <div class="setting-item">
      <div class="label-row">
        <span class="label">暗黑模式</span>
        <el-switch :model-value="settingStore.isDark" @change="settingStore.toggleDark" />
      </div>
    </div>

    <div class="setting-item">
      <div class="label-row">
        <span class="label">语言 (Language)</span>
        <el-dropdown @command="handleLanguageChange">
          <span class="el-dropdown-link">
            {{ locale === 'zh-CN' ? '简体中文' : 'English' }}
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="zh-CN" :disabled="locale === 'zh-CN'"
                >简体中文</el-dropdown-item
              >
              <el-dropdown-item command="en-US" :disabled="locale === 'en-US'"
                >English</el-dropdown-item
              >
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <div class="setting-item">
      <span class="label">主题色</span>
      <div class="theme-colors">
        <div
          v-for="color in themeColors"
          :key="color.value"
          class="color-block"
          :style="{ backgroundColor: color.hex }"
          @click="settingStore.setThemeColor(color.value)"
        >
          <el-icon v-if="settingStore.themeColor === color.value" color="#fff"><Check /></el-icon>
        </div>
      </div>
    </div>

    <el-divider />

    <div class="setting-item">
      <span class="label">布局模式</span>
      <div class="layout-box">
        <el-tooltip content="左侧菜单模式" placement="top" :show-after="200">
          <div
            class="layout-item item-vertical"
            :class="{ 'is-active': settingStore.layoutMode === 'vertical' }"
            @click="settingStore.setLayoutMode('vertical')"
          >
            <div class="layout-dark"></div>
            <div class="layout-container">
              <div class="layout-light"></div>
              <div class="layout-content"></div>
            </div>
            <el-icon v-if="settingStore.layoutMode === 'vertical'" class="active-icon"
              ><CircleCheckFilled
            /></el-icon>
          </div>
        </el-tooltip>

        <el-tooltip content="经典模式" placement="top" :show-after="200">
          <div
            class="layout-item item-classic"
            :class="{ 'is-active': settingStore.layoutMode === 'classic' }"
            @click="settingStore.setLayoutMode('classic')"
          >
            <div class="layout-dark"></div>
            <div class="layout-container">
              <div class="layout-light"></div>
              <div class="layout-content"></div>
            </div>
            <el-icon v-if="settingStore.layoutMode === 'classic'" class="active-icon"
              ><CircleCheckFilled
            /></el-icon>
          </div>
        </el-tooltip>

        <el-tooltip content="顶部菜单模式" placement="top" :show-after="200">
          <div
            class="layout-item item-transverse"
            :class="{ 'is-active': settingStore.layoutMode === 'transverse' }"
            @click="settingStore.setLayoutMode('transverse')"
          >
            <div class="layout-dark"></div>
            <div class="layout-content"></div>
            <el-icon v-if="settingStore.layoutMode === 'transverse'" class="active-icon"
              ><CircleCheckFilled
            /></el-icon>
          </div>
        </el-tooltip>

        <el-tooltip content="分栏模式" placement="top" :show-after="200">
          <div
            class="layout-item item-columns"
            :class="{ 'is-active': settingStore.layoutMode === 'columns' }"
            @click="settingStore.setLayoutMode('columns')"
          >
            <div class="layout-dark"></div>
            <div class="layout-light"></div>
            <div class="layout-content"></div>
            <el-icon v-if="settingStore.layoutMode === 'columns'" class="active-icon"
              ><CircleCheckFilled
            /></el-icon>
          </div>
        </el-tooltip>
      </div>
    </div>

    <!-- Watermark Settings -->
    <div class="setting-item">
      <div class="label">水印配置</div>
      <el-switch v-model="settingStore.showWatermark" active-text="开启水印" />
      <el-input
        v-if="settingStore.showWatermark"
        v-model="settingStore.watermarkText"
        placeholder="水印文本"
        style="margin-top: 10px"
      />
      <el-switch
        v-if="settingStore.showWatermark"
        v-model="settingStore.watermarkShowTime"
        active-text="显示时间"
        style="margin-top: 10px"
      />
    </div>

    <el-divider />

    <div class="setting-item">
      <div class="label">界面配置</div>
      <el-switch v-model="settingStore.showTagsView" active-text="多页签 (TagsView)" />

      <div v-if="settingStore.showTagsView" class="label-row" style="margin-top: 15px">
        <span class="label" style="margin-bottom: 0">页签风格</span>
        <el-select v-model="settingStore.tagsViewStyle" size="small" style="width: 100px">
          <el-option label="谷歌" value="google" />
          <el-option label="按钮" value="button" />
          <el-option label="滑块" value="smooth" />
        </el-select>
      </div>
    </div>

    <!-- Debug Settings (Only for Admin) -->
    <div v-if="userStore.userInfo?.username === 'admin'" class="setting-item">
      <div class="label">调试配置</div>
      <el-switch v-model="settingStore.showDebugDrawer" active-text="开启调试抽屉" />
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useSettingStore, type ThemeColor } from '@/store/setting';
import { useUserStore } from '@/store/user';
import { Check, CircleCheckFilled, ArrowDown } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';

const visible = ref(false);
const settingStore = useSettingStore();
const userStore = useUserStore();
const { locale } = useI18n();

const handleLanguageChange = (lang: string) => {
  locale.value = lang;
  localStorage.setItem('language', lang);
  ElMessage.success('Switch Language Success');
};

const themeColors: { value: ThemeColor; hex: string }[] = [
  { value: 'default', hex: '#409EFF' },
  { value: 'dark', hex: '#000000' },
  { value: 'green', hex: '#67C23A' },
  { value: 'red', hex: '#F56C6C' },
  { value: 'purple', hex: '#909399' }
];

const open = () => {
  visible.value = true;
};

defineExpose({ open });
</script>

<style scoped>
.setting-item {
  margin-bottom: 24px;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-size: 14px;
  color: var(--el-text-color-primary);
  margin-bottom: 12px;
  display: block;
}
.theme-colors {
  display: flex;
  gap: 10px;
}
.color-block {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Layout Box Grid */
.layout-box {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  padding: 12px 0;
}

.layout-item {
  position: relative;
  box-sizing: border-box;
  width: 100px;
  height: 70px;
  padding: 6px;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 5px;
  box-shadow: 0 0 5px #ccc;
  background-color: #f0f2f5;
  margin-bottom: 20px;
  transition: all 0.2s;
}

.layout-item:hover {
  transform: scale(1.05);
  box-shadow: 0 0 5px var(--el-color-primary);
}

.layout-item.is-active {
  border: 2px solid var(--el-color-primary);
}

.active-icon {
  position: absolute;
  right: 10px;
  bottom: 10px;
  color: var(--el-color-primary);
  font-size: 16px;
  font-weight: bold;
}

/* Common Parts */
.layout-dark {
  background-color: #273352;
  border-radius: 3px;
}
.layout-light {
  background-color: #fff;
  border-radius: 3px;
}
.layout-content {
  background-color: #f0f2f5;
  border: 1px dashed #bbb;
  border-radius: 3px;
}

/* Vertical */
.item-vertical {
  display: flex;
  justify-content: space-between;
}
.item-vertical .layout-dark {
  width: 20%;
  height: 100%;
}
.item-vertical .layout-container {
  width: 72%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.item-vertical .layout-light {
  height: 20%;
}
.item-vertical .layout-content {
  height: 70%;
}

/* Classic */
.item-classic {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.item-classic .layout-dark {
  width: 100%;
  height: 22%;
}
.item-classic .layout-container {
  height: 70%;
  display: flex;
  justify-content: space-between;
}
.item-classic .layout-light {
  width: 20%;
  height: 100%;
  background-color: #273352;
}
.item-classic .layout-content {
  width: 72%;
  height: 100%;
}

/* Transverse */
.item-transverse {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.item-transverse .layout-dark {
  width: 100%;
  height: 20%;
}
.item-transverse .layout-content {
  height: 72%;
}

/* Columns */
.item-columns {
  display: flex;
  justify-content: space-between;
}
.item-columns .layout-dark {
  width: 14%;
  height: 100%;
}
.item-columns .layout-light {
  width: 17%;
  height: 100%;
  background-color: #fff;
}
.item-columns .layout-content {
  width: 60%;
  height: 100%;
}
</style>
