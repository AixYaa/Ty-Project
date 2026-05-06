<template>
  <el-drawer
    v-model="visible"
    title="AI 助手"
    direction="rtl"
    :size="`${drawerWidth}px`"
    :before-close="handleClose"
  >
    <div class="ai-container">
      <XProvider>
        <div class="chat-main">
          <aside class="conversation-panel" :class="{ collapsed: conversationPanelCollapsed }">
            <div class="conversation-panel-header">
              <span v-if="!conversationPanelCollapsed" class="conversation-title">会话列表</span>
              <el-button
                text
                size="small"
                :icon="conversationPanelCollapsed ? ArrowRight : ArrowLeft"
                @click="conversationPanelCollapsed = !conversationPanelCollapsed"
              />
            </div>

            <template v-if="!conversationPanelCollapsed">
              <div class="conversation-actions">
                <el-button
                  type="primary"
                  :icon="Plus"
                  class="new-chat-btn"
                  @click="createNewConversation"
                  >新建会话</el-button
                >
              </div>
              <div class="conversation-list-wrap">
                <Conversations
                  :items="conversationItems"
                  :active-key="activeConversationKey"
                  :menu="conversationMenu"
                  :style="conversationPanelStyle"
                  :styles="conversationStyles"
                  :class-names="conversationClassNames"
                  @active-change="handleConversationActiveChange"
                />
              </div>
            </template>
          </aside>

          <div class="chat-content">
            <div ref="messagesContainer" class="messages-container">
              <div v-if="messages.length === 0" class="empty-state">
                <el-icon size="48"><ChatDotRound /></el-icon>
                <p>开始和 AI 助手对话吧！</p>
                <div class="quick-prompts">
                  <el-tag @click="sendQuickPrompt('帮我分析一下最近的API调用情况')"
                    >分析API调用</el-tag
                  >
                  <el-tag @click="sendQuickPrompt('给我介绍一下当前系统的功能模块')"
                    >系统介绍</el-tag
                  >
                  <el-tag @click="sendQuickPrompt('最近谁在变更菜单或实体？')">操作审计分析</el-tag>
                </div>
              </div>
              <Bubble.List
                v-if="messages.length > 0 || loading"
                :items="bubbleItems"
                :roles="bubbleRoles"
                :auto-scroll="true"
              >
                <template #loading="{ item }">
                  <ASpace v-if="item.role === 'assistant'">
                    <ASpin size="small" />
                    <span>思考中...</span>
                  </ASpace>
                </template>
                <template #avatar="{ item }">
                  <AAvatar v-if="item.role === 'assistant'" class="bubble-avatar ai-avatar">
                    <template #icon><ChatDotRound /></template>
                  </AAvatar>
                  <AAvatar v-else class="bubble-avatar user-avatar">
                    <template #icon><User /></template>
                  </AAvatar>
                </template>
                <template #header="{ item }">
                  <div class="bubble-header">
                    {{ item.role === 'assistant' ? 'AI 助手' : '我' }}
                  </div>
                </template>
                <template #message="{ item }">
                  <div class="bubble-message-wrap">
                    <div
                      v-if="item.role === 'assistant' && item.thoughts?.length"
                      class="think-panel"
                    >
                      <div class="think-panel-head">
                        <ASpace size="small">
                          <ChatDotRound />
                          <span>{{ item.loading ? '深度思考中...' : '已深度思考' }}</span>
                        </ASpace>
                        <AButton
                          type="text"
                          size="small"
                          class="think-toggle-btn"
                          :icon="isThoughtCollapsed(item.key) ? h(ArrowDown) : h(ArrowUp)"
                          @click="toggleThought(item.key)"
                        />
                      </div>
                      <div v-show="!isThoughtCollapsed(item.key)" class="think-panel-body">
                        <div
                          v-for="(line, idx) in item.thoughts"
                          :key="`${item.key}-thought-${idx}`"
                          class="think-line"
                        >
                          <div class="think-step-title">{{ line.title }}</div>
                          <div v-if="line.thought" class="think-step-desc">
                            思考：{{ line.thought }}
                          </div>
                        </div>
                        <div v-if="item.planRaw" class="plan-raw-wrap">
                          <div class="plan-raw-head">
                            <ASpace size="small">
                              <span>AI规划原文（JSON）</span>
                            </ASpace>
                            <AButton
                              type="text"
                              size="small"
                              class="think-toggle-btn"
                              :icon="isPlanRawCollapsed(item.key) ? h(ArrowDown) : h(ArrowUp)"
                              @click="togglePlanRaw(item.key)"
                            />
                          </div>
                          <pre v-show="!isPlanRawCollapsed(item.key)" class="plan-raw-code">{{
                            item.planRaw
                          }}</pre>
                        </div>
                        <Loading v-if="item.loading" class="think-loading-icon" />
                      </div>
                    </div>
                    <div class="md-content" v-html="markdownToHtml(item.content || '')"></div>
                  </div>
                </template>
                <template #footer="{ item }">
                  <div class="bubble-footer">{{ item.footer || '' }}</div>
                </template>
              </Bubble.List>
            </div>

            <div class="input-container">
              <Sender
                :value="inputMessage"
                placeholder="输入消息，Shift+Enter换行，Enter发送..."
                :loading="loading"
                :submit-type="'enter'"
                :auto-size="{ minRows: 2, maxRows: 6 }"
                :styles="senderStyles"
                :footer="renderSenderFooter"
                :actions="false"
                @change="handleSenderChange"
                @submit="handleSend"
                @cancel="handleCancel"
              />
            </div>
          </div>
        </div>
      </XProvider>
    </div>
  </el-drawer>

  <div
    v-if="visible"
    class="drawer-resize-handle"
    :style="{ right: `${drawerWidth}px` }"
    title="拖动调整宽度"
    @mousedown.prevent="startResize"
  >
    <div class="resize-dots"><span></span><span></span><span></span></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, h, onBeforeUnmount, reactive } from 'vue';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChatDotRound,
  Loading,
  Plus,
  User
} from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/utils/request';
import {
  Bubble,
  Conversations,
  Sender,
  XProvider,
  type ConversationsProps
} from 'ant-design-x-vue';
import {
  Button as AButton,
  Avatar as AAvatar,
  Divider as ADivider,
  Flex as AFlex,
  Space as ASpace,
  Select as ASelect,
  Spin as ASpin,
  Switch as ASwitch,
  theme
} from 'ant-design-vue';
import { getToken } from '@/utils/auth';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  thoughts?: ThoughtStep[];
  planRaw?: string;
  timestamp?: number;
}

interface ThoughtStep {
  title: string;
  thought?: string;
}

interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>();

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const messages = ref<Message[]>([]);
const inputMessage = ref('');
const loading = ref(false);
const streamAbortController = ref<AbortController | null>(null);
const messagesContainer = ref<HTMLElement | null>(null);
const conversations = ref<ConversationSummary[]>([]);
const currentConversationId = ref('');
const drawerWidth = ref(1260);
const conversationPanelCollapsed = ref(false);
let resizeStartX = 0;
let resizeStartWidth = 560;

const currentModel = ref('mimo-v2.5-pro');
const useProjectContext = ref(true);
const currentModelMap: Record<string, string[]> = {
  mimo: ['mimo-v2.5-pro', 'mimo-v2.5', 'mimo-v2-pro', 'mimo-v2-flash']
};

const { token } = theme.useToken();
const availableModels = computed(() => currentModelMap['mimo'] || []);

const conversationPanelStyle = computed(() => ({
  width: '100%',
  background: 'transparent',
  borderRadius: `${token.value.borderRadius}px`
}));

const conversationStyles = computed<ConversationsProps['styles']>(() => ({
  item: {
    color: token.value.colorText,
    background: token.value.colorFillTertiary,
    border: `1px solid ${token.value.colorBorderSecondary}`,
    borderRadius: token.value.borderRadiusLG
  }
}));

const conversationClassNames: ConversationsProps['classNames'] = {
  item: 'ax-conversation-item'
};

const senderStyles = computed(() => ({
  input: {
    color: token.value.colorText,
    background: 'transparent'
  }
}));

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

const conversationItems = computed<ConversationsProps['items']>(() =>
  conversations.value.map((item) => ({
    key: item.id,
    label: item.title || '未命名会话',
    timestamp: new Date(item.updatedAt).getTime()
  }))
);

const activeConversationKey = computed(() => currentConversationId.value || undefined);

const deleteConversationById = async (id: string) => {
  if (!id) return;
  try {
    await ElMessageBox.confirm('确认删除该会话吗？', '提示', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    });
    await request.delete(`/ai/conversations/${id}`);
    ElMessage.success('会话已删除');
    if (currentConversationId.value === id) {
      currentConversationId.value = '';
      messages.value = [];
    }
    await loadConversations();
  } catch {
    // ignore user cancel
  }
};

const conversationMenu: ConversationsProps['menu'] = (conversation) => ({
  items: [
    { label: '重命名（预留）', key: 'operation1' },
    { label: '停用（预留）', key: 'operation2', disabled: true },
    { label: '删除会话', key: 'operation3', danger: true }
  ],
  onClick: async (menuInfo) => {
    menuInfo.domEvent.stopPropagation();
    const targetId = String(conversation.key);
    if (menuInfo.key === 'operation3') {
      await deleteConversationById(targetId);
      return;
    }
    ElMessage.info(`点击 ${targetId} - ${String(menuInfo.key)}`);
  }
});

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const markdownToHtml = (raw: string) => {
  const safe = escapeHtml(raw || '');
  return safe
    .replace(
      /```(\w+)?\n([\s\S]*?)```/g,
      '<pre class="md-pre"><code class="md-code">$2</code></pre>'
    )
    .replace(/^###\s(.+)$/gm, '<h3 class="md-h3">$1</h3>')
    .replace(/^##\s(.+)$/gm, '<h2 class="md-h2">$1</h2>')
    .replace(/^#\s(.+)$/gm, '<h1 class="md-h1">$1</h1>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>')
    .replace(/\n/g, '<br>');
};

const bubbleRoles = {
  user: {
    placement: 'end' as const,
    variant: 'filled' as const,
    shape: 'round' as const,
    style: {
      maxWidth: '62%',
      marginInlineStart: 'auto',
      marginInlineEnd: '0'
    }
  },
  assistant: {
    placement: 'start' as const,
    variant: 'outlined' as const,
    shape: 'round' as const,
    style: { maxWidth: '82%', marginInlineEnd: '36px' },
    styles: { footer: { width: '100%' } }
  }
};

const thoughtCollapsed = reactive<Record<string, boolean>>({});
const planRawCollapsed = reactive<Record<string, boolean>>({});

const isThoughtCollapsed = (key: string) => !!thoughtCollapsed[key];

const toggleThought = (key: string) => {
  thoughtCollapsed[key] = !thoughtCollapsed[key];
};

const isPlanRawCollapsed = (key: string) => planRawCollapsed[key] !== false;

const togglePlanRaw = (key: string) => {
  planRawCollapsed[key] = !isPlanRawCollapsed(key);
};

const parseThoughtBundle = (content: string) => {
  const raw = String(content || '').trim();
  const planToken = 'AI规划原文（JSON）：';
  const planStart = raw.indexOf(planToken);
  const main = planStart >= 0 ? raw.slice(0, planStart).trim() : raw;
  const planRaw = planStart >= 0 ? raw.slice(planStart + planToken.length).trim() : '';

  if (!main.includes('思考过程：')) {
    return { thoughts: [] as ThoughtStep[], answer: main, planRaw };
  }
  const thinkStart = main.indexOf('思考过程：') + '思考过程：'.length;
  const answerStartCandidates = ['执行结果：', '已按你的对话自动执行完成：']
    .map((token) => raw.indexOf(token))
    .filter((idx) => idx >= 0);
  const answerStart = answerStartCandidates.length > 0 ? Math.min(...answerStartCandidates) : -1;

  const thoughtText = (
    answerStart >= 0 ? main.slice(thinkStart, answerStart) : main.slice(thinkStart)
  ).trim();
  const thoughts = thoughtText
    .split('\n')
    .map((line) => line.replace(/^\s*-\s*/, '').trim())
    .filter(Boolean);
  const thoughtSteps = thoughts.map((title) => ({ title }));

  const answer =
    answerStart >= 0
      ? main
          .slice(answerStart)
          .replace(/^执行结果：\s*/, '')
          .trim()
      : main;
  return { thoughts: thoughtSteps, answer, planRaw };
};

const bubbleItems = computed(() => {
  const items: any[] = messages.value.map((msg, index) => {
    const isStreamingAssistant =
      loading.value && msg.role !== 'user' && index === messages.value.length - 1 && !msg.content;
    const parsed =
      msg.role === 'assistant'
        ? parseThoughtBundle(msg.content)
        : { thoughts: [] as ThoughtStep[], answer: msg.content, planRaw: '' };
    const thoughts = msg.thoughts && msg.thoughts.length > 0 ? msg.thoughts : parsed.thoughts;

    return {
      key: `${msg.role}-${index}-${msg.timestamp || Date.now()}`,
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: isStreamingAssistant ? '' : parsed.answer || msg.content,
      thoughts,
      planRaw: msg.planRaw || parsed.planRaw || '',
      loading: isStreamingAssistant,
      footer: msg.timestamp ? formatTime(msg.timestamp) : undefined
    };
  });
  return items;
});

const handleModelChange = () => {
  localStorage.setItem('ai_model', currentModel.value);
  localStorage.setItem('ai_use_project_context', String(useProjectContext.value));
};

const handleClose = () => {
  visible.value = false;
};

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

const loadConversations = async () => {
  const list = (await request.get('/ai/conversations')) as any[];
  conversations.value = (list || []).map((item: any) => ({
    id: item.id,
    title: item.title,
    updatedAt: item.updatedAt
  }));
  if (
    currentConversationId.value &&
    !conversations.value.some((c) => c.id === currentConversationId.value)
  ) {
    currentConversationId.value = '';
    messages.value = [];
  }
};

const handleConversationChange = async (id?: string) => {
  if (!id) return;
  const detail = (await request.get(`/ai/conversations/${id}`)) as any;
  messages.value = detail?.messages || [];
  currentConversationId.value = id;
  if (detail?.model) currentModel.value = detail.model;
  if (typeof detail?.useProjectContext === 'boolean') {
    useProjectContext.value = detail.useProjectContext;
  }
  scrollToBottom();
};

const handleConversationActiveChange = (key: string | number) => {
  void handleConversationChange(String(key));
};

const createNewConversation = () => {
  currentConversationId.value = '';
  messages.value = [];
};

const handleSenderChange = (value: string) => {
  inputMessage.value = value;
};

const handleCancel = () => {
  if (streamAbortController.value) streamAbortController.value.abort();
  loading.value = false;
};

const isAutoBuildIntent = (text: string) => {
  const normalized = String(text || '');
  return (
    /(创建|新建|生成).*(页面|界面)/.test(normalized) ||
    /(添加|创建).*(实体|菜单|架构|视图)/.test(normalized)
  );
};

type AutoBuildResult = {
  summary: string;
  entity?: { name: string; displayName?: string };
  menu?: { path: string; name?: string };
  schema?: { name: string };
  view?: { name: string };
  thoughts?: Array<ThoughtStep | string>;
  planRaw?: string;
};

type AutoBuildProgress = {
  step: number;
  total: number;
  percent: number;
  message: string;
  thought?: string;
};

type AutoBuildErrorPayload = {
  error?: string;
  rollbackTips?: string[];
};

const normalizeThoughtSteps = (raw: Array<ThoughtStep | string> = []): ThoughtStep[] =>
  raw
    .map((item) =>
      typeof item === 'string'
        ? { title: item.replace(/^-+\s*/, '').trim() }
        : {
            title: String(item.title || '').trim(),
            thought: item.thought ? String(item.thought) : ''
          }
    )
    .filter((item) => !!item.title);

const formatAutoBuildLines = (result: AutoBuildResult, progressSteps: ThoughtStep[] = []) => {
  const thoughtLines =
    result.thoughts && result.thoughts.length > 0
      ? normalizeThoughtSteps(result.thoughts)
      : progressSteps;
  const lines = [
    '已按你的对话自动执行完成：',
    `- ${result.summary || '页面构建完成'}`,
    result.entity
      ? `- 实体：${result.entity.displayName || result.entity.name} (\`${result.entity.name}\`)`
      : '',
    result.view ? `- 视图：${result.view.name}` : '',
    result.schema ? `- 架构：${result.schema.name}` : '',
    result.menu ? `- 菜单：${result.menu.name || ''} (\`${result.menu.path}\`)` : '',
    '- 你现在刷新页面后，在左侧菜单即可看到新页面。'
  ].filter(Boolean);
  return { answer: lines.join('\n'), thoughts: thoughtLines, planRaw: result.planRaw || '' };
};

const executeAutoBuildFromChat = async (instruction: string, assistantIndex: number) => {
  const tokenValue = getToken();
  streamAbortController.value = new AbortController();
  const response = await fetch(`${import.meta.env.VITE_API_URL}/ai/agent/build-page/stream`, {
    method: 'POST',
    signal: streamAbortController.value.signal,
    headers: {
      'Content-Type': 'application/json',
      ...(tokenValue ? { Authorization: `Bearer ${tokenValue}` } : {})
    },
    body: JSON.stringify({
      instruction,
      model: currentModel.value,
      conversationId: currentConversationId.value || undefined,
      useProjectContext: useProjectContext.value
    })
  });

  if (!response.ok || !response.body) {
    throw new Error((await response.text()) || '自动建页请求失败');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  const progressSteps: ThoughtStep[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() || '';

    for (const chunk of chunks) {
      if (!chunk.trim()) continue;
      const eventType = chunk.match(/^event:\s*(.+)$/m)?.[1]?.trim() || 'message';
      const data = chunk.match(/^data:\s*(.+)$/m)?.[1]?.trim();
      if (!data) continue;

      if (eventType === 'error') {
        let payload: AutoBuildErrorPayload | null = null;
        try {
          payload = JSON.parse(data) as AutoBuildErrorPayload;
        } catch {
          payload = null;
        }
        const baseMessage = payload?.error || '自动建页流式响应失败';
        const tips = Array.isArray(payload?.rollbackTips) ? payload!.rollbackTips : [];
        const tipMessage = tips.length > 0 ? `\n\n回滚提示：\n- ${tips.join('\n- ')}` : '';
        throw new Error(`${baseMessage}${tipMessage}`);
      }

      if (eventType === 'done' || data === '[DONE]') {
        continue;
      }

      try {
        const payload = JSON.parse(data);
        if (eventType === 'conversation') {
          if (payload?.conversationId) currentConversationId.value = payload.conversationId;
        } else if (eventType === 'progress') {
          const progress = payload as AutoBuildProgress;
          const message = String(progress?.message || '').trim();
          const percent = Number(progress?.percent || 0);
          if (message && messages.value[assistantIndex]) {
            progressSteps.push({
              title: `[${percent}%] ${message}`,
              thought: String(progress?.thought || '').trim()
            });
            messages.value[assistantIndex].thoughts = [...progressSteps];
            messages.value[assistantIndex].content = '正在执行中，请稍候...';
            scrollToBottom();
          }
        } else if (eventType === 'result') {
          if (messages.value[assistantIndex]) {
            const formatted = formatAutoBuildLines(payload as AutoBuildResult, progressSteps);
            messages.value[assistantIndex].thoughts = formatted.thoughts;
            messages.value[assistantIndex].content = formatted.answer;
            messages.value[assistantIndex].planRaw = formatted.planRaw;
            scrollToBottom();
          }
        }
      } catch {
        // ignore malformed chunk
      }
    }
  }
};

const generateUIView = async () => {
  try {
    const pathResult = (await ElMessageBox.prompt(
      '请输入页面文件路径（相对 src/views，例如：ai/GeneratedDemo.vue）',
      'AI 生成界面',
      {
        confirmButtonText: '下一步',
        cancelButtonText: '取消',
        inputPlaceholder: 'ai/GeneratedDemo.vue',
        inputValue: 'ai/GeneratedDemo.vue'
      }
    )) as { value: string };

    const promptResult = (await ElMessageBox.prompt('请输入页面需求描述', 'AI 生成界面', {
      confirmButtonText: '生成',
      cancelButtonText: '取消',
      inputType: 'textarea',
      inputPlaceholder: '例如：生成一个用户管理页面，包含查询、表格、分页、启用状态切换',
      inputValue: '生成一个用户管理页面，包含查询、表格、分页、启用状态切换'
    })) as { value: string };

    const relativePath = String(pathResult.value || '').trim();
    const prompt = String(promptResult.value || '').trim();
    if (!relativePath || !prompt) {
      ElMessage.warning('页面路径和需求描述不能为空');
      return;
    }

    const createFile = async (overwrite = false) =>
      (await request.post('/ai/ui/generate', {
        relativePath,
        prompt,
        model: currentModel.value,
        overwrite
      })) as { relativePath: string; filePath: string; overwritten: boolean };

    try {
      const result = await createFile(false);
      ElMessage.success(`页面已生成：${result.relativePath}`);
    } catch (error: any) {
      if (String(error?.message || '').includes('文件已存在')) {
        await ElMessageBox.confirm(`文件 ${relativePath} 已存在，是否覆盖？`, '提示', {
          type: 'warning',
          confirmButtonText: '覆盖',
          cancelButtonText: '取消'
        });
        const result = await createFile(true);
        ElMessage.success(`页面已覆盖：${result.relativePath}`);
        return;
      }
      throw error;
    }
  } catch {
    // ignore cancel
  }
};

const renderSenderFooter = ({ components }: any) => {
  const { SendButton, LoadingButton, SpeechButton } = components;
  return h(
    AFlex,
    { justify: 'space-between', align: 'center', style: { width: '100%' } },
    {
      default: () => [
        h(
          AFlex,
          { gap: 'small', align: 'center' },
          {
            default: () => [
              h(ASelect as any, {
                class: 'sender-model-select',
                size: 'small',
                value: currentModel.value,
                style: { width: '178px' },
                options: availableModels.value.map((model) => ({ label: model, value: model })),
                onChange: (val: string) => {
                  currentModel.value = val;
                  handleModelChange();
                }
              }),
              h(ADivider, { type: 'vertical' }),
              h(AButton, { type: 'text', size: 'small' }, () => '附件'),
              h(ADivider, { type: 'vertical' }),
              h('span', { class: 'sender-footer-label' }, '项目上下文'),
              h(ASwitch, {
                size: 'small',
                checked: useProjectContext.value,
                'onUpdate:checked': (val: boolean | string | number) => {
                  useProjectContext.value = Boolean(val);
                  handleModelChange();
                }
              }),
              h(ADivider, { type: 'vertical' }),
              h(AButton, { size: 'small', onClick: generateUIView }, () => '生成界面')
            ]
          }
        ),
        h(
          AFlex,
          { align: 'center', gap: 'small' },
          {
            default: () => [
              h(SpeechButton),
              loading.value
                ? h(LoadingButton, { type: 'default' })
                : h(SendButton, { type: 'primary', disabled: !inputMessage.value.trim() })
            ]
          }
        )
      ]
    }
  );
};

const handleSend = async () => {
  const text = inputMessage.value.trim();
  if (!text || loading.value) return;

  messages.value.push({ role: 'user', content: text, timestamp: Date.now() });
  inputMessage.value = '';
  loading.value = true;
  scrollToBottom();

  try {
    if (isAutoBuildIntent(text)) {
      messages.value.push({
        role: 'assistant',
        content: '正在执行中，请稍候...',
        thoughts: [],
        timestamp: Date.now()
      });
      const assistantIndex = messages.value.length - 1;
      await executeAutoBuildFromChat(text, assistantIndex);
    } else {
      messages.value.push({ role: 'assistant', content: '', timestamp: Date.now() });
      const assistantIndex = messages.value.length - 1;
      await streamChat(assistantIndex);
    }
    await loadConversations();
  } catch (error: any) {
    messages.value.push({
      role: 'assistant',
      content: `请求失败: ${error.message || '网络错误'}`,
      timestamp: Date.now()
    });
  } finally {
    loading.value = false;
    scrollToBottom();
  }
};

const streamChat = async (assistantIndex: number) => {
  const tokenValue = getToken();
  streamAbortController.value = new AbortController();
  const response = await fetch(`${import.meta.env.VITE_API_URL}/ai/chat/stream`, {
    method: 'POST',
    signal: streamAbortController.value.signal,
    headers: {
      'Content-Type': 'application/json',
      ...(tokenValue ? { Authorization: `Bearer ${tokenValue}` } : {})
    },
    body: JSON.stringify({
      messages: messages.value.filter((_, idx) => idx !== assistantIndex),
      provider: 'mimo',
      model: currentModel.value,
      useProjectContext: useProjectContext.value,
      contextHours: 24,
      conversationId: currentConversationId.value || undefined,
      stream: true
    })
  });

  if (!response.ok || !response.body) {
    throw new Error((await response.text()) || '流式请求失败');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() || '';

    for (const chunk of chunks) {
      if (!chunk.trim()) continue;
      const eventType = chunk.match(/^event:\s*(.+)$/m)?.[1]?.trim() || 'message';
      const data = chunk.match(/^data:\s*(.+)$/m)?.[1]?.trim();
      if (!data) continue;

      if (eventType === 'conversation') {
        try {
          const payload = JSON.parse(data);
          if (payload?.conversationId) currentConversationId.value = payload.conversationId;
        } catch {
          // ignore invalid payload
        }
        continue;
      }

      if (eventType === 'error') {
        try {
          throw new Error(JSON.parse(data)?.error || '流式响应失败');
        } catch {
          throw new Error('流式响应失败');
        }
      }

      if (data === '[DONE]') continue;

      try {
        const payload = JSON.parse(data);
        const delta = payload?.choices?.[0]?.delta;
        if (typeof delta?.content === 'string' && messages.value[assistantIndex]) {
          messages.value[assistantIndex].content += delta.content;
          scrollToBottom();
        }
      } catch {
        // ignore malformed chunk
      }
    }
  }
};

const onResizeMove = (event: MouseEvent) => {
  const delta = resizeStartX - event.clientX;
  const maxWidth = Math.floor(window.innerWidth * 0.92);
  const nextWidth = resizeStartWidth + delta;
  drawerWidth.value = Math.max(460, Math.min(maxWidth, nextWidth));
};

const onResizeUp = () => {
  document.removeEventListener('mousemove', onResizeMove);
  document.removeEventListener('mouseup', onResizeUp);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  document.querySelectorAll('iframe').forEach((iframe) => (iframe.style.pointerEvents = ''));
};

const startResize = (event: MouseEvent) => {
  resizeStartX = event.clientX;
  resizeStartWidth = drawerWidth.value;
  document.querySelectorAll('iframe').forEach((iframe) => (iframe.style.pointerEvents = 'none'));
  document.addEventListener('mousemove', onResizeMove);
  document.addEventListener('mouseup', onResizeUp);
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
};

const sendQuickPrompt = (prompt: string) => {
  inputMessage.value = prompt;
  void handleSend();
};

const loadSettings = () => {
  const savedModel = localStorage.getItem('ai_model');
  const savedUseProjectContext = localStorage.getItem('ai_use_project_context');
  if (savedModel) currentModel.value = savedModel;
  if (savedUseProjectContext !== null) useProjectContext.value = savedUseProjectContext === 'true';
};

loadSettings();

watch(
  () => visible.value,
  async (val) => {
    if (val) await loadConversations();
  }
);

onBeforeUnmount(() => {
  onResizeUp();
  if (streamAbortController.value) streamAbortController.value.abort();
});
</script>

<style scoped>
.ai-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.chat-main {
  display: flex;
  gap: 10px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.conversation-panel {
  width: 250px;
  flex-shrink: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-bg-color-page);
  transition: width 0.2s ease;
}

.conversation-panel.collapsed {
  width: 46px;
}

.conversation-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 8px 8px 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.conversation-title {
  font-size: 13px;
  font-weight: 600;
}

.conversation-actions {
  padding: 10px 10px 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.new-chat-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: linear-gradient(
    135deg,
    var(--el-color-primary) 0%,
    var(--el-color-primary-light-5) 100%
  );
  border: none;
  border-radius: 6px;
  font-weight: 500;
  height: 34px;
  transition: all 0.2s ease;
}

.new-chat-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.35);
}

.new-chat-btn:active {
  transform: translateY(0);
}

.conversation-list-wrap {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 8px 10px 10px;
}

.chat-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.messages-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 12px;
  background: var(--el-bg-color-page);
}

.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 280px;
  color: var(--el-text-color-secondary);
  text-align: center;
}

.empty-state .el-icon {
  margin-bottom: 12px;
  color: var(--el-color-primary);
}

.quick-prompts {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
}

.quick-prompts .el-tag {
  cursor: pointer;
}

.bubble-avatar {
  border: 1px solid var(--el-border-color-lighter);
}

.ai-avatar {
  background: rgba(64, 158, 255, 0.14);
  color: var(--el-color-primary);
}

.user-avatar {
  background: var(--el-color-primary);
  color: #fff;
}

.bubble-header {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.bubble-footer {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.bubble-message-wrap {
  width: 100%;
}

.think-panel {
  margin-bottom: 8px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: rgba(125, 125, 125, 0.08);
  overflow: hidden;
}

.think-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.think-toggle-btn {
  color: var(--el-text-color-secondary);
}

.think-panel-body {
  padding: 0 10px 8px;
}

.think-line {
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  margin-bottom: 6px;
}

.think-step-title {
  font-weight: 600;
}

.think-step-desc {
  margin-top: 2px;
  color: var(--el-text-color-secondary);
}

.plan-raw-wrap {
  margin-top: 8px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--el-bg-color-page);
}

.plan-raw-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.plan-raw-code {
  margin: 0;
  padding: 8px;
  max-height: 220px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: Consolas, Monaco, monospace;
}

.think-loading-icon {
  margin-top: 4px;
  color: var(--el-color-primary);
}

.input-container {
  padding-top: 10px;
  flex-shrink: 0;
}

.drawer-resize-handle {
  position: fixed;
  top: 0;
  bottom: 0;
  width: 10px;
  transform: translateX(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: col-resize;
  z-index: 3001;
  background: transparent;
}

.drawer-resize-handle:hover {
  background: rgba(64, 158, 255, 0.1);
}

.drawer-resize-handle:active {
  background: rgba(64, 158, 255, 0.2);
}

.resize-dots {
  display: flex;
  flex-direction: column;
  gap: 3px;
  pointer-events: none;
}

.resize-dots span {
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: #909399;
}

.sender-footer-label {
  font-size: 12px;
  color: var(--el-text-color-regular);
}

:deep(.sender-model-select.ant-select) {
  min-width: 178px;
}

:deep(.sender-model-select .ant-select-selector) {
  background: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
}

:deep(.sender-model-select .ant-select-selection-item),
:deep(.sender-model-select .ant-select-selection-placeholder) {
  color: var(--el-text-color-primary) !important;
}

:deep(.sender-model-select .ant-select-arrow) {
  color: var(--el-text-color-secondary) !important;
}

:deep(.el-drawer__body) {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:deep(.ant-conversations) {
  height: 100%;
}

:deep(.ant-conversations-list) {
  height: 100%;
  overflow-y: auto;
}

:deep(.ax-conversation-item) {
  transition: all 0.2s ease;
}

:deep(.ax-conversation-item .ant-conversations-label) {
  color: inherit !important;
  font-weight: 500;
}

:deep(.ax-conversation-item:hover) {
  background: var(--el-color-primary-light-9) !important;
  border-color: var(--el-color-primary-light-5) !important;
}

:deep(.ax-conversation-item.ant-conversations-item-active) {
  background: var(--el-color-primary-light-8) !important;
  border-color: var(--el-color-primary-light-3) !important;
  color: var(--el-color-primary) !important;
}

:deep(.ax-conversation-item.ant-conversations-item-active .ant-conversations-label),
:deep(.ax-conversation-item.ant-conversations-item-active .ant-conversations-menu-icon) {
  color: var(--el-color-primary) !important;
}

:deep(.md-content) {
  line-height: 1.65;
  word-break: break-word;
}

:deep(.ant-bubble-list .ant-bubble-end) {
  justify-content: flex-end;
}

:deep(.ant-bubble-list .ant-bubble-end .ant-bubble-content-wrapper) {
  align-items: flex-end;
}

:deep(.md-h1),
:deep(.md-h2),
:deep(.md-h3) {
  margin: 6px 0;
  line-height: 1.4;
  font-weight: 600;
}

:deep(.md-h1) {
  font-size: 18px;
}

:deep(.md-h2) {
  font-size: 16px;
}

:deep(.md-h3) {
  font-size: 15px;
}

:deep(.md-inline-code) {
  padding: 1px 6px;
  border-radius: 4px;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  background: rgba(125, 125, 125, 0.16);
}

:deep(.md-pre) {
  margin: 8px 0;
  padding: 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  overflow-x: auto;
  background: rgba(125, 125, 125, 0.1);
}

:deep(.md-code) {
  font-family: Consolas, Monaco, monospace;
  white-space: pre;
}

:global(html.dark) .ai-container {
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
}

:global(html.dark) .conversation-panel {
  background: var(--el-bg-color-overlay);
  border-color: var(--el-border-color-light);
}

:global(html.dark) .conversation-panel-header {
  border-bottom-color: var(--el-border-color-light);
}

:global(html.dark) .conversation-title {
  color: var(--el-text-color-primary);
}

:global(html.dark) .conversation-actions {
  border-bottom-color: var(--el-border-color-light);
}

:global(html.dark) .new-chat-btn {
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.25);
}

:global(html.dark) .messages-container {
  background: var(--el-bg-color-overlay);
  border-color: var(--el-border-color-light);
}

:global(html.dark) .empty-state {
  color: var(--el-text-color-secondary);
}

:global(html.dark) .quick-prompts .el-tag {
  background: var(--el-bg-color-overlay);
  border-color: var(--el-border-color-light);
  color: var(--el-text-color-regular);
}

:global(html.dark) .quick-prompts .el-tag:hover {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

:global(html.dark) .think-panel {
  border-color: var(--el-border-color-light);
  background: rgba(40, 40, 40, 0.7);
}

:global(html.dark) .think-panel-head,
:global(html.dark) .think-line,
:global(html.dark) .bubble-header,
:global(html.dark) .bubble-footer {
  color: var(--el-text-color-primary);
}

:global(html.dark) .plan-raw-wrap {
  background: rgba(30, 30, 30, 0.65);
  border-color: var(--el-border-color-light);
}

:global(html.dark) .plan-raw-head {
  color: var(--el-text-color-primary);
  border-bottom-color: var(--el-border-color-light);
}

:global(html.dark) :deep(.ax-conversation-item) {
  color: var(--el-text-color-primary) !important;
}

:global(html.dark) :deep(.ant-dropdown-menu),
:global(html.dark) :deep(.ant-dropdown-menu-item) {
  background: var(--el-bg-color-overlay) !important;
  color: var(--el-text-color-primary) !important;
}

:global(html.dark) .md-pre {
  background: rgba(30, 30, 30, 0.8);
  border-color: var(--el-border-color-light);
}

:global(html.dark) .md-inline-code {
  background: rgba(30, 30, 30, 0.8);
  color: #e6a23c;
}

:global(html.dark) :deep(.ant-conversations) {
  background: transparent;
}

:global(html.dark) :deep(.ant-conversations-list) {
  background: transparent;
}

:global(html.dark) :deep(.ant-bubble-user) {
  background: var(--el-color-primary) !important;
}

:global(html.dark) :deep(.ant-bubble-assistant) {
  background: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color-light);
}

:global(html.dark) :deep(.ant-sender) {
  background: var(--el-bg-color-overlay);
  border-color: var(--el-border-color-light);
}

:global(html.dark) :deep(textarea.ant-sender-input.ant-input) {
  background: var(--el-bg-color) !important;
  color: var(--el-text-color-primary) !important;
  -webkit-text-fill-color: var(--el-text-color-primary) !important;
}

:global(html.dark) :deep(textarea.ant-sender-input.ant-input::placeholder) {
  color: var(--el-text-color-placeholder) !important;
  opacity: 1;
}

:global(html.dark) :deep(.sender-model-select .ant-select-selector) {
  background: var(--el-bg-color) !important;
  border-color: var(--el-border-color-light) !important;
}

:global(html.dark) :deep(.sender-model-select .ant-select-selection-item),
:global(html.dark) :deep(.sender-model-select .ant-select-selection-placeholder) {
  color: var(--el-text-color-primary) !important;
}
</style>
