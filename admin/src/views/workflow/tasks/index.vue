<template>
  <div class="page-container">
    <ProTable
      ref="proTableRef"
      :columns="columns"
      :request-api="getTableList"
      row-key="_id"
      :tool-button="true"
    >
      <template #status="{ row }">
        <el-tag :type="(statusTagMap[row.status] as any) || 'info'">{{ row.status }}</el-tag>
      </template>

      <template #operation="{ row }">
        <template v-if="row.status === 'pending'">
          <el-button link type="success" @click="openHandle(row, 'approve')">通过</el-button>
          <el-button link type="danger" @click="openHandle(row, 'reject')">驳回</el-button>
          <el-button link type="warning" @click="openHandle(row, 'back')">回退</el-button>
        </template>
        <span v-else>-</span>
      </template>
    </ProTable>

    <el-dialog v-model="handleVisible" title="处理任务" width="560px">
      <el-form :model="handleForm" label-width="100px">
        <el-form-item label="动作">
          <el-tag>{{ actionLabelMap[handleForm.action] }}</el-tag>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="handleForm.comment"
            type="textarea"
            :rows="3"
            placeholder="请输入处理意见"
          />
        </el-form-item>
        <el-form-item v-if="handleForm.action !== 'reject'" label="下一处理人">
          <el-input
            v-model="handleForm.nextAssignee"
            placeholder="留空则自动结束（通过）或回退给发起人（回退）"
          />
        </el-form-item>
        <el-form-item v-if="handleForm.action !== 'reject'" label="下一任务标题">
          <el-input v-model="handleForm.nextTitle" placeholder="例如：部门负责人审批" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleVisible = false">取消</el-button>
        <el-button type="primary" @click="submitHandle">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import ProTable from '@/components/ProTable/index.vue';
import { getWorkflowTasks, handleWorkflowTask } from '@/api/workflow';
import { useUserStore } from '@/store/user';

const proTableRef = ref();
const handleVisible = ref(false);
const currentTaskId = ref('');
const userStore = useUserStore();

const actionLabelMap: Record<string, string> = {
  approve: '通过',
  reject: '驳回',
  back: '回退'
};
const statusTagMap: Record<string, string> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  returned: 'info'
};

const handleForm = reactive({
  action: 'approve',
  comment: '',
  nextAssignee: '',
  nextTitle: ''
});

const columns: any[] = [
  { prop: 'title', label: '任务标题', minWidth: 180, search: { el: 'input' } },
  { prop: 'instanceId', label: '实例ID', minWidth: 180, search: { el: 'input' } },
  { prop: 'assignee', label: '处理人', width: 140, search: { el: 'input' } },
  {
    prop: 'status',
    label: '状态',
    width: 120,
    search: {
      el: 'select',
      options: [
        { label: '待处理', value: 'pending' },
        { label: '已通过', value: 'approved' },
        { label: '已驳回', value: 'rejected' },
        { label: '已回退', value: 'returned' }
      ]
    }
  },
  { prop: 'createdAt', label: '创建时间', minWidth: 180 },
  { prop: 'handledAt', label: '处理时间', minWidth: 180 },
  { prop: 'operation', label: '操作', width: 180, fixed: 'right' }
];

const getTableList = async (params: any) => {
  const username = String(userStore.userInfo?.username || '').trim();
  const isSuperAdmin = userStore.permissions.includes('*');
  const query = { ...params };
  if (!isSuperAdmin && username) {
    query.assignee = username;
  }
  const res: any = await getWorkflowTasks(query);
  return { data: res.list || [], total: res.total || 0 };
};

const openHandle = (row: any, action: 'approve' | 'reject' | 'back') => {
  currentTaskId.value = row._id;
  handleForm.action = action;
  handleForm.comment = '';
  handleForm.nextAssignee = '';
  handleForm.nextTitle = '';
  handleVisible.value = true;
};

const submitHandle = async () => {
  if (!currentTaskId.value) return;
  await handleWorkflowTask(currentTaskId.value, { ...handleForm });
  ElMessage.success('任务处理成功');
  handleVisible.value = false;
  proTableRef.value?.getTableList();
};
</script>

<style scoped>
.page-container {
  padding: 20px;
}
</style>
