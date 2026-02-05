<template>
  <el-drawer
    v-model="settingStore.debugDrawerVisible"
    title="页面数据调试"
    direction="rtl"
    size="400px"
    :with-header="true"
  >
    <el-collapse v-model="activeNames">
      <!-- Route Info -->
      <el-collapse-item title="路由信息 (Route)" name="1">
        <div class="debug-section">
          <div class="debug-item">
            <span class="label">Path:</span>
            <span class="value">{{ route.path }}</span>
          </div>
          <div class="debug-item">
            <span class="label">Name:</span>
            <span class="value">{{ route.name }}</span>
          </div>
          <div class="debug-item">
            <span class="label">Meta:</span>
            <pre class="json-box">{{ JSON.stringify(route.meta, null, 2) }}</pre>
          </div>
          <div class="debug-item" v-if="Object.keys(route.params).length">
            <span class="label">Params:</span>
            <pre class="json-box">{{ JSON.stringify(route.params, null, 2) }}</pre>
          </div>
          <div class="debug-item" v-if="Object.keys(route.query).length">
            <span class="label">Query:</span>
            <pre class="json-box">{{ JSON.stringify(route.query, null, 2) }}</pre>
          </div>
        </div>
      </el-collapse-item>

      <!-- User Info -->
      <el-collapse-item title="用户信息 (User)" name="2">
        <div class="debug-section">
          <pre class="json-box">{{ JSON.stringify(userStore.userInfo, null, 2) }}</pre>
        </div>
      </el-collapse-item>

      <!-- Settings Info -->
      <el-collapse-item title="系统设置 (Settings)" name="3">
        <div class="debug-section">
          <div class="debug-item">
            <span class="label">Layout:</span>
            <span class="value">{{ settingStore.layoutMode }}</span>
          </div>
          <div class="debug-item">
            <span class="label">Theme:</span>
            <span class="value">{{ settingStore.themeColor }}</span>
          </div>
        </div>
      </el-collapse-item>

      <!-- Dynamic Data Placeholder -->
      <!-- If we had a way to access current component data, we'd put it here. 
           For now, we can show something if it's a dynamic route. -->
      <el-collapse-item v-if="route.meta.schemaId" title="动态Schema (Dynamic)" name="4">
         <div class="debug-section">
           <div class="debug-item">
             <span class="label">SchemaID:</span>
             <span class="value">{{ route.meta.schemaId }}</span>
           </div>
           <!-- Maybe add a button to fetch schema detail? -->
         </div>
      </el-collapse-item>
    </el-collapse>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { useSettingStore } from '@/store/setting';
import { useUserStore } from '@/store/user';

const route = useRoute();
const settingStore = useSettingStore();
const userStore = useUserStore();

const activeNames = ref(['1']);
</script>

<style scoped>
.debug-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.debug-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.label {
  font-weight: bold;
  color: #606266;
}

.value {
  font-family: monospace;
  color: #409eff;
  word-break: break-all;
}

.json-box {
  background-color: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  color: #333;
  overflow-x: auto;
  margin: 0;
}
</style>
