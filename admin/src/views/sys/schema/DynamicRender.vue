<template>
  <div v-loading="loading" class="schema-renderer">
    <component :is="dynamicComponent" v-if="dynamicComponent" />
    <el-empty v-else-if="!loading" description="暂无内容或加载失败" />

    <!-- Edit Schema Button -->
    <el-button
      v-if="currentSchemaId"
      type="primary"
      circle
      size="large"
      class="edit-schema-btn"
      @click="openEditDialog"
    >
      <el-icon><Edit /></el-icon>
    </el-button>

    <!-- Edit Schema Dialog -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑架构 (Schema)"
      width="80%"
      :close-on-click-modal="false"
      destroy-on-close
      class="schema-edit-dialog"
    >
      <el-tabs v-model="activeTab">
        <el-tab-pane label="Template" name="template">
          <template #label>
            Template
            <el-badge
              :value="errors.template.length"
              class="error-badge"
              v-if="errors.template.length > 0"
            />
          </template>
          <vue-monaco-editor
            v-model:value="editForm.vue.template"
            theme="vs-dark"
            language="html"
            :options="{
              automaticLayout: true,
              scrollBeyondLastLine: false,
              mouseWheelZoom: true,
            }"
            height="100%"
            @validate="(markers) => handleValidate(markers, 'template')"
          />
        </el-tab-pane>
        <el-tab-pane label="Script" name="script">
          <template #label>
            Script
            <el-badge
              :value="errors.script.length"
              class="error-badge"
              v-if="errors.script.length > 0"
            />
          </template>
          <vue-monaco-editor
            v-model:value="editForm.vue.script"
            theme="vs-dark"
            language="javascript"
            :options="{
              automaticLayout: true,
              scrollBeyondLastLine: false,
              mouseWheelZoom: true,
            }"
            height="100%"
            @validate="(markers) => handleValidate(markers, 'script')"
          />
        </el-tab-pane>
        <el-tab-pane label="Style" name="style">
          <template #label>
            Style
            <el-badge
              :value="errors.style.length"
              class="error-badge"
              v-if="errors.style.length > 0"
            />
          </template>
          <vue-monaco-editor
            v-model:value="editForm.vue.style"
            theme="vs-dark"
            language="css"
            :options="{
              automaticLayout: true,
              scrollBeyondLastLine: false,
              mouseWheelZoom: true,
            }"
            height="100%"
            @validate="(markers) => handleValidate(markers, 'style')"
          />
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <div class="dialog-footer-content">
          <span v-if="hasError" class="error-tip">
            <el-icon><Warning /></el-icon> 代码存在语法错误: {{ errorSummary }}
          </span>
          <div>
            <el-button @click="editDialogVisible = false">取消</el-button>
            <el-button
              type="primary"
              @click="saveSchema"
              :loading="saving"
              :disabled="hasError"
              >保存</el-button
            >
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, defineAsyncComponent, shallowRef, reactive, computed } from "vue";
import { useRoute } from 'vue-router';
import { loadModule } from "vue3-sfc-loader";
import * as Vue from "vue";
import * as ElementPlus from "element-plus";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";
import request from "@/utils/request";
import { getSchemaById, updateSchema } from "@/api/schema";
import { ElMessage } from "element-plus";
import { Edit, Warning } from "@element-plus/icons-vue";
import { VueMonacoEditor } from "@guolao/vue-monaco-editor";
import * as MonacoEditor from "@guolao/vue-monaco-editor";
import ProTable from "@/components/ProTable/index.vue";

const props = defineProps<{
  schemaId?: string;
}>();

const route = useRoute();
const currentSchemaId = computed(() => {
  return props.schemaId || (route.meta.schemaId as string) || '';
});

const loading = ref(false);
const dynamicComponent = shallowRef<any>(null);

// Edit Logic
const editDialogVisible = ref(false);
const activeTab = ref("template");
const saving = ref(false);
const editForm = reactive({
  _id: "",
  name: "",
  vue: {
    template: "",
    script: "",
    style: "",
  },
});

// Syntax Validation Logic
const errors = reactive<{
  template: any[];
  script: any[];
  style: any[];
}>({
  template: [],
  script: [],
  style: [],
});

const hasError = computed(
  () =>
    errors.template.length > 0 ||
    errors.script.length > 0 ||
    errors.style.length > 0,
);

const errorSummary = computed(() => {
  const summary: string[] = [];
  if (errors.template.length > 0)
    summary.push(`Template: ${errors.template.length} 个错误`);
  if (errors.script.length > 0)
    summary.push(`Script: ${errors.script.length} 个错误`);
  if (errors.style.length > 0)
    summary.push(`Style: ${errors.style.length} 个错误`);
  return summary.join(" | ");
});

const handleValidate = (
  markers: any[],
  type: "template" | "script" | "style",
) => {
  // MarkerSeverity.Error = 8
  const errorMarkers = markers.filter((marker) => marker.severity === 8);
  errors[type] = errorMarkers;
};

const openEditDialog = async () => {
  if (!currentSchemaId.value) return;
  try {
    const res = await getSchemaById(currentSchemaId.value);
    if (res) {
      editForm._id = res._id || currentSchemaId.value;
      editForm.name = res.name;
      editForm.vue = { ...res.vue };
      // Reset errors
      errors.template = [];
      errors.script = [];
      errors.style = [];
      editDialogVisible.value = true;
    }
  } catch (error) {
    ElMessage.error("无法加载 Schema 数据");
  }
};

const saveSchema = async () => {
  if (!editForm._id) return;
  saving.value = true;
  try {
    await updateSchema(editForm._id, { vue: editForm.vue });
    ElMessage.success("Schema 更新成功");
    editDialogVisible.value = false;
    // Reload component
    loadSchema(currentSchemaId.value);
  } catch (error: any) {
    ElMessage.error("更新失败: " + error.message);
  } finally {
    saving.value = false;
  }
};

const options = {
  moduleCache: {
    vue: Vue,
    "element-plus": ElementPlus,
    "@element-plus/icons-vue": ElementPlusIconsVue,
    "app-request": request,
    "@/components/ProTable/index.vue": ProTable,
    "@guolao/vue-monaco-editor": MonacoEditor,
  },
  async getFile(url: string) {
    // 这里我们模拟 url 就是 schemaId
    // 实际加载逻辑在下面
    return Promise.resolve(url);
  },
  addStyle(textContent: string) {
    const style = document.createElement("style");
    style.textContent = textContent;
    const ref = document.head.getElementsByTagName("style")[0] || null;
    document.head.insertBefore(style, ref);
  },
};

const loadSchema = async (id: string) => {
  if (!id) return;
  loading.value = true;
  dynamicComponent.value = null;

  try {
    const res = await getSchemaById(id);
    if (!res || !res.vue) {
      throw new Error("Invalid schema data");
    }

    const { template, script, style } = res.vue;

    // 构造 SFC 字符串
    // 自动检测是否使用 script setup (如果没有 export default 则认为是 script setup)
    const isSetup = !script.includes("export default");
    const scriptTag = isSetup ? "<script setup>" : "<script>";

    const sfcContent = `
          <template>
          ${template}
          </template>
${scriptTag}
${script}
<\/script>
<style scoped>
${style}
</style>
    `;
    
    // 使用 vue3-sfc-loader 加载
    // 强制使用新的 URL 以绕过缓存 (添加时间戳)
    const cacheBuster = Date.now();
    dynamicComponent.value = defineAsyncComponent(() =>
      loadModule(id + ".vue?t=" + cacheBuster, {
        ...options,
        getFile: () => Promise.resolve(sfcContent),
      }),
    );
  } catch (error: any) {
    console.error("Failed to load schema:", error);
    ElMessage.error("加载页面失败: " + error.message);
  } finally {
    loading.value = false;
  }
};

watch(
  () => currentSchemaId.value,
  (newId) => {
    console.log('DynamicRender watched newId:', newId);
    if (newId) loadSchema(newId);
  },
  { immediate: true },
);
</script>

<style scoped>
.schema-renderer {
  min-height: 100%;
  position: relative; /* For absolute positioning of button */
}
.edit-schema-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 100;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}
:deep(.schema-edit-dialog) {
  margin-top: 5vh !important;
  height: 89vh;
  display: flex;
  flex-direction: column;
}
:deep(.schema-edit-dialog .el-dialog__body) {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
:deep(.schema-edit-dialog .el-tabs) {
  flex: 1;
  display: flex;
  flex-direction: column;
}
:deep(.schema-edit-dialog .el-tabs__content) {
  flex: 1;
  overflow: hidden;
}
:deep(.schema-edit-dialog .el-tab-pane) {
  height: 100%;
}
.dialog-footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
.error-tip {
  color: #f56c6c;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
}
.error-badge :deep(.el-badge__content) {
  margin-top: 8px;
  transform: scale(0.8);
}
</style>
