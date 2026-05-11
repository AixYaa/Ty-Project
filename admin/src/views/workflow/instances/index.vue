<template>
  <div class="page-container">
    <ProTable
      ref="proTableRef"
      :columns="columns"
      :request-api="getTableList"
      row-key="_id"
      :tool-button="true"
    >
      <template #tableHeader>
        <el-button type="primary" :icon="CirclePlus" @click="openStartDialog"
          >启动流程实例</el-button
        >
      </template>

      <template #status="{ row }">
        <el-tag :type="(statusTagMap[row.status] as any) || 'info'">{{ row.status }}</el-tag>
      </template>

      <template #operation="{ row }">
        <el-button link type="primary" @click="showDetail(row)">详情</el-button>
        <el-button v-if="row.status === 'running'" link type="danger" @click="terminate(row)">
          终止
        </el-button>
      </template>
    </ProTable>

    <el-dialog v-model="startDialogVisible" title="启动流程实例" width="620px">
      <el-form :model="startForm" label-width="100px">
        <el-form-item label="流程模板">
          <el-select v-model="startForm.templateId" filterable style="width: 100%">
            <el-option
              v-for="item in templateOptions"
              :key="item._id"
              :label="`${item.name} (${item.key})`"
              :value="item._id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="实例标题">
          <el-input v-model="startForm.title" placeholder="例如：客户开户审批#20260506" />
        </el-form-item>
        <el-form-item label="业务ID">
          <el-input v-model="startForm.businessId" placeholder="例如：order_1001" />
        </el-form-item>
        <el-form-item label="首个处理人">
          <el-input v-model="startForm.assignee" placeholder="用户名（留空默认为当前用户）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="startDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="startInstance">启动</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailVisible" title="流程实例详情" :size="860">
      <el-descriptions v-if="detailData" :column="2" border>
        <el-descriptions-item label="实例标题">{{ detailData.title }}</el-descriptions-item>
        <el-descriptions-item label="模板">{{ detailData.templateName }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ detailData.status }}</el-descriptions-item>
        <el-descriptions-item label="当前任务">{{
          detailData.currentTaskTitle || '-'
        }}</el-descriptions-item>
        <el-descriptions-item label="业务ID">{{
          detailData.businessId || '-'
        }}</el-descriptions-item>
        <el-descriptions-item label="发起人">{{ detailData.startedBy }}</el-descriptions-item>
      </el-descriptions>
      <el-divider>任务轨迹</el-divider>
      <el-table :data="detailData?.tasks || []" border>
        <el-table-column prop="title" label="任务标题" min-width="180" />
        <el-table-column prop="assignee" label="处理人" width="140" />
        <el-table-column prop="status" label="状态" width="120" />
        <el-table-column prop="handledBy" label="实际处理人" width="140" />
        <el-table-column prop="handledAt" label="处理时间" min-width="180" />
      </el-table>
      <el-divider>审批日志</el-divider>
      <el-timeline>
        <el-timeline-item
          v-for="(item, idx) in detailData?.history || []"
          :key="`${idx}-${item.at}`"
          :timestamp="formatTime(item.at)"
          placement="top"
        >
          <div class="history-line">
            <span class="history-action">{{ item.action }}</span>
            <span>操作人：{{ item.operator }}</span>
            <span v-if="item.comment">备注：{{ item.comment }}</span>
          </div>
        </el-timeline-item>
      </el-timeline>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { CirclePlus } from '@element-plus/icons-vue';
import ProTable from '@/components/ProTable/index.vue';
import {
  getWorkflowTemplates,
  getWorkflowInstances,
  getWorkflowInstanceDetail,
  startWorkflowInstance,
  terminateWorkflowInstance
} from '@/api/workflow';

const proTableRef = ref();
const startDialogVisible = ref(false);
const detailVisible = ref(false);
const detailData = ref<any>(null);
const templateOptions = ref<any[]>([]);

const statusTagMap: Record<string, string> = {
  running: 'warning',
  completed: 'success',
  rejected: 'danger',
  terminated: 'info'
};

const startForm = reactive({
  templateId: '',
  title: '',
  businessId: '',
  assignee: ''
});

const columns: any[] = [
  { prop: 'title', label: '实例标题', minWidth: 200, search: { el: 'input' } },
  { prop: 'templateName', label: '流程模板', minWidth: 180, search: { el: 'input' } },
  { prop: 'businessId', label: '业务ID', minWidth: 160, search: { el: 'input' } },
  {
    prop: 'status',
    label: '状态',
    width: 120,
    search: {
      el: 'select',
      options: [
        { label: '运行中', value: 'running' },
        { label: '已完成', value: 'completed' },
        { label: '已驳回', value: 'rejected' },
        { label: '已终止', value: 'terminated' }
      ]
    }
  },
  { prop: 'startedBy', label: '发起人', width: 140 },
  { prop: 'currentTaskTitle', label: '当前任务', minWidth: 180 },
  { prop: 'createdAt', label: '创建时间', minWidth: 180 },
  { prop: 'operation', label: '操作', width: 160, fixed: 'right' }
];

const getTableList = async (params: any) => {
  const res: any = await getWorkflowInstances(params);
  return { data: res.list || [], total: res.total || 0 };
};

const openStartDialog = async () => {
  const res: any = await getWorkflowTemplates({ pageNum: 1, pageSize: 200, status: 'enabled' });
  templateOptions.value = res.list || [];
  startForm.templateId = '';
  startForm.title = '';
  startForm.businessId = '';
  startForm.assignee = '';
  startDialogVisible.value = true;
};

const startInstance = async () => {
  if (!startForm.templateId) {
    ElMessage.warning('请选择流程模板');
    return;
  }
  await startWorkflowInstance({ ...startForm });
  ElMessage.success('流程实例已启动');
  startDialogVisible.value = false;
  proTableRef.value?.getTableList();
};

const showDetail = async (row: any) => {
  detailData.value = await getWorkflowInstanceDetail(row._id);
  detailVisible.value = true;
};

const terminate = async (row: any) => {
  await ElMessageBox.confirm('确认终止该流程实例？', '提示', { type: 'warning' });
  await terminateWorkflowInstance(row._id, { comment: '管理端手动终止' });
  ElMessage.success('实例已终止');
  proTableRef.value?.getTableList();
};

const formatTime = (value: any) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
};
</script>

<style scoped>
.page-container {
  padding: 20px;
}

.history-line {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.history-action {
  font-weight: 600;
}
</style>
