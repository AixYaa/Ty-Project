<template>
  <div class="page-container">
    <ProTable
      ref="proTableRef"
      :columns="columns"
      :request-api="getTableList"
      :delete-api="onDelete"
      :operation="{
        permissions: { view: 'workflow:view', edit: 'workflow:edit', delete: 'workflow:edit' },
        view: true,
        edit: true,
        delete: true,
        mode: 'hover'
      }"
      :form-config="{ label: '流程模板', initForm: initForm, width: '760px' }"
      row-key="_id"
      @submit="onSubmit"
    >
      <template #tableHeader>
        <el-button type="primary" :icon="CirclePlus" @click="openAdd">新增流程模板</el-button>
      </template>

      <template #status="{ row }">
        <el-tag :type="row.status === 'enabled' ? 'success' : 'info'">
          {{ row.status === 'enabled' ? '启用' : '禁用' }}
        </el-tag>
      </template>

      <template #edit-form="{ model }">
        <el-form :model="model" label-width="100px">
          <el-form-item label="模板名称">
            <el-input v-model="model.name" placeholder="例如：请假审批流程" />
          </el-form-item>
          <el-form-item label="模板标识">
            <el-input v-model="model.key" placeholder="例如：leave_approval" />
          </el-form-item>
          <el-form-item label="状态">
            <el-switch
              v-model="model.status"
              active-value="enabled"
              inactive-value="disabled"
              active-text="启用"
              inactive-text="禁用"
            />
          </el-form-item>
          <el-form-item label="描述">
            <el-input v-model="model.description" type="textarea" :rows="2" />
          </el-form-item>
          <el-form-item label="流程设计">
            <div class="simple-designer">
              <span class="simple-tip"
                >仅保留可视化编辑。节点审批人请在弹窗右侧“节点审批人”里配置。</span
              >
              <el-button type="primary" plain @click="openVisualDesigner(model)">
                打开可视化编辑器
              </el-button>
            </div>
          </el-form-item>
        </el-form>
      </template>

      <template #view-form="{ model }">
        <el-form :model="model" label-width="100px" disabled>
          <el-form-item label="模板名称"><el-input v-model="model.name" /></el-form-item>
          <el-form-item label="模板标识"><el-input v-model="model.key" /></el-form-item>
          <el-form-item label="状态">
            <el-tag :type="model.status === 'enabled' ? 'success' : 'info'">
              {{ model.status === 'enabled' ? '启用' : '禁用' }}
            </el-tag>
          </el-form-item>
          <el-form-item label="描述"
            ><el-input v-model="model.description" type="textarea" :rows="2"
          /></el-form-item>
        </el-form>
      </template>
    </ProTable>

    <el-dialog
      v-model="visualDesignerVisible"
      title="可视化流程设计器（BPMN）"
      width="94%"
      top="4vh"
      class="bpmn-designer-dialog"
      @opened="handleVisualDialogOpened"
      @closed="handleVisualDialogClosed"
    >
      <div class="bpmn-toolbar">
        <el-button size="small" @click="reloadCurrentXml">重新加载当前 XML</el-button>
        <el-button size="small" type="success" @click="saveVisualDesigner"
          >保存（同步模板）</el-button
        >
      </div>
      <div class="bpmn-layout">
        <div ref="bpmnContainerRef" class="bpmn-container"></div>
        <div class="approver-panel">
          <div class="panel-title">节点审批人</div>
          <div class="panel-tip">每个任务节点设置审批人（用户名），按流程顺序自动流转。</div>
          <el-empty v-if="taskApproverList.length === 0" description="暂无任务节点" />
          <div v-else class="task-list">
            <div v-for="item in taskApproverList" :key="item.id" class="task-row">
              <div class="task-name">{{ item.name || item.id }}</div>
              <el-select
                v-model="item.assignee"
                filterable
                clearable
                allow-create
                default-first-option
                placeholder="选择审批人（可搜索）"
                @change="updateTaskAssignee(item)"
                @visible-change="onApproverSelectVisible"
              >
                <el-option
                  v-for="u in userOptions"
                  :key="u.username"
                  :label="u.name ? `${u.name} (${u.username})` : u.username"
                  :value="u.username"
                />
              </el-select>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { CirclePlus } from '@element-plus/icons-vue';
import ProTable from '@/components/ProTable/index.vue';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import {
  getWorkflowTemplates,
  createWorkflowTemplate,
  updateWorkflowTemplate,
  deleteWorkflowTemplate,
  getWorkflowUserOptions
} from '@/api/workflow';

const proTableRef = ref();
const initForm = { name: '', key: '', status: 'enabled', description: '', bpmnXml: '' };
const visualDesignerVisible = ref(false);
const bpmnContainerRef = ref<HTMLElement>();
const visualEditingModel = ref<any>(null);
const taskApproverList = ref<Array<{ id: string; name: string; assignee: string }>>([]);
const userOptions = ref<Array<{ username: string; name: string }>>([]);
let bpmnModeler: any = null;
let unbindModelerEvents: (() => void) | null = null;
let userOptionLoading = false;

type LabelBounds = { x: number; y: number; width: number; height: number };

const DEFAULT_BPMN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
  id="Definitions_1"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" name="开始" />
    <bpmn:userTask id="Task_1" name="审批节点" />
    <bpmn:endEvent id="EndEvent_1" name="结束" />
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="152" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1">
        <dc:Bounds x="260" y="80" width="120" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="452" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="188" y="120" />
        <di:waypoint x="260" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="380" y="120" />
        <di:waypoint x="452" y="120" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

const ensureModeler = async () => {
  if (bpmnModeler || !bpmnContainerRef.value) return;
  const Modeler = (await import('bpmn-js/lib/Modeler')).default;
  bpmnModeler = new Modeler({
    container: bpmnContainerRef.value
  });
  const eventBus = bpmnModeler.get('eventBus');
  const handleChanged = () => syncTaskApproverList();
  eventBus.on('commandStack.changed', handleChanged);
  unbindModelerEvents = () => eventBus.off('commandStack.changed', handleChanged);
};

const extractSavedLabelBounds = (xml: string) => {
  const boundsMap = new Map<string, LabelBounds>();
  const source = String(xml || '');
  if (!source) return boundsMap;

  const shapeOrEdgeRegex =
    /<bpmndi:(BPMNShape|BPMNEdge)[^>]*bpmnElement="([^"]+)"[^>]*>([\s\S]*?)<\/bpmndi:\1>/g;
  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = shapeOrEdgeRegex.exec(source))) {
    const bpmnElementId = String(blockMatch[2] || '').trim();
    const block = String(blockMatch[3] || '');
    if (!bpmnElementId || !block.includes('<bpmndi:BPMNLabel')) continue;

    const boundsMatch = block.match(
      /<dc:Bounds[^>]*x="([^"]+)"[^>]*y="([^"]+)"[^>]*width="([^"]+)"[^>]*height="([^"]+)"/
    );
    if (!boundsMatch) continue;

    const x = Number(boundsMatch[1]);
    const y = Number(boundsMatch[2]);
    const width = Number(boundsMatch[3]);
    const height = Number(boundsMatch[4]);
    if (![x, y, width, height].every((v) => Number.isFinite(v))) continue;

    boundsMap.set(`${bpmnElementId}_label`, { x, y, width, height });
  }
  return boundsMap;
};

const restoreLabelBounds = (boundsMap: Map<string, LabelBounds>) => {
  if (!bpmnModeler || boundsMap.size === 0) return;
  const elementRegistry = bpmnModeler.get('elementRegistry');
  const modeling = bpmnModeler.get('modeling');

  boundsMap.forEach((bounds, labelId) => {
    const label = elementRegistry.get(labelId);
    if (!label) return;
    try {
      modeling.resizeShape(label, bounds);
    } catch {
      // 忽略单个标签恢复失败，避免影响整体导入
    }
  });
};

const importDesignerXml = async (xml: string) => {
  if (!bpmnModeler) return;
  try {
    const sourceXml = xml || DEFAULT_BPMN_XML;
    const labelBoundsMap = extractSavedLabelBounds(sourceXml);
    await bpmnModeler.importXML(sourceXml);
    restoreLabelBounds(labelBoundsMap);
    syncTaskApproverList();
    await nextTick();
    const canvas = bpmnModeler.get('canvas');
    const container = bpmnContainerRef.value;
    // Dialog 刚打开时容器可能还未完成布局，直接 fit 会触发 non-finite scale
    if (container && container.clientWidth > 0 && container.clientHeight > 0) {
      try {
        canvas.zoom('fit-viewport');
      } catch {
        canvas.zoom(1);
      }
    } else {
      canvas.zoom(1);
    }
  } catch (error: any) {
    ElMessage.error(error?.message || 'BPMN XML 解析失败');
  }
};

const syncTaskApproverList = () => {
  if (!bpmnModeler) {
    taskApproverList.value = [];
    return;
  }
  const elementRegistry = bpmnModeler.get('elementRegistry');
  const canvas = bpmnModeler.get('canvas');
  const allElements = typeof elementRegistry?.getAll === 'function' ? elementRegistry.getAll() : [];

  // 按真实事件类型打 marker，避免依赖 ID 导致开始/中间/结束识别错误
  allElements.forEach((el: any) => {
    if (!el || el.labelTarget) return;
    canvas.removeMarker(el.id, 'wf-start-event');
    canvas.removeMarker(el.id, 'wf-intermediate-event');
    canvas.removeMarker(el.id, 'wf-end-event');
    const boType = String(el?.businessObject?.$type || '');
    if (boType === 'bpmn:StartEvent') {
      canvas.addMarker(el.id, 'wf-start-event');
    } else if (
      boType === 'bpmn:IntermediateCatchEvent' ||
      boType === 'bpmn:IntermediateThrowEvent'
    ) {
      canvas.addMarker(el.id, 'wf-intermediate-event');
    } else if (boType === 'bpmn:EndEvent') {
      canvas.addMarker(el.id, 'wf-end-event');
    }
  });

  const list = allElements
    .filter((el: any) => {
      if (!el || el.labelTarget) return false;
      const elementType = String(el.type || '');
      const boType = String(el?.businessObject?.$type || '');
      // 兼容不同建模场景：UserTask / Task 都纳入审批节点配置
      return (
        ['bpmn:UserTask', 'bpmn:Task'].includes(elementType) ||
        ['bpmn:UserTask', 'bpmn:Task'].includes(boType)
      );
    })
    .map((el: any) => {
      const bo = el.businessObject || {};
      const assignee = String(
        bo?.$attrs?.['camunda:assignee'] || bo?.['camunda:assignee'] || ''
      ).trim();
      return {
        id: String(el.id || ''),
        name: String(bo.name || el.id || ''),
        assignee
      };
    });
  taskApproverList.value = list;
};

const updateTaskAssignee = (item: { id: string; assignee: string }) => {
  if (!bpmnModeler) return;
  const elementRegistry = bpmnModeler.get('elementRegistry');
  const modeling = bpmnModeler.get('modeling');
  const element = elementRegistry.get(item.id);
  if (!element) return;
  const nextAssignee = String(item.assignee || '').trim();
  try {
    modeling.updateProperties(element, {
      'camunda:assignee': nextAssignee || undefined
    });
  } catch {
    // 某些 XML 未声明 camunda 命名空间时，回退到 attrs 直写
    const bo = element.businessObject;
    bo.$attrs = bo.$attrs || {};
    if (nextAssignee) {
      bo.$attrs['camunda:assignee'] = nextAssignee;
    } else {
      delete bo.$attrs['camunda:assignee'];
    }
  }
  syncTaskApproverList();
};

const loadUserOptions = async () => {
  if (userOptionLoading) return;
  userOptionLoading = true;
  try {
    const res: any = await getWorkflowUserOptions({ pageNum: 1, pageSize: 500 });
    const list = Array.isArray(res) ? res : res?.list || [];
    const map = new Map<string, { username: string; name: string }>();
    list.forEach((u: any) => {
      const username = String(u?.username || '').trim();
      if (!username) return;
      map.set(username, { username, name: String(u?.name || '').trim() });
    });
    userOptions.value = Array.from(map.values());
  } catch {
    userOptions.value = [];
  } finally {
    userOptionLoading = false;
  }
};

const onApproverSelectVisible = (visible: boolean) => {
  if (visible && userOptions.value.length === 0) {
    loadUserOptions();
  }
};

const openVisualDesigner = async (model: any) => {
  visualEditingModel.value = model;
  visualDesignerVisible.value = true;
};

const handleVisualDialogOpened = async () => {
  await nextTick();
  await loadUserOptions();
  await ensureModeler();
  await importDesignerXml(
    String(visualEditingModel.value?.bpmnXml || '').trim() || DEFAULT_BPMN_XML
  );
  // 弹窗 opened 后再补一次 fit，避免动画/布局抖动导致的偶发空白
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const canvas = bpmnModeler?.get?.('canvas');
      const container = bpmnContainerRef.value;
      if (!canvas || !container) return;
      if (container.clientWidth > 0 && container.clientHeight > 0) {
        try {
          canvas.zoom('fit-viewport');
        } catch {
          canvas.zoom(1);
        }
      }
    });
  });
};

const reloadCurrentXml = async () => {
  await importDesignerXml(
    String(visualEditingModel.value?.bpmnXml || '').trim() || DEFAULT_BPMN_XML
  );
};

const saveVisualDesigner = async () => {
  if (!bpmnModeler || !visualEditingModel.value) return;
  try {
    const result = await bpmnModeler.saveXML({ format: true });
    const nextXml = String(result?.xml || '');
    visualEditingModel.value.bpmnXml = nextXml;

    // 编辑已有模板时，直接落库，避免“视觉保存后刷新又回退”
    if (visualEditingModel.value?._id) {
      await updateWorkflowTemplate(String(visualEditingModel.value._id), { bpmnXml: nextXml });
      ElMessage.success('可视化流程已保存并同步到模板');
      return;
    }

    ElMessage.success('可视化流程已保存到 BPMN XML（新建模板请再点底部确定）');
  } catch (error: any) {
    ElMessage.error(error?.message || '保存 BPMN 失败');
  }
};

const handleVisualDialogClosed = () => {
  taskApproverList.value = [];
  if (unbindModelerEvents) {
    unbindModelerEvents();
    unbindModelerEvents = null;
  }
  if (bpmnModeler) {
    bpmnModeler.destroy();
    bpmnModeler = null;
  }
};

const columns: any[] = [
  { type: 'selection', fixed: 'left', width: 55 },
  { prop: 'name', label: '模板名称', search: { el: 'input' }, minWidth: 180 },
  { prop: 'key', label: '模板标识', search: { el: 'input' }, minWidth: 160 },
  {
    prop: 'status',
    label: '状态',
    width: 110,
    search: {
      el: 'select',
      options: [
        { label: '启用', value: 'enabled' },
        { label: '禁用', value: 'disabled' }
      ]
    }
  },
  { prop: 'updatedAt', label: '更新时间', minWidth: 180 },
  { prop: 'operation', label: '操作', width: 220, fixed: 'right' }
];

const getTableList = async (params: any) => {
  const res: any = await getWorkflowTemplates(params);
  return { data: res.list || [], total: res.total || 0 };
};

const onSubmit = async (formData: any, done: () => void) => {
  try {
    if (!formData.name || !formData.key) {
      ElMessage.warning('模板名称和标识不能为空');
      done();
      return;
    }
    const payload = { ...formData };
    if (!String(payload.bpmnXml || '').trim()) {
      payload.bpmnXml = DEFAULT_BPMN_XML;
    }
    if (formData._id) {
      await updateWorkflowTemplate(formData._id, payload);
      ElMessage.success('更新成功');
    } else {
      await createWorkflowTemplate(payload);
      ElMessage.success('创建成功');
    }
    done();
  } catch (error: any) {
    ElMessage.error(error.message || '提交失败');
    done();
  }
};

const onDelete = async (id: string) => {
  await deleteWorkflowTemplate(id);
  ElMessage.success('删除成功');
};

const openAdd = () => {
  proTableRef.value?.openAdd();
};

onBeforeUnmount(() => {
  handleVisualDialogClosed();
});
</script>

<style scoped>
.page-container {
  padding: 20px;
}

.simple-designer {
  width: 100%;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.simple-tip {
  color: var(--el-text-color-regular);
  font-size: 13px;
}

.bpmn-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.bpmn-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 10px;
}

.bpmn-container {
  width: 100%;
  height: 68vh;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  background: #fff;
}

.approver-panel {
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  background: var(--el-fill-color-lighter);
  padding: 10px;
  height: 68vh;
  overflow: auto;
}

.panel-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.panel-tip {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.task-list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-row {
  border: 1px solid var(--el-border-color-light);
  background: #fff;
  border-radius: 6px;
  padding: 8px;
}

.task-name {
  font-size: 13px;
  color: var(--el-text-color-primary);
  margin-bottom: 6px;
}

/* 兜底覆盖：避免被全局主题样式污染导致 BPMN 图形不可见 */
:deep(.bpmn-container .djs-container .djs-shape .djs-visual > rect),
:deep(.bpmn-container .djs-container .djs-shape .djs-visual > polygon),
:deep(.bpmn-container .djs-container .djs-shape .djs-visual > circle),
:deep(.bpmn-container .djs-container .djs-shape .djs-visual > ellipse),
:deep(.bpmn-container .djs-container .djs-shape .djs-visual > path) {
  stroke: #1f2937 !important;
  fill: #ffffff !important;
  stroke-width: 2px !important;
}

/* 开始/中间/结束事件差异化（按真实类型 marker） */
:deep(.bpmn-container .djs-container .wf-start-event .djs-visual > circle),
:deep(.bpmn-container .djs-container .wf-start-event .djs-visual > path) {
  stroke-width: 1.5px !important;
  stroke: #374151 !important;
}

:deep(.bpmn-container .djs-container .wf-intermediate-event .djs-visual > circle),
:deep(.bpmn-container .djs-container .wf-intermediate-event .djs-visual > path) {
  stroke-width: 2px !important;
  stroke: #1f2937 !important;
}

:deep(.bpmn-container .djs-container .wf-end-event .djs-visual > circle),
:deep(.bpmn-container .djs-container .wf-end-event .djs-visual > path) {
  stroke-width: 4px !important;
  stroke: #111827 !important;
}

:deep(.bpmn-container .djs-container .djs-connection .djs-visual > path) {
  stroke: #1f2937 !important;
  fill: none !important;
  stroke-width: 2px !important;
}

:deep(.bpmn-container .djs-container svg defs marker path) {
  stroke: #1f2937 !important;
  fill: #1f2937 !important;
}

:deep(.bpmn-container .djs-container .djs-label),
:deep(.bpmn-container .djs-container .djs-label tspan) {
  fill: #1f2937 !important;
}

:deep(.bpmn-container .djs-container .djs-shape.selected .djs-visual > rect),
:deep(.bpmn-container .djs-container .djs-shape.selected .djs-visual > polygon),
:deep(.bpmn-container .djs-container .djs-shape.selected .djs-visual > circle),
:deep(.bpmn-container .djs-container .djs-shape.selected .djs-visual > ellipse),
:deep(.bpmn-container .djs-container .djs-shape.selected .djs-visual > path) {
  stroke: #1677ff !important;
}
</style>
