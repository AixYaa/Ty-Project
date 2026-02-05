<template>
  <div class="pro-table">
    <!-- 1. Search Form Area -->
    <el-card v-if="showSearch" class="search-card" shadow="never">
      <el-form ref="searchFormRef" :model="searchParam" :inline="true" label-width="100px">
        <template v-for="item in searchColumns" :key="item.prop">
          <el-form-item :label="item.label">
            <!-- Input -->
            <el-input
              v-if="!item.search?.el || item.search.el === 'input'"
              v-model="searchParam[item.search?.key || item.prop!]"
              v-bind="item.search?.props"
              :placeholder="item.search?.props?.placeholder || `请输入${item.label}`"
              clearable
            />
            <!-- Select -->
            <el-select
              v-if="item.search?.el === 'select'"
              v-model="searchParam[item.search?.key || item.prop!]"
              v-bind="item.search?.props"
              :placeholder="item.search?.props?.placeholder || `请选择${item.label}`"
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
          <el-button type="primary" :icon="Search" @click="search">搜索</el-button>
          <el-button :icon="Delete" @click="reset">重置</el-button>
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
                {{ selectedList.map(item => item[labelKey] || item.name).join(', ') }}
              </span>
            </span>
            <el-button 
              v-if="batchDeleteApi" 
              type="primary" 
              link 
              @click="handleBatchDelete"
            >
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
          <!-- <el-button type="primary" :icon="CirclePlus" @click="openAdd">新增菜单</el-button> -->
          <slot name="tableHeader" :selectedList="selectedList" :selectedIds="selectedIds"></slot>
        </div>
        <div class="header-button-ri">
          <el-button :icon="Refresh" circle @click="getTableList" />
        </div>
      </div>
      
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="tableData"
        :border="border"
        :row-key="rowKey"
        @selection-change="selectionChange"
      >
        <!-- Selection -->
        <el-table-column v-if="columns.some(col => col.type === 'selection')" type="selection" align="center" width="55" fixed="left" />
        
        <!-- Index (Global) -->
        <el-table-column v-if="showIndex" type="index" label="#" align="center" width="60" fixed="left" />

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
                {{ col.label }}
              </slot>
            </template>
            <!-- Custom Cell -->
            <template #default="scope">
              <!-- Operation Column Handling -->
              <div v-if="col.prop === 'operation'" class="operation-cell" :class="{ 'operation-cell-hover': props.operation?.mode === 'hover' }">
                <template v-if="props.operation">
                  <el-button 
                    v-if="props.operation.view === true" 
                    link type="primary" :icon="View" 
                    @click="openView(scope.row)"
                  >
                    {{ props.operation.viewText || '查看' }}
                  </el-button>
                  <el-button 
                    v-if="props.operation.edit !== false" 
                    link type="primary" :icon="EditPen" 
                    @click="openEdit(scope.row)"
                  >
                    {{ props.operation.editText || '编辑' }}
                  </el-button>
                  <el-button 
                    v-if="props.operation.delete !== false" 
                    link type="danger" :icon="Delete" 
                    @click="handleDelete(scope.row)"
                  >
                    {{ props.operation.deleteText || '删除' }}
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
           <el-table-column
            v-if="col.type === 'expand'"
            v-bind="col"
            align="center"
            type="expand"
          >
            <template #default="scope">
              <slot name="expand" :row="scope.row"></slot>
            </template>
          </el-table-column>

        </template>
      </el-table>

      <!-- Pagination -->
      <div class="table-pagination" v-if="pagination">
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
         <slot name="edit-form" :model="editor.formData" :is-edit="editor.isEdit"></slot>
      </div>
      <template #footer>
         <el-button @click="closeDrawer">取消</el-button>
         <el-button type="primary" @click="handleEditorSubmit" :loading="editor.loading">确定</el-button>
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
    >
       <div class="view-content" style="padding: 20px;">
          <slot name="view-form" :model="viewer.data"></slot>
       </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { Search, Delete, Refresh, View, EditPen } from '@element-plus/icons-vue';
import type { ProTableColumn, Pageable } from './interface';
import { ElMessage, ElMessageBox } from 'element-plus';

// Props
const props = withDefaults(defineProps<{
  columns: ProTableColumn[]; // Column configuration
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
}>(), {
  columns: () => [],
  pagination: true,
  initParam: {},
  border: false,
  rowKey: '_id',
  showIndex: true, // Default to true
  beforeSearchSubmit: (params: any) => params,
  labelKey: 'name',
  operation: undefined,
  formConfig: undefined
});

// Emits
const emit = defineEmits(['view', 'edit', 'delete', 'submit']);

// State
const tableRef = ref();
const searchFormRef = ref();
const loading = ref(false);
const tableData = ref<any[]>([]);
const searchParam = reactive<any>({ ...props.initParam });
const selectedList = ref<any[]>([]);
const selectedIds = computed(() => selectedList.value.map(item => item[props.rowKey]));

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
  cols = cols.filter(col => col.isShow !== false);

  // Auto-inject operation column if configured
  if (props.operation && !props.operation.hidden && !cols.some(c => c.prop === 'operation')) {
    const isHover = props.operation.mode === 'hover';
    cols.push({
      prop: 'operation',
      label: isHover ? '' : (props.operation.label || '操作'),
      fixed: props.operation.fixed || 'right',
      width: isHover ? 50 : (props.operation.width || 200), // Minimal width for hover mode
      type: 'operation',
      className: isHover ? 'operation-column-hover' : ''
    });
  }
  return cols;
});
const searchColumns = computed(() => {
  return props.columns.filter(item => item.search);
});
const showSearch = computed(() => searchColumns.value.length > 0);

// Methods
const getTableList = async () => {
  loading.value = true;
  try {
    // Merge params
    let params = {
      ...searchParam,
      ...(props.pagination ? {
        pageNum: pageable.pageNum,
        pageSize: pageable.pageSize
      } : {})
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
  Object.keys(searchParam).forEach(key => {
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
       await ElMessageBox.confirm(`确定删除 "<strong>${row[props.labelKey || 'name']}</strong>" 吗？<br/>此操作不可恢复！`, '警告', {
         type: 'warning',
         dangerouslyUseHTMLString: true,
         confirmButtonText: '确定删除',
         cancelButtonText: '取消'
       });
       await props.deleteApi(row[props.rowKey]);
       ElMessage.success('删除成功');
       getTableList();
    } catch (e) { /* cancel */ }
  } else {
    emit('delete', row);
  }
};

const handleBatchDelete = async () => {
  if (!props.batchDeleteApi) return;
  const ids = selectedIds.value;
  if (ids.length === 0) return;

  try {
    await ElMessageBox.confirm(`确定删除选中的 <span style="color:red;font-weight:bold">${ids.length}</span> 项吗？<br/>此操作不可恢复！`, '警告', {
      type: 'warning',
      dangerouslyUseHTMLString: true,
      confirmButtonText: '确定删除',
      cancelButtonText: '取消'
    });
    await props.batchDeleteApi(ids);
    ElMessage.success('批量删除成功');
    getTableList();
    tableRef.value?.clearSelection();
  } catch (e) {
    // Cancel or Error
  }
};

// Built-in Editor Methods
const openAdd = () => {
  editor.isEdit = false;
  editor.title = '新增' + (props.formConfig?.label || '');
  editor.formData = JSON.parse(JSON.stringify(props.formConfig?.initForm || {}));
  editor.visible = true;
};

const openEdit = (row: any) => {
  editor.isEdit = true;
  editor.title = '编辑' + (props.formConfig?.label || '');
  editor.formData = JSON.parse(JSON.stringify(row));
  // Special handling for password field: clear it when editing
  if ('password' in editor.formData) {
    editor.formData.password = '';
  }
  editor.visible = true;
};

const openView = (row: any) => {
  viewer.title = '查看' + (props.formConfig?.label || '');
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
  margin-bottom: 16px;
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
  box-shadow: -10px 0 10px -5px rgba(0,0,0,0.1);
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
</style>
