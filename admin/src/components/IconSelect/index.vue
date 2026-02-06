<template>
  <el-select
    :model-value="modelValue"
    filterable
    placeholder="请选择图标"
    clearable
    class="icon-select"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #prefix>
      <el-icon v-if="modelValue" class="selected-icon">
        <component :is="modelValue" />
      </el-icon>
    </template>
    <el-option v-for="name in iconNames" :key="name" :label="name" :value="name">
      <div class="icon-option">
        <el-icon>
          <component :is="name" />
        </el-icon>
        <span>{{ name }}</span>
      </div>
    </el-option>
  </el-select>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';

defineProps<{
  modelValue: string;
}>();

const emit = defineEmits(['update:modelValue']);

const iconNames = ref(Object.keys(ElementPlusIconsVue));
</script>

<style scoped>
.icon-option {
  display: flex;
  align-items: center;
  gap: 8px;
}
.selected-icon {
  margin-right: 5px;
}
</style>
