<template>
  <div class="pro-table">
    <!-- 1. Search Form Area -->
    <el-card v-if="showSearch" class="search-card" shadow="never">
      <el-form ref="searchFormRef" :model="searchParam" :inline="true" label-width="100px">
        <template v-for="item in searchColumns" :key="item.prop">
          <el-form-item :label="$t(item.label || '')">
            <!-- Input -->
            <el-input
              v-if="!item.search?.el || item.search.el === 'input'"
              v-model="searchParam[item.search?.key || item.prop!]"
              v-bind="item.search?.props"
              :placeholder="
                item.search?.props?.placeholder ||
                `${$t('common.pleaseInput')} ${$t(item.label || '')}`
              "
              clearable
            />
            <!-- Select -->
            <el-select
              v-if="item.search?.el === 'select'"
              v-model="searchParam[item.search?.key || item.prop!]"
              v-bind="item.search?.props"
              :placeholder="
                item.search?.props?.placeholder ||
                `${$t('common.pleaseSelect')} ${$t(item.label || '')}`
              "
              clearable
            >
              <el-option
                v-for="op in item.search.options"
                :key="op.value"
                :label="op.label"
                :value="op.value"
              />
            </el-select>
            <!-- Date Picker -->
            <el-date-picker
              v-if="item.search?.el === 'date-picker'"
              v-model="searchParam[item.search?.key || item.prop!]"
              v-bind="item.search?.props"
              value-format="YYYY-MM-DD HH:mm:ss"
              clearable
            />
          </el-form-item>
        </template>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="search">{{
            $t('common.search')
          }}</el-button>
          <el-button :icon="Delete" @click="reset">{{ $t('common.reset') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 1.5. Selection Info Bar -->
    <div v-if="selectedList.length > 0" class="selection-bar">
      <el-alert type="success" :closable="false">
        <template #title>
          <div class="selection-content">
            <span class="selection-text">
              已选择 <span class="selection-count">{{ selectedList.length }}</span> 项:
              <span class="selection-names">
                {{ selectedList.map((item) => item[labelKey] || item.name).join(', ') }}
              </span>
            </span>
            <el-button v-if="batchDeleteApi" type="primary" link @click="handleBatchDelete">
              批量删除
            </el-button>
          </div>
        </template>
      </el-alert>
    </div>

    <!-- 2. Table Area -->
    <el-card class="table-card" shadow="never">
      <div class="table-header">
        <div class="header-button-lf">
          <span v-if="title" class="table-title">{{ title }}</span>
          <!-- <el-button type="primary" :icon="CirclePlus" @click="openAdd">新增菜单</el-button> -->
          <slot name="tableHeader" :selected-list="selectedList" :selected-ids="selectedIds"></slot>
        </div>
        <div v-if="toolButton" class="header-button-ri">
          <el-button :icon="Refresh" circle @click="getTableList" />
        </div>
      </div>

      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="tableData"
        :border="border"
        :stripe="stripe"
        :size="size"
        :row-key="rowKey"
        @selection-change="selectionChange"
      >
        <!-- Selection -->
        <el-table-column
          v-if="columns.some((col) => col.type === 'selection')"
          type="selection"
          align="center"
          width="55"
          fixed="left"
        />

        <!-- Index (Global) -->
        <el-table-column
          v-if="showIndex"
          type="index"
          label="#"
          align="center"
          width="60"
          fixed="left"
        />

        <!-- Selection / Index / Expand (From Columns) -->
        <template v-for="col in tableColumns" :key="col.prop">
          <!-- Skip Selection type in loop as we handled it globally (or prevent duplicate) -->
          <!-- Actually, if we use the global selection above, we should filter it here.
               Let's Refine:
               1. If columns has type='selection', we render it ONCE at top.
               2. If showIndex is true, we render index ONCE at top (after selection).
               3. Loop rest of columns.
          -->

          <el-table-column
            v-if="col.type !== 'selection' && col.type !== 'index' && col.type !== 'expand'"
            v-bind="col"
            align="center"
            show-overflow-tooltip
          >
            <!-- Custom Header -->
            <template #header>
              <slot :name="`${col.prop}Header`" :row="col">
                {{ $t(col.label || '') }}
              </slot>
            </template>
            <!-- Custom Cell -->
            <template #default="scope">
              <!-- Operation Column Handling -->
              <div
                v-if="col.prop === 'operation'"
                class="operation-cell"
                :class="{ 'operation-cell-hover': props.operation?.mode === 'hover' }"
              >
                <template v-if="props.operation">
                  <el-button
                    v-if="props.operation.view === true"
                    link
                    type="primary"
                    :icon="View"
                    @click="openView(scope.row)"
                  >
                    {{ props.operation.viewText || $t('common.view') }}
                  </el-button>
                  <el-button
                    v-if="props.operation.edit !== false"
                    link
                    type="primary"
                    :icon="EditPen"
                    @click="openEdit(scope.row)"
                  >
                    {{ props.operation.editText || $t('common.edit') }}
                  </el-button>
                  <el-button
                    v-if="props.operation.delete !== false"
                    link
                    type="danger"
                    :icon="Delete"
                    @click="handleDelete(scope.row)"
                  >
                    {{ props.operation.deleteText || $t('common.delete') }}
                  </el-button>
                </template>
                <slot name="operation" :row="scope.row"></slot>
              </div>

              <slot v-else :name="col.prop" :row="scope.row">
                {{ scope.row[col.prop!] }}
              </slot>
            </template>
          </el-table-column>

          <!-- Handle Expand specifically if needed, but usually expand is also a type -->
          <el-table-column v-if="col.type === 'expand'" v-bind="col" align="center" type="expand">
            <template #default="scope">
              <slot name="expand" :row="scope.row"></slot>
            </template>
          </el-table-column>
        </template>
      </el-table>

      <!-- Pagination -->
      <div v-if="pagination" class="table-pagination">
        <el-pagination
          v-model:current-page="pageable.pageNum"
          v-model:page-size="pageable.pageSize"
          :page-sizes="[10, 25, 50, 100]"
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="pageable.total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- Built-in Editor Drawer -->
    <el-drawer
      v-if="formConfig"
      v-model="editor.visible"
      :title="editor.title"
      :size="formConfig.width || '500px'"
      append-to-body
      :class="formConfig.class"
    >
      <div class="drawer-content" :style="formConfig.contentStyle">
        <!-- Debug Info -->
        <div
          v-if="settingStore.showDebugDrawer && userStore.userInfo?.username === 'admin'"
          class="debug-info-box"
        >
          <div class="debug-header" @click="isDebugExpanded = !isDebugExpanded">
            <span class="debug-title">
              <el-icon class="debug-icon"><Monitor /></el-icon>
              API 数据预览
            </span>
            <el-icon :class="{ 'is-expanded': isDebugExpanded }" class="expand-icon"
              ><ArrowRight
            /></el-icon>
          </div>
          <el-collapse-transition>
            <div v-show="isDebugExpanded" class="monaco-wrapper">
              <VueMonacoEditor
                :value="debugJsonStr"
                language="json"
                theme="vs"
                :options="{
                  readOnly: true,
                  domReadOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  fontSize: 12,
                  lineNumbers: 'off',
                  renderLineHighlight: 'none',
                  contextmenu: false,
                  folding: true
                }"
                height="200px"
              />
            </div>
          </el-collapse-transition>
        </div>

        <slot name="edit-form" :model="editor.formData" :is-edit="editor.isEdit"></slot>
      </div>
      <template #footer>
        <el-button @click="closeDrawer">取消</el-button>
        <el-button type="primary" :loading="editor.loading" @click="handleEditorSubmit"
          >确定</el-button
        >
      </template>
    </el-drawer>

    <!-- Built-in Viewer Dialog -->
    <el-dialog
      v-if="formConfig"
      v-model="viewer.visible"
      :title="viewer.title"
      width="90%"
      append-to-body
      class="pro-table-view-dialog"
      top="5vh"
    >
      <div class="view-content" style="padding: 20px">
        <slot name="view-form" :model="viewer.data"></slot>
      </div>
    </el-dialog>

    <!-- Global API Debug Button (Floating) -->
    <div
      v-if="settingStore.showDebugDrawer && userStore.userInfo?.username === 'admin'"
      class="global-debug-float-btn"
      @click="showApiDebug = true"
    >
      <el-icon><Cpu /></el-icon>
    </div>

    <!-- API Debug Drawer -->
    <el-drawer
      v-model="showApiDebug"
      title="当前表格数据 (API Debug)"
      direction="rtl"
      size="500px"
      append-to-body
    >
      <div class="monaco-full-height">
        <VueMonacoEditor
          :value="tableDataJsonStr"
          language="json"
          theme="vs"
          :options="{
            readOnly: true,
            domReadOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            fontSize: 12,
            lineNumbers: 'on',
            renderLineHighlight: 'none',
            contextmenu: false,
            folding: true
          }"
          style="height: 100%"
        />
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import {
  Search,
  Delete,
  Refresh,
  View,
  EditPen,
  Monitor,
  ArrowRight,
  Cpu
} from '@element-plus/icons-vue';
import type { ProTableColumn, Pageable } from './interface';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useSettingStore } from '@/store/setting';
import { useUserStore } from '@/store/user';
import { VueMonacoEditor } from '@guolao/vue-monaco-editor';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// Props
const props = withDefaults(
  defineProps<{
    columns?: ProTableColumn[]; // Column configuration
    requestApi: (params: any) => Promise<any>; // Request function
    initParam?: any; // Initial parameters
    pagination?: boolean; // Show pagination
    border?: boolean;
    rowKey?: string;
    showIndex?: boolean; // New prop for showing index
    beforeSearchSubmit?: (params: any) => any; // Callback before search
    labelKey?: string; // Key to display for selected items
    batchDeleteApi?: (ids: string[]) => Promise<any>; // Batch delete API
    deleteApi?: (id: string) => Promise<any>; // Single delete API
    operation?: any; // Operation column configuration
    formConfig?: any; // Configuration for built-in editor (drawer)
    title?: string; // Table title
    toolButton?: boolean; // Show tool buttons
    stripe?: boolean; // Stripe style
    size?: 'large' | 'default' | 'small'; // Table size
  }>(),
  {
    columns: () => [],
    pagination: true,
    initParam: {},
    border: false,
    rowKey: '_id',
    showIndex: true, // Default to true
    beforeSearchSubmit: (params: any) => params,
    labelKey: 'name',
    operation: undefined,
    formConfig: undefined,
    batchDeleteApi: undefined,
    deleteApi: undefined,
    title: '',
    toolButton: true,
    stripe: false,
    size: 'default'
  }
);

// Emits
const emit = defineEmits(['view', 'edit', 'delete', 'submit']);

const settingStore = useSettingStore();
const userStore = useUserStore();

// State
const tableRef = ref();
const searchFormRef = ref();
const loading = ref(false);
const tableData = ref<any[]>([]);
const searchParam = reactive<any>({ ...props.initParam });
const selectedList = ref<any[]>([]);
const selectedIds = computed(() => selectedList.value.map((item) => item[props.rowKey]));

// Debug Json
const debugJsonStr = computed(() => JSON.stringify(editor.formData, null, 2));
const isDebugExpanded = ref(false);

// Table Data Debug
const showApiDebug = ref(false);
const tableDataJsonStr = computed(() =>
  JSON.stringify(
    {
      list: tableData.value,
      total: pageable.total,
      pageNum: pageable.pageNum,
      pageSize: pageable.pageSize
    },
    null,
    2
  )
);

// Built-in Editor/Viewer State
const editor = reactive({
  visible: false,
  isEdit: false,
  title: '',
  formData: {} as any,
  loading: false
});

const viewer = reactive({
  visible: false,
  title: '',
  data: {} as any
});

const pageable = reactive<Pageable>({
  pageNum: 1,
  pageSize: 10,
  total: 0
});

// Computed Columns
const tableColumns = computed(() => {
  let cols = [...props.columns];
  // Filter hidden columns (simple check)
  cols = cols.filter((col) => col.isShow !== false);

  // Auto-inject operation column if configured
  if (props.operation && !props.operation.hidden && !cols.some((c) => c.prop === 'operation')) {
    const isHover = props.operation.mode === 'hover';
    cols.push({
      prop: 'operation',
      label: isHover ? '' : props.operation.label || t('common.operation'),
      fixed: props.operation.fixed || 'right',
      width: isHover ? 50 : props.operation.width || 200, // Minimal width for hover mode
      type: 'operation',
      className: isHover ? 'operation-column-hover' : ''
    });
  }
  return cols;
});
const searchColumns = computed(() => {
  return props.columns.filter((item) => item.search);
});
const showSearch = computed(() => searchColumns.value.length > 0);

// Methods
const getTableList = async () => {
  loading.value = true;
  try {
    // Merge params
    let params = {
      ...searchParam,
      ...(props.pagination
        ? {
            pageNum: pageable.pageNum,
            pageSize: pageable.pageSize
          }
        : {})
    };

    // Process search params (remove empty values)
    for (const key in params) {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key];
      }
    }

    // Transform params if callback provided
    if (props.beforeSearchSubmit) {
      params = props.beforeSearchSubmit(params);
    }

    if (!props.requestApi) {
      // In Visual Editor preview or misconfiguration, requestApi might be missing.
      // Treat as empty result to avoid crash.
      console.warn('ProTable: requestApi prop is missing. Returning empty data.');
      tableData.value = [];
      pageable.total = 0;
      return;
    }

    const res = await props.requestApi(params);
    // Compatible with different response structures
    if (Array.isArray(res)) {
      tableData.value = res;
      pageable.total = res.length;
    } else if (res.data && Array.isArray(res.data)) {
      tableData.value = res.data;
      pageable.total = res.total || res.data.length;
    } else if (res.list && Array.isArray(res.list)) {
      tableData.value = res.list;
      pageable.total = res.total || res.list.length;
    } else {
      // Fallback for simple array response or custom structure
      tableData.value = [];
      pageable.total = 0;
    }
  } catch (error) {
    console.error(error);
    ElMessage.error('获取表格数据失败');
  } finally {
    loading.value = false;
  }
};

const search = () => {
  pageable.pageNum = 1;
  getTableList();
};

const reset = () => {
  if (!searchFormRef.value) return;
  searchFormRef.value.resetFields();
  // Manually clear searchParam based on initParam
  Object.keys(searchParam).forEach((key) => {
    searchParam[key] = props.initParam[key] || '';
  });
  search();
};

const handleSizeChange = (val: number) => {
  pageable.pageNum = 1;
  pageable.pageSize = val;
  getTableList();
};

const handleCurrentChange = (val: number) => {
  pageable.pageNum = val;
  getTableList();
};

const selectionChange = (val: any[]) => {
  selectedList.value = val;
};

const handleDelete = async (row: any) => {
  if (props.deleteApi) {
    try {
      await ElMessageBox.confirm(
        t('table.confirmDelete', { name: row[props.labelKey || 'name'] }),
        t('common.warning'),
        {
          type: 'warning',
          dangerouslyUseHTMLString: true,
          confirmButtonText: t('common.confirm'),
          cancelButtonText: t('common.cancel')
        }
      );
      await props.deleteApi(row[props.rowKey]);
      ElMessage.success(t('table.deleteSuccess'));
      getTableList();
    } catch {
      /* cancel */
    }
  } else {
    emit('delete', row);
  }
};

const handleBatchDelete = async () => {
  if (!props.batchDeleteApi) return;
  const ids = selectedIds.value;
  if (ids.length === 0) return;

  try {
    await ElMessageBox.confirm(
      t('table.confirmBatchDelete', { count: ids.length }),
      t('common.warning'),
      {
        type: 'warning',
        dangerouslyUseHTMLString: true,
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel')
      }
    );
    await props.batchDeleteApi(ids);
    ElMessage.success(t('table.batchDeleteSuccess'));
    getTableList();
    tableRef.value?.clearSelection();
  } catch {
    // Cancel or Error
  }
};

// Built-in Editor Methods
const openAdd = () => {
  editor.isEdit = false;
  editor.title = t('table.add', { name: props.formConfig?.label || '' });
  editor.formData = JSON.parse(JSON.stringify(props.formConfig?.initForm || {}));
  editor.visible = true;
};

const openEdit = (row: any) => {
  editor.isEdit = true;
  editor.title = t('table.edit', { name: props.formConfig?.label || '' });
  editor.formData = JSON.parse(JSON.stringify(row));
  // Special handling for password field: clear it when editing
  if ('password' in editor.formData) {
    editor.formData.password = '';
  }
  editor.visible = true;
};

const openView = (row: any) => {
  viewer.title = t('table.view', { name: props.formConfig?.label || '' });
  viewer.data = JSON.parse(JSON.stringify(row));
  viewer.visible = true;
};

const handleEditorSubmit = () => {
  editor.loading = true;
  emit('submit', editor.formData, () => {
    editor.loading = false;
    editor.visible = false;
    getTableList();
  });
};

const closeDrawer = () => {
  editor.visible = false;
};

// Initialize
onMounted(() => {
  getTableList();
});

// Expose
defineExpose({
  element: tableRef,
  tableData,
  searchParam,
  pageable,
  getTableList,
  reset,
  search,
  openAdd,
  openEdit,
  openView
});
</script>

<style scoped>
.pro-table {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-card {
  margin-bottom: 0;
}

.selection-bar {
  margin-bottom: 0;
}

.selection-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.selection-text {
  font-size: 14px;
}

.selection-count {
  font-weight: bold;
  margin: 0 4px;
}

.selection-names {
  margin-left: 8px;
  color: #666;
  font-size: 13px;
}

.table-card {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.table-title {
  font-size: 18px;
  font-weight: bold;
  color: var(--el-text-color-primary);
  margin-right: 15px;
}

.table-pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.operation-cell {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  /* flex-wrap: wrap; Removed to prevent wrapping in hover mode */
}

.operation-cell-hover {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  padding: 0 10px;
  background-color: var(--el-table-row-hover-bg-color); /* Match hover bg */
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  z-index: 10;
  box-shadow: -10px 0 10px -5px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
  width: max-content; /* Ensure it adapts to content width */
}

:deep(.el-table__row:hover) .operation-cell-hover {
  opacity: 1;
  pointer-events: auto;
}

:deep(.operation-column-hover) {
  padding: 0 !important;
  border-left: none !important;
}

:deep(.operation-column-hover .cell) {
  overflow: visible !important;
  padding: 0 !important;
  position: static !important; /* Allow absolute child to align with row */
}

.debug-info-box {
  margin-bottom: 20px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #dcdfe6;
  background-color: #fff;
}

.debug-header {
  background-color: #f5f7fa;
  padding: 8px 12px;
  font-size: 13px;
  color: #606266;
  border-bottom: 1px solid #ebeef5;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
  transition: background-color 0.2s;
}

.debug-header:hover {
  background-color: #e6e8eb;
}

.debug-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.expand-icon {
  transition: transform 0.3s;
  color: #909399;
}

.expand-icon.is-expanded {
  transform: rotate(90deg);
}

.monaco-wrapper {
  height: 200px;
  border-top: 1px solid #ebeef5;
}

.global-debug-float-btn {
  position: fixed;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  background-color: #67c23a;
  border-radius: 4px 0 0 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  z-index: 999;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
  color: #fff;
  font-size: 20px;
  transition: all 0.3s;
}

.global-debug-float-btn:hover {
  background-color: #85ce61;
  width: 50px;
}

.monaco-full-height {
  height: 100%;
  border: 1px solid #dcdfe6;
}
</style>
