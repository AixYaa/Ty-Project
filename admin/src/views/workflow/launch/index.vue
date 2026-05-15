<template>
  <div class="page-container">
    <el-card shadow="never" class="mb-12">
      <template #header>
        <div class="card-header">
          <span>流程发起中心</span>
          <el-button link type="primary" @click="refreshTemplates">刷新</el-button>
        </div>
      </template>
      <el-empty v-if="templateList.length === 0" description="暂无可发起流程" />
      <div v-else class="template-grid">
        <el-card v-for="item in templateList" :key="item._id" class="template-item" shadow="hover">
          <div class="template-title">{{ item.name }}</div>
          <div class="template-key">{{ item.key }}</div>
          <div class="template-desc">{{ item.description || '暂无描述' }}</div>
          <div class="template-actions">
            <el-button type="primary" @click="openStart(item)">去申请</el-button>
          </div>
        </el-card>
      </div>
    </el-card>

    <ProTable ref="proTableRef" :columns="columns" :request-api="getMyInstanceList" row-key="_id">
      <template #tableHeader>
        <span class="table-title">我的流程申请</span>
      </template>
      <template #status="{ row }">
        <el-tag
          :type="
            (statusTagMap[row.status] as 'success' | 'warning' | 'info' | 'primary' | 'danger') ||
            'info'
          "
          >{{ row.status }}</el-tag
        >
      </template>
      <template #operation="{ row }">
        <el-button link type="primary" @click="showDetail(row)">运行日志</el-button>
      </template>
    </ProTable>

    <el-drawer v-model="startVisible" title="发起流程" :size="620">
      <el-form :model="startForm" label-width="110px">
        <el-form-item label="流程模板">
          <el-input :value="currentTemplate?.name || '-'" disabled />
        </el-form-item>
        <el-form-item label="申请标题">
          <el-input v-model="startForm.title" placeholder="例如：张三请假申请" />
        </el-form-item>
        <el-form-item label="业务单号">
          <el-input v-model="startForm.businessId" placeholder="例如：leave_20260507_001" />
        </el-form-item>
        <el-form-item
          v-for="field in startFields"
          :key="field.field"
          :label="field.label"
          :required="Boolean(field.required)"
        >
          <el-input
            v-if="field.type === 'input'"
            v-model="startForm.variables[field.field]"
            :placeholder="field.placeholder || `请输入${field.label}`"
          />
          <el-input
            v-else-if="field.type === 'textarea'"
            v-model="startForm.variables[field.field]"
            :rows="3"
            type="textarea"
            :placeholder="field.placeholder || `请输入${field.label}`"
          />
          <el-input-number
            v-else-if="field.type === 'number'"
            v-model="startForm.variables[field.field]"
            :placeholder="field.placeholder || `请输入${field.label}`"
            style="width: 100%"
          />
          <el-date-picker
            v-else-if="field.type === 'date'"
            v-model="startForm.variables[field.field]"
            type="date"
            value-format="YYYY-MM-DD"
            style="width: 100%"
            :placeholder="field.placeholder || `请选择${field.label}`"
          />
          <el-input
            v-else
            v-model="startForm.variables[field.field]"
            :placeholder="field.placeholder || `请输入${field.label}`"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="startVisible = false">取消</el-button>
        <el-button type="primary" @click="submitStart">提交并启动</el-button>
      </template>
    </el-drawer>

    <el-drawer v-model="detailVisible" title="流程运行日志" :size="860">
      <el-descriptions v-if="detailData" :column="2" border>
        <el-descriptions-item label="实例标题">{{ detailData.title }}</el-descriptions-item>
        <el-descriptions-item label="流程模板">{{ detailData.templateName }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ detailData.status }}</el-descriptions-item>
        <el-descriptions-item label="当前任务">{{
          detailData.currentTaskTitle || '-'
        }}</el-descriptions-item>
        <el-descriptions-item label="发起人">{{ detailData.startedBy }}</el-descriptions-item>
        <el-descriptions-item label="业务单号">{{
          detailData.businessId || '-'
        }}</el-descriptions-item>
      </el-descriptions>
      <el-divider>审批日志</el-divider>
      <el-timeline>
        <el-timeline-item
          v-for="(item, idx) in detailData?.history || []"
          :key="`${idx}-${item.at}`"
          :timestamp="formatTime(item.at)"
          placement="top"
        >
          <div class="log-line">
            <span class="action">{{ item.action }}</span>
            <span>操作人：{{ item.operator }}</span>
            <span v-if="item.comment">备注：{{ item.comment }}</span>
          </div>
        </el-timeline-item>
      </el-timeline>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useUserStore } from '@/store/user';
import ProTable from '@/components/ProTable/index.vue';
import {
  getWorkflowTemplates,
  startWorkflowInstance,
  getWorkflowInstances,
  getWorkflowInstanceDetail
} from '@/api/workflow';

const userStore = useUserStore();
const proTableRef = ref();
const templateList = ref<any[]>([]);
const currentTemplate = ref<any>(null);
const startVisible = ref(false);
const detailVisible = ref(false);
const detailData = ref<any>(null);

const startForm = reactive<any>({
  templateId: '',
  title: '',
  businessId: '',
  variables: {}
});

const statusTagMap: Record<string, 'success' | 'warning' | 'info' | 'primary' | 'danger'> = {
  running: 'warning',
  completed: 'success',
  rejected: 'danger',
  terminated: 'info'
};

const columns: any[] = [
  { prop: 'title', label: '实例标题', minWidth: 220, search: { el: 'input' } },
  { prop: 'templateName', label: '流程模板', minWidth: 180, search: { el: 'input' } },
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
  { prop: 'currentTaskTitle', label: '当前任务', minWidth: 180 },
  { prop: 'createdAt', label: '发起时间', minWidth: 180 },
  { prop: 'operation', label: '操作', width: 120, fixed: 'right' }
];

const startFields = computed(() => {
  const schema = currentTemplate.value?.startFormSchema;
  if (!Array.isArray(schema)) return [];
  return schema
    .map((item: any) => ({
      field: String(item?.field || '').trim(),
      label: String(item?.label || '').trim(),
      type: String(item?.type || 'input'),
      required: Boolean(item?.required),
      placeholder: String(item?.placeholder || '')
    }))
    .filter((item: any) => item.field && item.label);
});

const refreshTemplates = async () => {
  const res: any = await getWorkflowTemplates({ pageNum: 1, pageSize: 300, status: 'enabled' });
  templateList.value = res.list || [];
};

const openStart = (template: any) => {
  currentTemplate.value = template;
  startForm.templateId = template._id;
  startForm.title = `${template.name}申请`;
  startForm.businessId = '';
  startForm.variables = {};
  startFields.value.forEach((field: any) => {
    startForm.variables[field.field] = field.type === 'number' ? undefined : '';
  });
  startVisible.value = true;
};

const submitStart = async () => {
  if (!startForm.templateId) {
    ElMessage.warning('模板信息丢失，请重新选择');
    return;
  }
  for (const field of startFields.value) {
    if (field.required) {
      const value = startForm.variables[field.field];
      if (value === '' || value === null || value === undefined) {
        ElMessage.warning(`请填写：${field.label}`);
        return;
      }
    }
  }
  const approverChain = Array.isArray(currentTemplate.value?.defaultApprovers)
    ? currentTemplate.value.defaultApprovers
    : [];
  await startWorkflowInstance({
    templateId: startForm.templateId,
    title: startForm.title,
    businessId: startForm.businessId,
    variables: startForm.variables,
    approverChain
  });
  ElMessage.success('流程已启动');
  startVisible.value = false;
  proTableRef.value?.getTableList();
};

const getMyInstanceList = async (params: any) => {
  const username = String(userStore.userInfo?.username || '').trim();
  const res: any = await getWorkflowInstances({
    ...params,
    startedBy: username
  });
  return { data: res.list || [], total: res.total || 0 };
};

const showDetail = async (row: any) => {
  detailData.value = await getWorkflowInstanceDetail(row._id);
  detailVisible.value = true;
};

const formatTime = (value: any) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
};

refreshTemplates();
</script>

<style scoped>
.page-container {
  padding: 20px;
}

.mb-12 {
  margin-bottom: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.template-item {
  min-height: 160px;
}

.template-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.template-key {
  font-size: 12px;
  color: var(--el-color-info);
  margin-bottom: 8px;
}

.template-desc {
  color: var(--el-text-color-regular);
  font-size: 13px;
  min-height: 44px;
}

.template-actions {
  margin-top: 10px;
}

.table-title {
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.log-line {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.action {
  font-weight: 600;
}
</style>
