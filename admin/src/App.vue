<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
// @ts-expect-error element-plus locale types
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';
// @ts-expect-error element-plus locale types
import en from 'element-plus/dist/locale/en.mjs';

const { locale } = useI18n();

const elLocale = computed(() => {
  return locale.value === 'zh-CN' ? zhCn : en;
});
</script>

<template>
  <el-config-provider :locale="elLocale">
    <router-view />
  </el-config-provider>
</template>

<style>
/* 全局样式可以放在这里，或者保留 style.css */
body {
  margin: 0;
  padding: 0;
}
#app {
  height: 100vh;
  width: 100vw;
}
</style>
