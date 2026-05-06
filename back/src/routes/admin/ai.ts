import { Router, Request, Response } from 'express';
import { aiService } from '../../services/aiService';
import { AiChatRequest } from '../../types/ai';
import { adminAuthMiddleware } from '../../middleware/adminAuth';
import { ApiResult } from '../../apiResult';
import { AiConversationService } from '../../services/aiConversationService';
import path from 'path';
import fs from 'fs/promises';
import { SysService } from '../../services/sysService';

const router = Router();

const ADMIN_VIEWS_ROOT = path.resolve(__dirname, '../../../../admin/src/views');

const normalizeRelativeVuePath = (inputPath: string): string => {
  const normalized = (inputPath || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .trim();

  if (!normalized) {
    throw new Error('页面路径不能为空');
  }
  if (normalized.includes('..')) {
    throw new Error('页面路径不允许包含 ..');
  }

  return normalized.endsWith('.vue') ? normalized : `${normalized}.vue`;
};

const extractVueSfc = (raw: string): string => {
  const content = String(raw || '').trim();
  const fenced = content.match(/```(?:vue)?\s*([\s\S]*?)```/i);
  const code = (fenced?.[1] || content).trim();

  if (!code.includes('<template>') || !code.includes('<script')) {
    throw new Error('AI 未返回有效的 Vue SFC 代码');
  }
  return code;
};

const normalizeVueSfcToJs = (code: string): string =>
  String(code || '')
    .replace(/<script\s+setup\s+lang=["']ts["']\s*>/gi, '<script setup>')
    .replace(/<script\s+lang=["']ts["']\s+setup\s*>/gi, '<script setup>')
    .replace(/<script\s+lang=["']ts["']\s*>/gi, '<script>');

const toKebabCase = (input: string): string =>
  String(input || '')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

const parseJsonFromText = (raw: string): any | null => {
  const content = String(raw || '').trim();
  if (!content) return null;
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] || content;
  const start = fenced.indexOf('{');
  const end = fenced.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  const jsonText = fenced.slice(start, end + 1);
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
};

const genSchemaVue = (args: {
  entityName: string;
  displayName: string;
  fields: Array<{ name: string; label: string }>;
}) => {
  const cols = args.fields.length > 0 ? args.fields : [{ name: 'name', label: '名称' }];
  const searchCols = cols.slice(0, 3);
  const initFormLines = cols.map((f) => `  ${f.name}: ''`).join(',\n');
  const editFormLines = cols
    .map(
      (f) =>
        `        <el-form-item label="${f.label}">
          <el-input v-model="model.${f.name}" placeholder="请输入${f.label}" />
        </el-form-item>`
    )
    .join('\n');
  const viewFormLines = cols
    .map(
      (f) =>
        `        <el-form-item label="${f.label}">
          <el-input :model-value="model.${f.name}" />
        </el-form-item>`
    )
    .join('\n');
  const columnDefs = cols
    .map((f) => {
      const search = searchCols.some((s) => s.name === f.name) ? ", search: { el: 'input' }" : '';
      return `  { prop: '${f.name}', label: '${f.label}', minWidth: 140${search} }`;
    })
    .join(',\n');

  return {
    template: `<div class="page-container">
  <ProTable
    ref="proTable"
    :columns="columns"
    :requestApi="getTableList"
    :initParam="initParam"
    :batchDeleteApi="batchDeleteApi"
    :deleteApi="deleteApi"
    :operation="{ view: true, edit: true, delete: true, mode: 'hover' }"
    :formConfig="{ label: '${args.displayName}', initForm, width: '520px' }"
    row-key="_id"
    @submit="submitForm"
  >
    <template #tableHeader>
      <el-button type="primary" @click="openAdd">新增${args.displayName}</el-button>
    </template>

    <template #edit-form="{ model }">
      <el-form :model="model" label-width="100px">
${editFormLines}
      </el-form>
    </template>

    <template #view-form="{ model }">
      <el-form :model="model" label-width="100px" disabled>
${viewFormLines}
      </el-form>
    </template>
  </ProTable>
</div>`,
    script: `import { ref } from 'vue';
import ProTable from '@/components/ProTable/index.vue';
import request from '@/utils/request';

const proTable = ref();
const initParam = {};
const initForm = {
${initFormLines}
};

const columns = [
  { type: 'selection', width: 55 },
${columnDefs},
  { prop: 'createdAt', label: '创建时间', minWidth: 180 },
  { prop: 'operation', label: '操作', width: 220, fixed: 'right' }
];

const getTableList = (params) => request.get('/core/${args.entityName}', { params });
const deleteApi = (id) => request.delete(\`/core/${args.entityName}/\${id}\`);
const batchDeleteApi = (ids) => request.post('/core/${args.entityName}/batch-delete', { ids });

const submitForm = async (model, done) => {
  try {
    if (model._id) {
      await request.put(\`/core/${args.entityName}/\${model._id}\`, model);
    } else {
      await request.post('/core/${args.entityName}', model);
    }
    done();
  } catch {
    done();
  }
};

const openAdd = () => {
  proTable.value?.openAdd();
};`,
    style: `.page-container { padding: 20px; }
:deep(.pro-table) { height: calc(100vh - 220px); }`
  };
};

router.post('/chat', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { messages, provider, model, temperature, maxTokens, useProjectContext, contextHours, conversationId } =
      req.body as AiChatRequest;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json(ApiResult.error('Messages are required', 400));
      return;
    }

    const result = await aiService.chat({
      messages,
      provider,
      model,
      temperature,
      maxTokens,
      useProjectContext: useProjectContext ?? true,
      contextHours: contextHours ?? 24,
      conversationId
    });

    if (result.success && result.message) {
      const userId = req.user?.userId;
      if (userId) {
        const latestUserMessage = [...messages].reverse().find((msg) => msg.role === 'user');
        if (latestUserMessage) {
          const savedConversationId = await AiConversationService.appendRound({
            conversationId,
            userId,
            provider: provider || 'default',
            model: model || 'default',
            useProjectContext: useProjectContext ?? true,
            userMessage: latestUserMessage,
            assistantMessage: result.message
          });
          result.conversationId = savedConversationId;
        }
      }
    }

    res.json(ApiResult.success(result));
  } catch (error: any) {
    console.error('[AI Chat] Error:', error);
    res.status(500).json(ApiResult.error(error.message || 'AI chat failed', 500));
  }
});

router.post('/chat/stream', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { messages, provider, model, temperature, maxTokens, useProjectContext, contextHours, conversationId } =
      req.body as AiChatRequest;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json(ApiResult.error('Messages are required', 400));
      return;
    }

    const selectedProvider = provider || 'mimo';
    if (selectedProvider !== 'mimo') {
      res.status(400).json(ApiResult.error('Streaming currently supports mimo only', 400));
      return;
    }

    const selectedModel = model || 'mimo-v2.5-pro';
    const preparedMessages = await aiService.prepareMessages(messages, useProjectContext ?? true, contextHours ?? 24);

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const streamResult = await aiService.streamMimo(preparedMessages, selectedModel, {
      temperature,
      maxTokens,
      onData: (payload) => {
        res.write(`data: ${payload}\n\n`);
      }
    });

    const userId = req.user?.userId;
    if (userId && streamResult.fullContent) {
      const latestUserMessage = [...messages].reverse().find((msg) => msg.role === 'user');
      if (latestUserMessage) {
        const savedConversationId = await AiConversationService.appendRound({
          conversationId,
          userId,
          provider: selectedProvider,
          model: selectedModel,
          useProjectContext: useProjectContext ?? true,
          userMessage: latestUserMessage,
          assistantMessage: {
            role: 'assistant',
            content: streamResult.fullContent,
            timestamp: Date.now()
          }
        });
        res.write(`event: conversation\ndata: ${JSON.stringify({ conversationId: savedConversationId })}\n\n`);
      }
    }

    res.end();
  } catch (error: any) {
    console.error('[AI Chat Stream] Error:', error);
    if (!res.headersSent) {
      res.status(500).json(ApiResult.error(error.message || 'AI stream failed', 500));
      return;
    }
    res.write(`event: error\ndata: ${JSON.stringify({ error: error.message || 'AI stream failed' })}\n\n`);
    res.end();
  }
});

router.get('/conversations', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json(ApiResult.error('Unauthorized', 401));
      return;
    }
    const limit = Number(req.query.limit || 30);
    const list = await AiConversationService.listByUser(userId, limit);
    res.json(ApiResult.success(list));
  } catch (error: any) {
    console.error('[AI Conversation List] Error:', error);
    res.status(500).json(ApiResult.error(error.message || 'Failed to fetch conversations', 500));
  }
});

router.get('/conversations/:id', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json(ApiResult.error('Unauthorized', 401));
      return;
    }
    const conversation = await AiConversationService.getById(userId, req.params.id);
    if (!conversation) {
      res.status(404).json(ApiResult.error('Conversation not found', 404));
      return;
    }
    res.json(ApiResult.success(conversation));
  } catch (error: any) {
    console.error('[AI Conversation Detail] Error:', error);
    res.status(500).json(ApiResult.error(error.message || 'Failed to fetch conversation', 500));
  }
});

router.delete('/conversations/:id', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json(ApiResult.error('Unauthorized', 401));
      return;
    }
    const deletedCount = await AiConversationService.deleteById(userId, req.params.id);
    res.json(ApiResult.success({ deletedCount }));
  } catch (error: any) {
    console.error('[AI Conversation Delete] Error:', error);
    res.status(500).json(ApiResult.error(error.message || 'Failed to delete conversation', 500));
  }
});

router.delete('/conversations', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json(ApiResult.error('Unauthorized', 401));
      return;
    }
    const deletedCount = await AiConversationService.clearByUser(userId);
    res.json(ApiResult.success({ deletedCount }));
  } catch (error: any) {
    console.error('[AI Conversation Clear] Error:', error);
    res.status(500).json(ApiResult.error(error.message || 'Failed to clear conversations', 500));
  }
});

router.get('/config', adminAuthMiddleware, (req: Request, res: Response) => {
  const config = aiService.getConfig();
  res.json(ApiResult.success(config));
});

router.post('/ui/generate', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { relativePath, prompt, model, overwrite } = req.body as {
      relativePath?: string;
      prompt?: string;
      model?: string;
      overwrite?: boolean;
    };

    if (!relativePath) {
      res.status(400).json(ApiResult.error('relativePath is required', 400));
      return;
    }
    if (!prompt || !prompt.trim()) {
      res.status(400).json(ApiResult.error('prompt is required', 400));
      return;
    }

    const safeRelativePath = normalizeRelativeVuePath(relativePath);
    const targetFilePath = path.resolve(ADMIN_VIEWS_ROOT, safeRelativePath);
    if (!targetFilePath.startsWith(ADMIN_VIEWS_ROOT)) {
      res.status(400).json(ApiResult.error('非法路径', 400));
      return;
    }

    try {
      await fs.access(targetFilePath);
      if (!overwrite) {
        res.status(409).json(ApiResult.error('文件已存在，请修改路径或开启覆盖', 409));
        return;
      }
    } catch {
      // File not exists, continue
    }

    const generationPrompt = [
      '你是 Vue3 + JavaScript + Element Plus 的资深前端工程师。',
      '请根据需求直接输出一个可运行的单文件组件（.vue），必须包含 <template> 与 <script setup>。',
      '要求：',
      '1) 使用 Element Plus 组件构建完整页面（含标题区、筛选区、列表区或表单区）。',
      '2) 代码风格简洁，不引入本项目中不存在的依赖。',
      '3) 禁止输出 TypeScript 语法（如 type/interface/泛型/类型注解）。',
      '4) 如果需求是增删改查页面，必须使用 @/components/ProTable/index.vue 作为核心表格组件，不要手写 el-table 作为主实现。',
      '5) 默认导出页面即可，不要解释，不要 markdown，只输出 Vue SFC 代码。',
      `页面需求：${prompt.trim()}`
    ].join('\n');

    const aiResult = await aiService.chat({
      messages: [{ role: 'user', content: generationPrompt }],
      provider: 'mimo',
      model: model || 'mimo-v2.5-pro',
      temperature: 0.2,
      maxTokens: 4096,
      useProjectContext: false
    });

    if (!aiResult.success || !aiResult.message?.content) {
      res.status(500).json(ApiResult.error(aiResult.error || 'AI 生成失败', 500));
      return;
    }

    const vueCode = normalizeVueSfcToJs(extractVueSfc(aiResult.message.content));
    await fs.mkdir(path.dirname(targetFilePath), { recursive: true });
    await fs.writeFile(targetFilePath, `${vueCode}\n`, 'utf-8');

    res.json(
      ApiResult.success({
        relativePath: safeRelativePath,
        filePath: targetFilePath,
        overwritten: !!overwrite
      })
    );
  } catch (error: any) {
    console.error('[AI UI Generate] Error:', error);
    res.status(500).json(ApiResult.error(error.message || '生成页面失败', 500));
  }
});

type AgentBuildResult = {
  entity: { id: string; name: string; displayName: string };
  view: { id: string; name: string };
  schema: { id: string; name: string };
  menu: { id: string; path: string; name: string };
  summary: string;
  thoughts?: Array<{ title: string; thought?: string }>;
  planRaw?: string;
};

type AgentBuildProgress = {
  step: number;
  total: number;
  percent: number;
  message: string;
  thought?: string;
};

class AgentBuildError extends Error {
  rollbackTips: string[];

  constructor(message: string, rollbackTips: string[] = []) {
    super(message);
    this.name = 'AgentBuildError';
    this.rollbackTips = rollbackTips;
  }
}

const runAgentBuildPage = async (
  instruction: string,
  model: string,
  onProgress?: (progress: AgentBuildProgress) => void
): Promise<AgentBuildResult> => {
  const total = 6;
  const emittedThoughts: Array<{ title: string; thought?: string }> = [];
  const report = (step: number, message: string, thought?: string) => {
    const percent = Math.min(100, Math.max(0, Math.round((step / total) * 100)));
    const normalizedThought = String(thought || '').trim();
    emittedThoughts.push({
      title: `[${percent}%] ${message}`,
      thought: normalizedThought || undefined
    });
    if (!onProgress) return;
    onProgress({
      step,
      total,
      percent,
      message,
      thought: normalizedThought || undefined
    });
  };

  const rollbackTips: string[] = [];

  try {
    report(1, '正在解析需求...');
    const planPrompt = [
      '你是系统实施助手。请把用户需求解析为 JSON，不要输出其它内容。',
      'JSON 结构：',
      '{',
      '  "thinking": "你对本次实现的关键判断与步骤思路（简洁）",',
      '  "entity": { "name": "集合英文名", "displayName": "中文名", "fields": [{"name":"字段英文名","label":"中文名","type":"string","required":false}] },',
      '  "menu": { "name": "菜单名", "path": "/xxx/yyy", "icon": "Document", "parentPath": "/sys" }',
      '}',
      '约束：entity.name 只用英文/数字/下划线；menu.path 以 / 开头；字段最多 8 个。',
      `用户需求：${instruction.trim()}`
    ].join('\n');

    const planResult = await aiService.chat({
      messages: [{ role: 'user', content: planPrompt }],
      provider: 'mimo',
      model,
      temperature: 0.1,
      maxTokens: 2048,
      useProjectContext: false
    });

    const planRaw = String(planResult.message?.content || '').trim();
    const parsed = parseJsonFromText(planRaw);
    const planningThought = String(parsed?.thinking || '').trim();
    const entityNameRaw = parsed?.entity?.name || `entity_${Date.now()}`;
    const entityName = String(entityNameRaw).replace(/[^\w]/g, '').slice(0, 40) || `entity_${Date.now()}`;
    const displayName = String(parsed?.entity?.displayName || entityName);
    const rawFields = Array.isArray(parsed?.entity?.fields) ? parsed.entity.fields.slice(0, 8) : [];
    const fields = rawFields
      .map((f: any) => ({
        name: String(f?.name || '').replace(/[^\w]/g, '').slice(0, 30),
        label: String(f?.label || f?.name || '字段'),
        type: String(f?.type || 'string'),
        required: !!f?.required
      }))
      .filter((f: any) => !!f.name);

    const menuPath = String(parsed?.menu?.path || `/sys/${toKebabCase(entityName)}`).startsWith('/')
      ? String(parsed?.menu?.path || `/sys/${toKebabCase(entityName)}`)
      : `/${String(parsed?.menu?.path || toKebabCase(entityName))}`;
    const menuName = String(parsed?.menu?.name || displayName);
    const menuIcon = String(parsed?.menu?.icon || 'Document');
    const parentPath = String(parsed?.menu?.parentPath || '/sys');

    const fieldSummary = fields.length > 0 ? fields.map((f) => f.label || f.name).slice(0, 6).join('、') : '默认名称字段';
    report(
      2,
      `正在创建/更新实体：${entityName}`,
      planningThought || `AI 规划实体为 ${displayName}（${entityName}），字段包含：${fieldSummary}。`
    );
    const entityResult = await SysService.getEntities({ name: `^${entityName}$` });
    const entityExists = !!entityResult.list[0];
    const entityDoc =
      entityResult.list[0] ||
      (await SysService.createEntity({
        name: entityName,
        displayName,
        fields
      } as any));
    if (!entityExists) {
      rollbackTips.push(`删除实体：${displayName}（id: ${String(entityDoc._id)}）`);
    }

    const viewName = `${displayName}列表`;
    report(3, `正在创建/更新视图：${viewName}`, `根据 AI 规划将实体 ${entityName} 生成列表视图 ${viewName}。`);
    const views = await SysService.getViews({ name: viewName });
    const existedView = views.find((v: any) => v.entityId === entityDoc._id.toString());
    const viewDoc =
      existedView ||
      (await SysService.createView({
        name: viewName,
        entityId: entityDoc._id.toString(),
        type: 'list',
        config: {}
      } as any));
    if (!existedView) {
      rollbackTips.push(`删除视图：${viewName}（id: ${String(viewDoc._id)}）`);
    }

    report(4, '正在创建/更新页面架构...', '把视图与实体绑定到可运行页面架构，确保页面可直接渲染。');
    const vue = genSchemaVue({
      entityName,
      displayName,
      fields: fields.map((f: any) => ({ name: f.name, label: f.label }))
    });

    const schemaName = `${displayName}自动页面`;
    const schemas = await SysService.getSchemas({ name: schemaName });
    let schemaDoc: any;
    if (schemas[0]) {
      schemaDoc = await SysService.updateSchema(String(schemas[0]._id), {
        entityId: String(entityDoc._id),
        viewId: String(viewDoc._id),
        vue
      } as any);
    } else {
      schemaDoc = await SysService.createSchema({
        name: schemaName,
        entityId: String(entityDoc._id),
        viewId: String(viewDoc._id),
        vue
      } as any);
      rollbackTips.push(`删除架构：${schemaName}（id: ${String(schemaDoc._id)}）`);
    }

    report(5, `正在创建/更新菜单：${menuPath}`, `将页面挂载到菜单路径 ${menuPath}，父级为 ${parentPath || '/'}。`);
    const parentMenus = await SysService.getMenus({ path: parentPath });
    const parentId = parentMenus[0]?._id?.toString();
    const menus = await SysService.getMenus({ path: menuPath });
    let menuDoc: any;
    if (menus[0]) {
      menuDoc = await SysService.updateMenu(String(menus[0]._id), {
        name: menuName,
        icon: menuIcon,
        parentId,
        schemaId: String(schemaDoc._id),
        roles: ['admin']
      } as any);
    } else {
      menuDoc = await SysService.createMenu({
        name: menuName,
        path: menuPath,
        icon: menuIcon,
        parentId,
        schemaId: String(schemaDoc._id),
        sort: 999,
        roles: ['admin']
      } as any);
      rollbackTips.push(`删除菜单：${menuName}（id: ${String(menuDoc._id)}）`);
    }

    report(6, '全部步骤执行完成', '所有资源已落地并完成关联，可直接在菜单访问页面。');
    const thoughts = emittedThoughts;
    return {
      entity: { id: String(entityDoc._id), name: entityName, displayName },
      view: { id: String(viewDoc._id), name: viewName },
      schema: { id: String(schemaDoc._id), name: schemaName },
      menu: { id: String(menuDoc._id), path: menuPath, name: menuName },
      summary: `已自动完成：实体(${entityName})、视图(${viewName})、架构(${schemaName})、菜单(${menuPath})`,
      thoughts,
      planRaw
    };
  } catch (error: any) {
    const tips = rollbackTips.slice().reverse();
    throw new AgentBuildError(error?.message || '自动创建页面失败', tips);
  }
};

router.post('/agent/build-page', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { instruction, model, conversationId, useProjectContext } = req.body as {
      instruction?: string;
      model?: string;
      conversationId?: string;
      useProjectContext?: boolean;
    };
    if (!instruction || !instruction.trim()) {
      res.status(400).json(ApiResult.error('instruction is required', 400));
      return;
    }

    const result = await runAgentBuildPage(instruction, model || 'mimo-v2.5-pro');
    const userId = req.user?.userId;
    if (userId) {
      const thoughtsText =
        result.thoughts && result.thoughts.length > 0
          ? `思考过程：\n- ${result.thoughts
              .map((item) => `${item.title}${item.thought ? `（思考：${item.thought}）` : ''}`)
              .join('\n- ')}\n\n`
          : '';
      const planRawText = result.planRaw ? `\n\nAI规划原文（JSON）：\n${result.planRaw}` : '';
      const assistantContent = `${thoughtsText}执行结果：\n- ${result.summary}${planRawText}`;
      const savedConversationId = await AiConversationService.appendRound({
        conversationId,
        userId,
        provider: 'mimo',
        model: model || 'mimo-v2.5-pro',
        useProjectContext: useProjectContext ?? true,
        userMessage: {
          role: 'user',
          content: instruction.trim(),
          timestamp: Date.now()
        },
        assistantMessage: {
          role: 'assistant',
          content: assistantContent,
          timestamp: Date.now()
        }
      });
      res.json(ApiResult.success({ ...result, conversationId: savedConversationId }));
      return;
    }
    res.json(ApiResult.success(result));
  } catch (error: any) {
    console.error('[AI Agent Build Page] Error:', error);
    const rollbackTips = error instanceof AgentBuildError ? error.rollbackTips : [];
    const rollbackMessage = rollbackTips.length > 0 ? `\n回滚提示：\n- ${rollbackTips.join('\n- ')}` : '';
    res.status(500).json(ApiResult.error(`${error.message || '自动创建页面失败'}${rollbackMessage}`, 500));
  }
});

router.post('/agent/build-page/stream', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { instruction, model, conversationId, useProjectContext } = req.body as {
      instruction?: string;
      model?: string;
      conversationId?: string;
      useProjectContext?: boolean;
    };
    if (!instruction || !instruction.trim()) {
      res.status(400).json(ApiResult.error('instruction is required', 400));
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const writeEvent = (event: string, payload: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    const result = await runAgentBuildPage(instruction, model || 'mimo-v2.5-pro', (progress) => {
      writeEvent('progress', progress);
    });

    const userId = req.user?.userId;
    if (userId) {
      const thoughtsText =
        result.thoughts && result.thoughts.length > 0
          ? `思考过程：\n- ${result.thoughts
              .map((item) => `${item.title}${item.thought ? `（思考：${item.thought}）` : ''}`)
              .join('\n- ')}\n\n`
          : '';
      const planRawText = result.planRaw ? `\n\nAI规划原文（JSON）：\n${result.planRaw}` : '';
      const assistantContent = `${thoughtsText}执行结果：\n- ${result.summary}${planRawText}`;
      const savedConversationId = await AiConversationService.appendRound({
        conversationId,
        userId,
        provider: 'mimo',
        model: model || 'mimo-v2.5-pro',
        useProjectContext: useProjectContext ?? true,
        userMessage: {
          role: 'user',
          content: instruction.trim(),
          timestamp: Date.now()
        },
        assistantMessage: {
          role: 'assistant',
          content: assistantContent,
          timestamp: Date.now()
        }
      });
      writeEvent('conversation', { conversationId: savedConversationId });
    }

    writeEvent('result', result);
    res.write('event: done\ndata: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('[AI Agent Build Page Stream] Error:', error);
    if (!res.headersSent) {
      res.status(500).json(ApiResult.error(error.message || '自动创建页面失败', 500));
      return;
    }
    const rollbackTips = error instanceof AgentBuildError ? error.rollbackTips : [];
    res.write(
      `event: error\ndata: ${JSON.stringify({ error: error.message || '自动创建页面失败', rollbackTips })}\n\n`
    );
    res.end();
  }
});

export default router;
