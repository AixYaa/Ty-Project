<template>
  <div
    class="editor-component-wrapper"
    :class="{
      'is-active': activeId === element.id,
      'is-container': element.isContainer,
      'is-col': element.type === 'el-col',
      'is-row': element.type === 'el-row'
    }"
    :style="wrapperStyle"
    @click.stop="onSelect(element)"
  >
    <!-- Action Bar -->
    <div v-if="activeId === element.id" class="component-actions">
      <div class="action-label">{{ element.label }}</div>
      <el-button
        type="danger"
        circle
        size="small"
        :icon="Delete"
        @click.stop="onDelete(element.id)"
      />
    </div>

    <!-- Case 1: Container (Row, Card, etc) -->
    <component
      :is="element.type"
      v-if="element.isContainer"
      v-bind="componentProps"
      class="editor-container-component"
      :class="{ 'row-container': element.type === 'el-row' }"
    >
      <draggable
        v-model="childrenList"
        group="components"
        item-key="id"
        class="drag-area"
        :class="{ 'empty-container': !element.children?.length }"
        :animation="200"
        ghost-class="ghost"
      >
        <template #item="{ element: child }">
          <DraggableItem
            :element="child"
            :active-id="activeId"
            @select="onSelect"
            @delete="onDelete"
          />
        </template>
      </draggable>
    </component>

    <!-- Case 2: Leaf Component -->
    <div v-else class="component-mask">
      <!-- Wrap in el-form-item if it has a label property -->
      <el-form-item
        v-if="element.props.label && element.type !== 'el-button'"
        :label="element.props.label"
      >
        <component :is="element.type" v-bind="componentProps">
          {{ element.text }}
          <template v-if="element.type === 'el-select'">
            <el-option
              v-for="opt in element.options"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </template>
        </component>
      </el-form-item>

      <component :is="element.type" v-else v-bind="componentProps">
        {{ element.text }}
        <template v-if="element.type === 'el-select'">
          <el-option
            v-for="opt in element.options"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </template>

        <!-- Mock Slots for ProTable -->
        <template v-if="element.type === 'ProTable'" #tableHeader>
          <template v-if="element.props._customHeader">
            <el-button
              v-for="(btn, i) in element.props._customHeader"
              :key="i"
              :type="btn.type"
              :icon="getIcon(btn.icon)"
              >{{ btn.text }}</el-button
            >
          </template>
          <template v-else>
            <el-button type="primary" :icon="CirclePlus">新增</el-button>
            <el-button type="danger" :icon="Delete" plain>批量删除</el-button>
          </template>
        </template>

        <template v-if="element.type === 'ProTable'" #operation>
          <template v-if="element.props._customOp">
            <el-button
              v-for="(btn, i) in element.props._customOp"
              :key="i"
              link
              :type="btn.type"
              :icon="getIcon(btn.icon)"
              :circle="btn.circle"
              >{{ btn.text }}</el-button
            >
          </template>
          <template v-else>
            <el-button link type="primary" :icon="EditPen">编辑</el-button>
            <el-button link type="danger" :icon="Delete">删除</el-button>
          </template>
        </template>

        <!-- Dynamic Input Slots -->
        <template
          v-for="col in element.props.columns?.filter((c: any) => c._renderInput)"
          :key="col.prop"
          #[col.prop]="{ row }"
        >
          <el-input v-model="row[col.prop]" placeholder="请输入" />
        </template>
      </component>
      <!-- Overlay -->
      <div class="mask-overlay"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import draggable from 'vuedraggable';
import type { EditorComponent } from './config';
import { Delete, EditPen, CirclePlus, Check, Refresh } from '@element-plus/icons-vue';
import request from '@/utils/request';

defineOptions({
  name: 'DraggableItem'
});

const props = defineProps<{
  element: EditorComponent;
  activeId?: string;
}>();

// Helper to resolve icon component dynamically
const getIcon = (name: string) => {
  if (!name) return undefined;
  const icons: any = { Delete, EditPen, CirclePlus, Check, Refresh };
  return icons[name] || undefined;
};

// Use computed for props to ensure reactivity
const componentProps = computed(() => {
  const element = props.element;
  const p = { ...element.props };
  // If apiUrl is present (e.g. for ProTable), inject requestApi
  if (p.apiUrl && typeof p.apiUrl === 'string') {
    p.requestApi = async (params: any) => {
      const res = await request.get(p.apiUrl, { params });

      // Auto Client-side Pagination:
      if (Array.isArray(res) && params.pageSize && res.length > params.pageSize) {
        const pageNum = params.pageNum || 1;
        const pageSize = params.pageSize || 10;
        const start = (pageNum - 1) * pageSize;
        const end = start + pageSize;
        return {
          data: res.slice(start, end),
          total: res.length
        };
      }
      return res;
    };
  }
  return p;
});

const wrapperStyle = computed(() => {
  if (props.element.type === 'el-col') {
    const span = props.element.props.span || 24;
    const width = (span / 24) * 100 + '%';
    return {
      width: width,
      flex: `0 0 ${width}`,
      maxWidth: width
    };
  }
  return {};
});

// Wrapper to avoid eslint prop mutation error
const childrenList = computed({
  get: () => props.element.children || [],
  set: (val) => {
    // eslint-disable-next-line vue/no-mutating-props
    props.element.children = val;
  }
});

const emit = defineEmits(['select', 'delete']);

const onSelect = (el: EditorComponent) => {
  emit('select', el);
};

const onDelete = (id: string | undefined) => {
  if (id) emit('delete', id);
};
</script>

<style scoped>
.editor-component-wrapper {
  position: relative;
  margin-bottom: 2px;
  border: 1px dashed transparent;
  padding: 2px;
  transition: all 0.2s;
}

/* Ensure ProTable fits nicely */
.editor-component-wrapper :deep(.pro-table) {
  height: 100%;
  min-height: 400px; /* Give it some minimum height */
  overflow: hidden; /* Prevent table overflow */
}
/* Fix table card flex expansion in editor */
.editor-component-wrapper :deep(.table-card) {
  flex: 1;
  min-height: 0;
}

/* When active, allow interaction with inner elements (e.g. table sorting/pagination) if needed,
   OR keep it blocked to force selection via wrapper.
   Currently we prefer blocking to avoid accidental edits, but ProTable needs interaction.
*/
.editor-component-wrapper.is-active .mask-overlay {
  pointer-events: none;
  display: none; /* Hide overlay when active to allow interaction */
}

.editor-component-wrapper:hover {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.editor-component-wrapper:hover .mask-overlay {
  pointer-events: auto; /* Capture hover on overlay */
  background: rgba(64, 158, 255, 0); /* Transparent but capturable */
}

.editor-component-wrapper.is-active {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-8);
  outline: 2px solid var(--el-color-primary);
  z-index: 10;
}

.component-actions {
  position: absolute;
  top: -12px;
  right: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  z-index: 20;
}

.action-label {
  background: var(--el-color-primary);
  color: white;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 3px;
}

.drag-area {
  min-height: 50px;
  height: 100%;
}

/* Fix for el-row drag area to display columns horizontally */
:deep(.row-container) .drag-area {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  gap: 0; /* Remove gap from flex container, let col padding handle it (standard el-row behavior) */
}
/* Ensure draggable item inside row (which wraps col) takes up space correctly */
/* Removed: :deep(.row-container) .drag-area > .editor-component-wrapper { flex: 1; } */

.empty-container {
  background-color: var(--el-fill-color-lighter);
  border: 1px dashed var(--el-border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60px; /* Ensure drop target is visible */
}
.empty-container::after {
  content: '拖拽组件到此处';
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}

/* Row/Col Visual Indicators */
.editor-component-wrapper.is-row {
  border: 1px dashed #ccc;
  padding: 5px;
  background-color: rgba(0, 0, 0, 0.02);
}
.editor-component-wrapper.is-row::before {
  content: 'Row';
  position: absolute;
  top: -8px;
  left: 0;
  font-size: 10px;
  color: #999;
  background: #eee;
  padding: 0 4px;
}

.editor-component-wrapper.is-col {
  border: 1px dashed #eee;
  background-color: rgba(0, 0, 0, 0.01);
  min-height: 50px;
}
.editor-component-wrapper.is-col:hover {
  border-color: var(--el-color-primary-light-5);
}

.component-mask {
  position: relative;
  pointer-events: none; /* Disable interaction with inner inputs */
}

.mask-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  cursor: pointer;
  background: transparent; /* Allows clicks but blocks interaction with inputs inside */
  pointer-events: none; /* Let clicks pass through to wrapper */
}

/* Only intercept pointer events on overlay if we want to block inner interaction */
/*.component-mask:hover .mask-overlay {
   border: 1px solid var(--el-color-primary);
}*/

/* Re-enable pointer events for the wrapper to allow selection */
.editor-component-wrapper {
  cursor: grab;
  pointer-events: auto;
}
</style>
