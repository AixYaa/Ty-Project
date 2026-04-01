<template>
  <div class="app-footer">
    <div class="footer-content">
      <span class="copyright">{{ copyrightInfo.copyright }}</span>
      <span v-if="copyrightInfo.icpLicense" class="icp-license">
        <a href="https://beian.miit.gov.cn/" target="_blank">{{ copyrightInfo.icpLicense }}</a>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSystemStore } from '@/store/system';

const systemStore = useSystemStore();

const copyrightInfo = computed(() => systemStore.getCopyrightInfo());
</script>

<style scoped>
.app-footer {
  height: 40px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 1px solid rgba(128, 128, 128, 0.2);
  background-color: rgba(0, 0, 0, 0.02);
  font-size: 12px;
  color: #909399;
}

.footer-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.copyright {
  white-space: nowrap;
}

.icp-license {
  white-space: nowrap;
}

.icp-license a {
  color: #909399;
  text-decoration: none;
}

.icp-license a:hover {
  color: #409eff;
}
</style>
