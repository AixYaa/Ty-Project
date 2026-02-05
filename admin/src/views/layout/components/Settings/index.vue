<template>
  <el-drawer
    v-model="visible"
    title="系统配置"
    size="300px"
    append-to-body
  >
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
      <el-select v-model="settingStore.layoutMode" @change="settingStore.setLayoutMode">
        <el-option label="纵向 (Vertical)" value="vertical" />
        <el-option label="横向 (Horizontal)" value="horizontal" />
      </el-select>
    </div>

    <div class="setting-item">
      <span class="label">显示水印</span>
      <el-switch v-model="settingStore.showWatermark" @change="(val) => settingStore.setWatermark(val as boolean)" />
    </div>
    
    <div class="setting-item" v-if="settingStore.showWatermark">
      <span class="label">水印内容</span>
      <el-input v-model="settingStore.watermarkText" @input="(val) => settingStore.setWatermark(true, val as string)" />
    </div>

    <div class="setting-item" v-if="settingStore.showWatermark">
      <span class="label">显示时间</span>
      <el-switch v-model="settingStore.watermarkShowTime" @change="(val) => settingStore.setWatermark(true, undefined, val as boolean)" />
    </div>

  </el-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useSettingStore, type ThemeColor } from '@/store/setting';
import { Check } from '@element-plus/icons-vue';

const visible = ref(false);
const settingStore = useSettingStore();

const themeColors: { value: ThemeColor; hex: string }[] = [
  { value: 'default', hex: '#409EFF' },
  { value: 'dark', hex: '#000000' },
  { value: 'green', hex: '#67C23A' },
  { value: 'red', hex: '#F56C6C' },
  { value: 'purple', hex: '#909399' },
];

const open = () => {
  visible.value = true;
};

defineExpose({ open });
</script>

<style scoped>
.setting-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
  gap: 10px;
}
.label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
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
</style>
