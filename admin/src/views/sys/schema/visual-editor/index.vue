<template>
  <div class="visual-editor">
    <el-tabs v-model="activeTab" class="editor-tabs" type="border-card">
      <el-tab-pane :label="t('visualEditor.tabs.list')" name="list">
        <div class="tab-content list-editor">
          <el-empty :description="t('visualEditor.placeholders.emptyList')" />
        </div>
      </el-tab-pane>
      <el-tab-pane :label="t('visualEditor.tabs.form')" name="form">
        <div class="tab-content form-editor">
          <!-- Left: Components -->
          <div class="left-panel">
            <div v-for="group in componentList" :key="group.title" class="component-group">
              <div class="group-title">{{ t(group.title) }}</div>
              <draggable
                :list="group.items"
                :group="{ name: 'components', pull: 'clone', put: false }"
                :sort="false"
                item-key="type"
                :clone="cloneComponent"
                class="component-list"
              >
                <template #item="{ element }">
                  <div class="component-item">
                    <el-icon v-if="element.icon"><component :is="element.icon" /></el-icon>
                    <span>{{ t(element.label) }}</span>
                  </div>
                </template>
              </draggable>
            </div>
          </div>

          <!-- Center: Canvas -->
          <div class="center-panel">
            <div class="canvas-toolbar">
              <div class="toolbar-left">
                <el-button-group>
                  <el-button
                    type="primary"
                    :plain="device !== 'pc'"
                    :icon="Monitor"
                    @click="device = 'pc'"
                    >PC</el-button
                  >
                  <el-button
                    type="primary"
                    :plain="device !== 'mobile'"
                    :icon="Iphone"
                    @click="device = 'mobile'"
                    >Mobile</el-button
                  >
                </el-button-group>
              </div>
              <div class="toolbar-right">
                <el-button :icon="Delete" @click="handleClear">{{
                  t('visualEditor.buttons.clear')
                }}</el-button>
                <el-button :icon="View" @click="handlePreview">{{
                  t('visualEditor.buttons.preview') || '预览代码'
                }}</el-button>
                <el-button type="primary" :icon="Check" @click="handleSave">{{
                  t('visualEditor.buttons.save')
                }}</el-button>
              </div>
            </div>
            <div class="canvas-wrapper">
              <div class="canvas-scroller">
                <div v-if="!canvasData.length" class="empty-placeholder">
                  {{ t('visualEditor.placeholders.dragTip') }}
                </div>
                <div class="canvas-container" :class="device" @click.self="activeComponent = null">
                  <draggable
                    v-model="canvasData"
                    group="components"
                    item-key="id"
                    class="root-drag-area"
                    :class="{ 'is-empty': !canvasData.length }"
                    animation="200"
                    ghost-class="ghost"
                  >
                    <template #item="{ element }">
                      <DraggableItem
                        :element="element"
                        :active-id="activeComponent?.id"
                        @select="setActiveComponent"
                        @delete="deleteComponent"
                      />
                    </template>
                  </draggable>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Props -->
          <div class="right-panel">
            <div v-if="activeComponent" class="props-editor">
              <h3>{{ t('visualEditor.titles.propsConfig') }}</h3>
              <el-form label-position="top" size="small">
                <el-form-item :label="t('visualEditor.titles.componentId')">
                  <el-input v-model="activeComponent.id" disabled />
                </el-form-item>
                <el-form-item :label="t('visualEditor.titles.componentName')">
                  <el-input v-model="activeComponent.label" />
                </el-form-item>
                <el-form-item
                  v-if="activeComponent.model !== undefined"
                  :label="t('visualEditor.titles.vModel')"
                >
                  <el-input v-model="activeComponent.model" />
                </el-form-item>
                <el-form-item
                  v-if="activeComponent.text !== undefined"
                  :label="t('visualEditor.titles.displayText')"
                >
                  <el-input v-model="activeComponent.text" />
                </el-form-item>

                <el-divider>{{ t('visualEditor.titles.props') }}</el-divider>

                <template v-for="(val, key) in activeComponent.props" :key="key">
                  <el-form-item
                    v-if="!String(key).startsWith('_') && key !== 'requestApi' && key !== 'columns'"
                    :label="getPropLabel(key as string)"
                  >
                    <el-switch
                      v-if="typeof val === 'boolean'"
                      v-model="activeComponent.props[key]"
                    />
                    <el-input-number
                      v-else-if="typeof val === 'number'"
                      v-model="activeComponent.props[key]"
                    />
                    <!-- Special handling for row gutter and col span -->
                    <el-slider
                      v-else-if="activeComponent.type === 'el-row' && key === 'gutter'"
                      v-model="activeComponent.props[key]"
                      :min="0"
                      :max="60"
                      :step="5"
                      show-input
                    />
                    <el-radio-group
                      v-else-if="activeComponent.type === 'el-row' && key === 'justify'"
                      v-model="activeComponent.props[key]"
                      size="small"
                    >
                      <el-radio-button label="start">Start</el-radio-button>
                      <el-radio-button label="center">Center</el-radio-button>
                      <el-radio-button label="end">End</el-radio-button>
                      <el-radio-button label="space-between">Between</el-radio-button>
                      <el-radio-button label="space-around">Around</el-radio-button>
                    </el-radio-group>
                    <el-radio-group
                      v-else-if="activeComponent.type === 'el-row' && key === 'align'"
                      v-model="activeComponent.props[key]"
                      size="small"
                    >
                      <el-radio-button label="top">Top</el-radio-button>
                      <el-radio-button label="middle">Middle</el-radio-button>
                      <el-radio-button label="bottom">Bottom</el-radio-button>
                    </el-radio-group>

                    <el-slider
                      v-else-if="activeComponent.type === 'el-col' && key === 'span'"
                      v-model="activeComponent.props[key]"
                      :min="1"
                      :max="24"
                      :marks="{ 6: '6', 8: '8', 12: '12', 24: '24' }"
                    />

                    <!-- Special handling for Form props -->
                    <template v-else-if="activeComponent.type === 'el-form'">
                      <el-radio-group
                        v-if="key === 'labelPosition'"
                        v-model="activeComponent.props[key]"
                        size="small"
                      >
                        <el-radio-button label="left">Left</el-radio-button>
                        <el-radio-button label="right">Right</el-radio-button>
                        <el-radio-button label="top">Top</el-radio-button>
                      </el-radio-group>
                      <el-input
                        v-else-if="key === 'submitUrl'"
                        v-model="activeComponent.props[key]"
                        placeholder="/mock/..."
                      />
                      <el-select
                        v-else-if="key === 'submitMethod'"
                        v-model="activeComponent.props[key]"
                      >
                        <el-option label="POST" value="post" />
                        <el-option label="PUT" value="put" />
                        <el-option label="PATCH" value="patch" />
                      </el-select>
                      <el-input v-else v-model="activeComponent.props[key]" />
                    </template>

                    <el-select v-else-if="key === 'size'" v-model="activeComponent.props[key]">
                      <el-option :label="t('visualEditor.enum.default')" value="default" />
                      <el-option :label="t('visualEditor.enum.large')" value="large" />
                      <el-option :label="t('visualEditor.enum.small')" value="small" />
                    </el-select>
                    <el-input v-else v-model="activeComponent.props[key]" />
                  </el-form-item>
                </template>

                <template v-if="activeComponent.props.columns">
                  <el-divider>{{ t('visualEditor.titles.columns') }}</el-divider>

                  <div class="col-actions" style="margin-bottom: 10px">
                    <el-button
                      size="small"
                      type="primary"
                      plain
                      style="width: 100%"
                      :disabled="!activeComponent.props.apiUrl"
                      @click="openApiFieldSelector"
                    >
                      {{ t('visualEditor.buttons.readFromApi') }}
                    </el-button>
                  </div>

                  <div
                    v-for="(col, idx) in activeComponent.props.columns"
                    :key="idx"
                    class="column-item-editor"
                  >
                    <div class="col-header">
                      <span>{{ t('visualEditor.titles.column') }} {{ (idx as number) + 1 }}</span>
                      <el-button
                        type="danger"
                        link
                        :icon="Delete"
                        @click="activeComponent!.props.columns.splice(idx, 1)"
                      />
                    </div>
                    <div class="col-row">
                      <el-input
                        v-model="col.prop"
                        :placeholder="t('visualEditor.placeholders.propName')"
                        size="small"
                      />
                      <el-input
                        v-model="col.label"
                        :placeholder="t('visualEditor.placeholders.labelName')"
                        size="small"
                      />
                    </div>
                    <div class="col-row">
                      <el-input-number
                        v-model="col.width"
                        :placeholder="t('visualEditor.placeholders.width')"
                        size="small"
                        :controls="false"
                        style="width: 80px"
                      />
                      <el-checkbox
                        v-model="col.search"
                        :label="t('visualEditor.labels.search')"
                        size="small"
                      />
                    </div>
                  </div>
                  <el-button
                    type="primary"
                    :icon="Plus"
                    size="small"
                    style="width: 100%; margin-top: 10px"
                    @click="
                      activeComponent.props.columns.push({ prop: '', label: '', width: undefined })
                    "
                    >{{ t('visualEditor.buttons.addColumn') }}</el-button
                  >
                </template>

                <template v-if="activeComponent.options">
                  <el-divider>{{ t('visualEditor.titles.options') }}</el-divider>
                  <div v-for="(opt, idx) in activeComponent.options" :key="idx" class="option-item">
                    <el-input
                      v-model="opt.label"
                      :placeholder="t('visualEditor.placeholders.optionLabel')"
                      style="width: 45%"
                    />
                    <el-input
                      v-model="opt.value"
                      :placeholder="t('visualEditor.placeholders.optionValue')"
                      style="width: 45%"
                    />
                    <el-button
                      circle
                      size="small"
                      type="danger"
                      :icon="Delete"
                      @click="activeComponent!.options?.splice(idx, 1)"
                    />
                  </div>
                  <el-button
                    size="small"
                    style="width: 100%; margin-top: 10px"
                    @click="activeComponent.options.push({ label: 'New Option', value: '' })"
                    >{{ t('visualEditor.buttons.addOption') }}</el-button
                  >
                </template>
              </el-form>
            </div>
            <div v-else class="empty-props">
              <el-empty :description="t('visualEditor.placeholders.selectComponent')" />
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- API Field Selector Dialog -->
    <el-dialog
      v-model="fieldSelectorVisible"
      :title="t('visualEditor.titles.selectFields')"
      width="500px"
      append-to-body
    >
      <div v-loading="fieldLoading" class="field-selector">
        <div v-if="fetchedFields.length > 0">
          <el-checkbox-group v-model="selectedFields">
            <div v-for="field in fetchedFields" :key="field" class="field-item">
              <el-checkbox :label="field">{{ field }}</el-checkbox>
            </div>
          </el-checkbox-group>
        </div>
        <el-empty v-else :description="t('visualEditor.messages.apiEmpty')" />
      </div>
      <template #footer>
        <el-button @click="fieldSelectorVisible = false">{{
          t('visualEditor.buttons.cancel')
        }}</el-button>
        <el-button type="primary" :disabled="!selectedFields.length" @click="confirmAddFields">{{
          t('visualEditor.buttons.confirmAdd')
        }}</el-button>
      </template>
    </el-dialog>
  </div>
  <el-dialog v-model="codeDialogVisible" title="Generated Code" width="800px" append-to-body>
    <el-tabs v-model="codeActiveTab">
      <el-tab-pane label="Template" name="template">
        <vue-monaco-editor
          v-if="codeDialogVisible"
          v-model:value="generatedCode.template"
          theme="vs-dark"
          language="html"
          :options="{
            readOnly: true,
            automaticLayout: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false
          }"
          height="400px"
        />
      </el-tab-pane>
      <el-tab-pane label="Script" name="script">
        <vue-monaco-editor
          v-if="codeDialogVisible"
          v-model:value="generatedCode.script"
          theme="vs-dark"
          language="typescript"
          :options="{
            readOnly: true,
            automaticLayout: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false
          }"
          height="400px"
          @mount="handleEditorMount"
        />
      </el-tab-pane>
    </el-tabs>
    <template #footer>
      <el-button @click="codeDialogVisible = false">Close</el-button>
      <el-button type="primary" @click="handleCopyCode">Copy Code</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import draggable from 'vuedraggable';
import { componentList, type EditorComponent } from './config';
import DraggableItem from './DraggableItem.vue';
import { Monitor, Iphone, Delete, Check, Plus, View } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import request from '@/utils/request';
import { useI18n } from 'vue-i18n';
import { VueMonacoEditor } from '@guolao/vue-monaco-editor';

const { t } = useI18n();

const codeDialogVisible = ref(false);
const codeActiveTab = ref('template');
const generatedCode = reactive({ template: '', script: '' });

const handleEditorMount = (_editor: any, monaco: any) => {
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false
  });
};

const handleCopyCode = () => {
  navigator.clipboard.writeText(generatedCode.template + '\n\n' + generatedCode.script).then(() => {
    ElMessage.success('Code copied to clipboard');
  });
};

const getPropLabel = (key: string) => {
  return t(`visualEditor.props.${key}`);
};

const props = defineProps<{
  initialConfig?: string; // Expecting JSON string from __VISUAL_CONFIG__
  rawVue?: { template: string; script: string }; // Fallback for reverse engineering
}>();

const emit = defineEmits(['save']);

const activeTab = ref('form');
const device = ref('pc');
const canvasData = ref<EditorComponent[]>([]);
const activeComponent = ref<EditorComponent | null>(null);

// API Field Selection Logic
const fieldSelectorVisible = ref(false);
const fieldLoading = ref(false);
const fetchedFields = ref<string[]>([]);
const selectedFields = ref<string[]>([]);

const openApiFieldSelector = async () => {
  if (!activeComponent.value?.props.apiUrl) return;

  fieldSelectorVisible.value = true;
  fieldLoading.value = true;
  fetchedFields.value = [];
  selectedFields.value = [];

  try {
    const res = await request.get(activeComponent.value.props.apiUrl, {
      params: { pageSize: 1, pageNum: 1 }
    });
    let list: any[] = [];

    // Attempt to extract list from response
    // Use type assertion to avoid TS errors when accessing dynamic properties
    const data = res as any;
    if (Array.isArray(data)) {
      list = data;
    } else if (data && Array.isArray(data.list)) {
      list = data.list;
    } else if (data && data.data && Array.isArray(data.data)) {
      list = data.data;
    } else if (data && data.data && Array.isArray(data.data.list)) {
      list = data.data.list;
    }

    if (list.length > 0) {
      // Get all unique keys from first item
      const keys = Object.keys(list[0]);
      fetchedFields.value = keys;
    } else {
      ElMessage.warning(t('visualEditor.messages.apiEmpty'));
    }
  } catch (error: any) {
    ElMessage.error(t('visualEditor.messages.apiError', { msg: error.message }));
  } finally {
    fieldLoading.value = false;
  }
};

const confirmAddFields = () => {
  if (!activeComponent.value || !activeComponent.value.props.columns) return;

  for (const field of selectedFields.value) {
    // Check if already exists
    const exists = activeComponent.value.props.columns.find((c: any) => c.prop === field);
    if (!exists) {
      activeComponent.value.props.columns.push({
        prop: field,
        label: field, // Default label to prop name, user can edit
        width: undefined
      });
    }
  }

  fieldSelectorVisible.value = false;
  ElMessage.success(t('visualEditor.messages.addedFields', { count: selectedFields.value.length }));
};

onMounted(() => {
  if (props.initialConfig) {
    try {
      const config = JSON.parse(props.initialConfig);
      if (config.form) {
        canvasData.value = config.form;
      }
    } catch (e) {
      console.error('Failed to load initial visual config', e);
    }
  } else if (props.rawVue && props.rawVue.template) {
    // Reverse Engineering Fallback
    // Check if it looks like a ProTable page
    if (props.rawVue.template.includes('<ProTable')) {
      // It's likely a list page (which we don't fully support visually yet in 'form' tab)
      // But we can switch tab or show a hint.
      activeTab.value = 'list';
      // We could try to parse columns from script...
      // For now, let's just initialize the form tab with a "ProTable" component so it's not empty
      // if user switches back to form tab.

      // Try to detect API URL from script
      let apiUrl = '';
      const apiMatch = props.rawVue.script.match(
        /request\.(get|post|put|delete)\(['"]([^'"]+)['"]/
      );
      if (apiMatch && apiMatch[2]) {
        apiUrl = apiMatch[2];
      }

      // Try to parse columns from script
      let columns: any[] = [];
      const columnsMatch = props.rawVue.script.match(/const columns = (\[[\s\S]*?\]);/);
      if (columnsMatch && columnsMatch[1]) {
        try {
          // This is a naive parse, might fail if it contains functions or variables
          // We'll use a safer eval approach or regex to extract basic props
          // For safety, we just try JSON.parse first, if fails, we use a simple regex extractor
          // Or better: use Function constructor with a sandbox-like approach
          // But Function constructor is blocked by CSP usually.
          // Let's use a regex-based loose parser for simple objects

          const rawCols = columnsMatch[1];
          // Replace single quotes with double quotes for JSON, remove trailing commas, etc.
          // This is very hard to do perfectly.
          // Let's just extract { prop: '...', label: '...' } blocks

          const colBlockRegex = /\{[\s\S]*?\}/g;
          const blocks = rawCols.match(colBlockRegex);
          if (blocks) {
            // Detect slots with input in template
            const inputSlots: string[] = [];
            const slotMatches = props.rawVue.template.matchAll(
              /<template\s+#([a-zA-Z0-9_\-]+)(?:="[^"]*")?>[\s\S]*?<el-input/g
            );
            for (const m of slotMatches) {
              if (m[1]) inputSlots.push(m[1]);
            }

            columns = blocks
              .map((block) => {
                const propMatch = block.match(/prop:\s*['"]([^'"]+)['"]/);
                const labelMatch = block.match(/label:\s*['"]([^'"]+)['"]/);
                const widthMatch = block.match(/width:\s*(\d+)/);
                const searchMatch = block.match(/search\s*:/);
                if (propMatch) {
                  return {
                    prop: propMatch[1] || '',
                    label: labelMatch ? labelMatch[1] || '' : propMatch[1] || '',
                    width: widthMatch ? parseInt(widthMatch[1] || '0') : undefined,
                    search: !!searchMatch,
                    _renderInput: inputSlots.includes(propMatch[1] || '')
                  };
                }
                return null;
              })
              .filter(Boolean);
          }
        } catch (e) {
          console.warn('Failed to parse columns', e);
        }
      }

      // Detect custom header buttons
      const headerMatch = props.rawVue.template.match(
        /<template\s+#tableHeader(?:="[^"]*")?>([\s\S]*?)<\/template>/
      );
      let customHeader: any[] | undefined = undefined;
      if (headerMatch && headerMatch[1]) {
        const buttons: any[] = [];
        const btnMatches = headerMatch[1].matchAll(/<el-button[^>]*>([\s\S]*?)<\/el-button>/g);
        for (const m of btnMatches) {
          // Clean up text
          if (!m[1]) continue;
          let text = m[1].replace(/{{.*?}}/g, '').trim();
          if (!text) {
            if (m[0].includes('CirclePlus')) text = '新增';
            else if (m[0].includes('Check')) text = '提交';
            else if (m[0].includes('Delete')) text = '删除';
            else text = 'Button';
          }
          // Check type and icon
          let type = 'primary';
          if (m[0].includes('type="success"')) type = 'success';
          if (m[0].includes('type="danger"')) type = 'danger';
          if (m[0].includes('type="warning"')) type = 'warning';
          if (m[0].includes('type="info"')) type = 'info';

          let icon = '';
          if (m[0].includes('CirclePlus')) icon = 'CirclePlus';
          else if (m[0].includes('Check')) icon = 'Check';
          else if (m[0].includes('Delete')) icon = 'Delete';
          else if (m[0].includes('Edit')) icon = 'EditPen';
          else if (m[0].includes('Refresh')) icon = 'Refresh';

          buttons.push({ text, type, icon });
        }
        if (buttons.length > 0) customHeader = buttons;
      }

      // Detect custom operation buttons
      const opMatch = props.rawVue.template.match(
        /<template\s+#operation(?:="[^"]*")?>([\s\S]*?)<\/template>/
      );
      let customOp: any[] | undefined = undefined;
      if (opMatch && opMatch[1]) {
        const buttons: any[] = [];

        // New robust regex approach for buttons (self-closing or pair)
        const buttonRegex = /<el-button([^>]*?)(?:\/?>|<\/el-button>)/g;
        const buttonsMatches = opMatch[1].matchAll(buttonRegex);

        for (const m of buttonsMatches) {
          const attrs = m[1] || '';
          let type = 'primary';
          if (attrs.includes('type="danger"')) type = 'danger';
          else if (attrs.includes('type="success"')) type = 'success';
          else if (attrs.includes('type="warning"')) type = 'warning';
          else if (attrs.includes('type="info"')) type = 'info';

          let icon = '';
          if (attrs.includes('Delete')) icon = 'Delete';
          else if (attrs.includes('Edit')) icon = 'EditPen';
          else if (attrs.includes('View')) icon = 'View';

          const isCircle = attrs.includes('circle');

          // Try to find text content if not self-closing and not empty
          // This is hard with single regex.
          // For visualization purpose, we mainly care about type/icon/circle.
          // Text is secondary if circle is true.

          let text = '';
          if (!isCircle) {
            // If not circle, maybe it has text?
            // But if it was matched by non-greedy, we might not have content in m[1] if it was self closing.
            // The user example has <el-button ... /> (self closing) for delete.
            if (icon === 'Delete') text = '';
            else if (icon === 'EditPen') text = '编辑';
            else text = '操作';
          }

          buttons.push({ type, icon, text, circle: isCircle });
        }
        if (buttons.length > 0) customOp = buttons;
      }

      canvasData.value = [
        {
          id: 'protable_init',
          type: 'ProTable',
          label: '超级表格 (Existing)',
          props: {
            columns: columns,
            pagination: true,
            apiUrl: apiUrl,
            requestApi: undefined,
            _customHeader: customHeader,
            _customOp: customOp
          },
          model: ''
        }
      ];
      ElMessage.info('检测到现有 ProTable 代码，已切换至列表视图 (部分支持)');
    } else {
      // Try to regex match simple el-input, el-select...
      // This is very limited but better than nothing.
      const inputMatches = props.rawVue.template.matchAll(/<el-input[^>]*v-model="([^"]+)"[^>]*>/g);
      for (const match of inputMatches) {
        if (!match[1]) continue;
        const model = match[1].replace('form.', '').replace('model.', '');
        canvasData.value.push({
          id: 'input_' + model,
          type: 'el-input',
          label: '输入框 (' + model + ')',
          model: model,
          props: { placeholder: '请输入' }
        });
      }
      if (canvasData.value.length > 0) {
        ElMessage.info('已尝试从现有代码恢复组件');
      } else {
        // Fallback: try to detect if it's a generic template (like HelloWorld)
        // and try to "parse" it into a simplified visual representation or at least show raw html
        // For now, let's just detect el-card and buttons
        if (props.rawVue.template.includes('<el-card')) {
          // Create a wrapper card
          const cardId = 'card_' + Date.now();
          const cardComp: EditorComponent = {
            id: cardId,
            type: 'el-card',
            label: '卡片 (Card)',
            props: { header: 'Card' },
            children: [],
            isContainer: true
          };

          // Extract header
          const headerMatch = props.rawVue.template.match(
            /<template #header>([\s\S]*?)<\/template>/
          );
          if (headerMatch && headerMatch[1]) {
            const headerText = headerMatch[1].replace(/<[^>]+>/g, '').trim();
            if (headerText) cardComp.props.header = headerText;
          }

          // Extract content buttons and text tags
          // We need to parse the content of el-card (excluding header)
          let cardContent = props.rawVue.template;
          const cardMatch = props.rawVue.template.match(/<el-card[^>]*>([\s\S]*?)<\/el-card>/);
          if (cardMatch && cardMatch[1]) {
            cardContent = cardMatch[1].replace(/<template\s+#header>[\s\S]*?<\/template>/, '');
          }

          // Match standard HTML tags and Element Plus components
          // Supported: el-button, h1-h6, p, div, span
          const childRegex = /<(el-button|h[1-6]|p|div|span)([^>]*)>([\s\S]*?)<\/\1>/g;
          const childrenMatches = cardContent.matchAll(childRegex);

          for (const m of childrenMatches) {
            const tag = m[1];
            const attrs = m[2]; // attributes string
            const inner = m[3]; // inner content

            if (tag === 'el-button') {
              // Preserve interpolation in text
              const text = inner?.trim() || 'Button';

              let type = 'primary';
              const attrsStr = attrs || '';
              if (attrsStr.includes('type="danger"')) type = 'danger';
              else if (attrsStr.includes('type="success"')) type = 'success';
              else if (attrsStr.includes('type="warning"')) type = 'warning';
              else if (attrsStr.includes('type="info"')) type = 'info';

              cardComp.children?.push({
                id: 'btn_' + Math.random(),
                type: 'el-button',
                label: '按钮',
                props: { type },
                text: text
              });
            } else {
              // Text tags (h1, p, etc)
              // Only add if there is actual content
              if (inner?.trim()) {
                cardComp.children?.push({
                  id: (tag || 'div') + '_' + Math.random(),
                  type: tag || 'div',
                  label: (tag || 'div').toUpperCase(),
                  props: {},
                  text: inner.trim()
                });
              }
            }
          }

          // Fallback for self-closing buttons if regex above didn't catch them (unlikely in this context but good for safety)
          // The regex above requires closing tag.

          canvasData.value.push(cardComp);
          ElMessage.info('已尝试解析卡片结构');
        } else {
          // Flat structure fallback (no el-card)
          const content = props.rawVue.template;
          const childRegex = /<(el-button|h[1-6]|p|div|span)([^>]*)>([\s\S]*?)<\/\1>/g;
          const matches = content.matchAll(childRegex);
          let found = false;

          for (const m of matches) {
            const tag = m[1];
            const attrs = m[2];
            const inner = m[3];

            if (tag === 'el-button') {
              const text = inner?.trim() || 'Button';
              let type = 'primary';
              const attrsStr = attrs || '';
              if (attrsStr.includes('type="danger"')) type = 'danger';
              else if (attrsStr.includes('type="success"')) type = 'success';
              else if (attrsStr.includes('type="warning"')) type = 'warning';
              else if (attrsStr.includes('type="info"')) type = 'info';

              canvasData.value.push({
                id: 'btn_' + Math.random(),
                type: 'el-button',
                label: '按钮',
                props: { type },
                text: text
              });
              found = true;
            } else {
              if (inner?.trim()) {
                canvasData.value.push({
                  id: (tag || 'div') + '_' + Math.random(),
                  type: tag || 'div',
                  label: (tag || 'div').toUpperCase(),
                  props: {},
                  text: inner.trim()
                });
                found = true;
              }
            }
          }
          if (found) {
            ElMessage.info('已从代码恢复组件结构');
          }
        }
      }
    }
  }
});

const cloneComponent = (origin: EditorComponent) => {
  const clone = JSON.parse(JSON.stringify(origin));
  clone.id = origin.type + '_' + Date.now() + Math.floor(Math.random() * 1000);
  // Reset children if container
  if (clone.isContainer) {
    clone.children = [];
  }
  return clone;
};

const setActiveComponent = (comp: EditorComponent) => {
  activeComponent.value = comp;
};

// Recursive delete
const deleteFromTree = (list: EditorComponent[], id: string): boolean => {
  const idx = list.findIndex((item) => item.id === id);
  if (idx !== -1) {
    list.splice(idx, 1);
    return true;
  }
  for (const item of list) {
    if (item.children && deleteFromTree(item.children, id)) {
      return true;
    }
  }
  return false;
};

const deleteComponent = (id: string) => {
  deleteFromTree(canvasData.value, id);
  if (activeComponent.value?.id === id) {
    activeComponent.value = null;
  }
};

const handleClear = () => {
  canvasData.value = [];
  activeComponent.value = null;
};

// Code Generation
const generatePropsString = (props: Record<string, any>, model?: string) => {
  let str = '';
  if (model) {
    str += ` v-model="form.${model}"`;
  }
  for (const [key, val] of Object.entries(props)) {
    if (key === 'columns' && Array.isArray(val)) {
      str += ` :columns="columns"`;
      continue;
    }
    if (val === true) str += ` ${key}`;
    else if (val === false)
      continue; // default usually false
    else if (typeof val === 'string') str += ` ${key}="${val}"`;
    else if (typeof val === 'number') str += ` :${key}="${val}"`;
    else if (key === 'requestApi' || key === 'apiUrl')
      continue; // Skip functions/internal api url
    else if (String(key).startsWith('_'))
      continue; // Skip internal props
    else str += ` :${key}='${JSON.stringify(val)}'`;
  }
  return str;
};

const generateTemplate = (components: EditorComponent[], indent = 2): string => {
  let code = '';
  const spaces = ' '.repeat(indent);

  for (const comp of components) {
    // Check for children or text
    const hasChildren = comp.children && comp.children.length > 0;
    const hasText = !!comp.text;
    const hasOptions = comp.options && comp.options.length > 0;
    const isHeaderTag = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'span'].includes(
      comp.type
    );

    // Generate component content
    let compCode = '';
    if (!hasChildren && !hasText && !hasOptions && !isHeaderTag) {
      compCode = ` />\n`;
    } else {
      compCode = `>\n`;

      if (comp.type === 'el-card' && comp.props.header) {
        compCode += `${spaces}  <template #header>\n`;
        compCode += `${spaces}    <div class="card-header">\n`;
        compCode += `${spaces}      <span>${comp.props.header}</span>\n`;
        compCode += `${spaces}    </div>\n`;
        compCode += `${spaces}  </template>\n`;
      }

      if (hasOptions && comp.type === 'el-select') {
        for (const opt of comp.options!) {
          compCode += `${spaces}  <el-option label="${opt.label}" value="${opt.value}" />\n`;
        }
      } else if (hasText) {
        compCode += `${spaces}  ${comp.text}\n`;
      } else if (hasChildren) {
        compCode += generateTemplate(comp.children!, indent + 2);
      }

      // Add default buttons for Form
      if (comp.type === 'el-form') {
        compCode += `${spaces}  <el-form-item>\n`;
        compCode += `${spaces}    <el-button type="primary" @click="onSubmit">Submit</el-button>\n`;
        compCode += `${spaces}    <el-button @click="onReset">Reset</el-button>\n`;
        compCode += `${spaces}  </el-form-item>\n`;
      }

      compCode += `${spaces}</${comp.type}>\n`;
    }

    // Remove label prop from the component itself as it's used by the wrapper
    // Also remove label from the component props string if it was rendered in el-form-item
    const propsWithoutLabel = { ...comp.props };
    if (comp.props && comp.props.label && !comp.isContainer && comp.type !== 'el-button') {
      delete propsWithoutLabel.label;
    }

    // Wrap in el-form-item if label is present and not a container/layout component
    if (comp.props && comp.props.label && !comp.isContainer && comp.type !== 'el-button') {
      const propAttr = comp.model ? ` prop="${comp.model}"` : '';
      code += `${spaces}<el-form-item label="${comp.props.label}"${propAttr}>\n`;
      code += `${spaces}  <${comp.type}${generatePropsString(propsWithoutLabel, comp.model)}${compCode}`;
      code += `${spaces}</el-form-item>\n`;
    } else {
      let extraAttrs = '';
      if (comp.type === 'el-form') {
        extraAttrs = ' ref="ruleFormRef" :model="form"';
      }
      code += `${spaces}<${comp.type}${generatePropsString(propsWithoutLabel, comp.model)}${extraAttrs}${compCode}`;
    }
  }
  return code;
};

const generateScript = (components: EditorComponent[]) => {
  // Collect v-models and ProTable
  const models: Record<string, any> = {};
  let hasProTable = false;
  let proTableColumns: any[] = [];
  let proTableApiUrl = '';

  const traverse = (list: EditorComponent[]) => {
    for (const item of list) {
      if (item.type === 'ProTable') {
        hasProTable = true;
        proTableColumns = item.props.columns || [];
        proTableApiUrl = item.props.apiUrl || '';
      }

      if (item.model) {
        if (item.type === 'el-input-number') {
          models[item.model] = 0;
        } else {
          models[item.model] = ''; // Default value
        }
      }
      // Special handling for button click events involving data properties
      if (item.type === 'el-button' && item.text && item.text.includes('{{')) {
        // Extract variable names from interpolation
        const matches = item.text.matchAll(/{{(.*?)}}/g);
        for (const m of matches) {
          if (!m[1]) continue;
          const varName = m[1].trim();
          if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
            if (!models[varName] && varName !== 'count') {
              models[varName] = '';
            } else if (varName === 'count') {
              models[varName] = 0;
            }
          }
        }
      }
      // Handle H1/P interpolation too
      if ((item.type === 'h1' || item.type === 'p') && item.text && item.text.includes('{{')) {
        const matches = item.text.matchAll(/{{(.*?)}}/g);
        for (const m of matches) {
          if (!m[1]) continue;
          const varName = m[1].trim();
          if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
            if (!models[varName]) {
              models[varName] = 'World'; // Default for name
            }
          }
        }
      }

      if (item.children) traverse(item.children);
    }
  };
  traverse(components);

  // Serialize current config for persistence
  const visualConfig = {
    form: components
  };

  const keys = Object.keys(models);
  const hasModels = keys.length > 0;

  // Check for el-form to include FormInstance and ref
  let hasForm = false;
  let formSubmitUrl = '';
  let formSubmitMethod = 'post';

  const checkForForm = (list: EditorComponent[]) => {
    for (const item of list) {
      if (item.type === 'el-form') {
        hasForm = true;
        if (item.props.submitUrl) {
          formSubmitUrl = item.props.submitUrl;
          formSubmitMethod = item.props.submitMethod || 'post';
        }
        return;
      }
      if (item.children) checkForForm(item.children);
    }
  };
  checkForForm(components);

  let script = '';
  const imports: string[] = [];
  if (hasModels || hasForm) {
    imports.push('reactive');
    if (hasModels) imports.push('toRefs');
  }
  if (hasForm || hasProTable) {
    imports.push('ref');
  }

  if (imports.length > 0) {
    script += `import { ${imports.join(', ')} } from 'vue';\n`;
    if (hasForm || hasProTable) {
      script += `import { ElMessage } from 'element-plus';\n`;
    }
    if (formSubmitUrl || (hasProTable && proTableApiUrl)) {
      script += `import request from '@/utils/request';\n`;
    }
    script += `\n`;
  }

  script += `// __VISUAL_CONFIG__ = ${JSON.stringify(visualConfig)}\n\n`;

  if (hasModels || hasForm) {
    script += `const form = reactive(${JSON.stringify(models, null, 2)});\n`;
    if (hasModels) {
      script += `const { ${keys.join(', ')} } = toRefs(form);\n`;
    }
  }

  if (hasProTable) {
    script += `\n// ProTable Configuration`;
    script += `\nconst columns = ${JSON.stringify(proTableColumns, null, 2)};\n`;

    if (proTableApiUrl) {
      script += `\nconst getTableList = (params) => {\n`;
      script += `  return request.get('${proTableApiUrl}', { params });\n`;
      script += `};\n`;
    } else {
      script += `\nconst getTableList = (params) => {\n`;
      script += `  return new Promise((resolve) => {\n`;
      script += `    setTimeout(() => {\n`;
      script += `      resolve({\n`;
      script += `        data: [{ id: 1, username: 'admin', ...params }],\n`;
      script += `        total: 10\n`;
      script += `      });\n`;
      script += `    }, 500);\n`;
      script += `  });\n`;
      script += `};\n`;
    }
  }

  if (hasForm) {
    script += `\nconst ruleFormRef = ref();\n`;
    script += `
const onSubmit = async () => {
  if (!ruleFormRef.value) return;
  await ruleFormRef.value.validate(async (valid, fields) => {
    if (valid) {
      console.log('submit!', form);`;

    if (formSubmitUrl) {
      script += `
      try {
        await request({
            url: '${formSubmitUrl}',
            method: '${formSubmitMethod}',
            data: form
        });
        ElMessage.success('提交成功');
      } catch (error) {
        ElMessage.error(error.message || '提交失败');
      }`;
    } else {
      script += `
      ElMessage.success('提交成功！数据已打印到控制台。');`;
    }

    script += `
    } else {
      console.log('error submit!', fields);
      ElMessage.error('表单验证失败，请检查输入。');
    }
  });
};

const onReset = () => {
  if (!ruleFormRef.value) return;
  ruleFormRef.value.resetFields();
  ElMessage.info('表单已重置');
};\n`;
  }

  return script;
};

const generateFullTemplate = (components: EditorComponent[]) => {
  // ProTable Special Handling
  const firstComponent = components[0];
  if (components.length === 1 && firstComponent && firstComponent.type === 'ProTable') {
    const table = firstComponent;
    const p = table.props;

    // Reconstruct templates
    let templates = '';
    if (p._customHeader) {
      templates += `
      <template #tableHeader>
        ${p._customHeader.map((b: any) => `<el-button type="${b.type}" icon="${b.icon}">${b.text}</el-button>`).join('\n        ')}
      </template>`;
    }
    if (p._customOp) {
      templates += `
      <template #operation="{ row }">
        ${p._customOp.map((b: any) => `<el-button link type="${b.type}" icon="${b.icon}" ${b.circle ? 'circle' : ''}>${b.text}</el-button>`).join('\n        ')}
      </template>`;
    }

    return `
  <div class="table-box">
    <ProTable
      ref="proTable"
      :columns="columns"
      :requestApi="getTableList"
      :pagination="${p.pagination}"
      :toolButton="${p.toolButton !== false}"
      title="${p.title || ''}"
      ${p.stripe ? 'stripe' : ''}
      ${p.size && p.size !== 'default' ? `size="${p.size}"` : ''}
    >${templates}
    </ProTable>
  </div>`;
  }

  // Check if we are generating a form wrapper or just plain components
  // If the root component is already a container like el-card or simple HTML tags, we might not need el-form
  // But usually, form inputs need el-form for styling and validation.

  // Check if there's an explicit el-form container in the root
  const hasExplicitForm = components.some((c) => c.type === 'el-form');

  // However, for the specific case of "Dynamic Component Example" where it's just a card with buttons and text,
  // wrapping it in el-form is redundant if there are no form inputs.

  const hasFormInputs = components.some(
    (c) =>
      [
        'el-input',
        'el-select',
        'el-switch',
        'el-date-picker',
        'el-input-number',
        'el-checkbox',
        'el-radio'
      ].includes(c.type) ||
      (c.children &&
        c.children.some((child) => ['el-input', 'el-select', 'el-switch'].includes(child.type)))
  );

  // If there is an explicit el-form, we don't wrap it again
  if (hasExplicitForm) {
    return `
${generateTemplate(components, 2)}`;
  }

  if (!hasFormInputs) {
    // Just render the components directly
    return `
${generateTemplate(components, 2)}`;
  }

  return `
  <div class="form-container">
    <el-form :model="form" label-width="100px">
${generateTemplate(components, 6)}    </el-form>
  </div>`;
};

const handlePreview = () => {
  const template = generateFullTemplate(canvasData.value);
  const script = generateScript(canvasData.value);

  // Show code dialog
  generatedCode.template = template;
  generatedCode.script = script;
  codeDialogVisible.value = true;
};

const handleSave = () => {
  const template = generateFullTemplate(canvasData.value);
  const script = generateScript(canvasData.value);
  const style = ''; // Empty for now

  // Show code dialog
  generatedCode.template = template;
  generatedCode.script = script;
  codeDialogVisible.value = true;

  emit('save', { template, script, style });
};
</script>

<style scoped>
.visual-editor {
  display: flex;
  height: 100%;
  border: 1px solid var(--el-border-color);
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
  flex-direction: column;
}

.editor-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: none;
  height: 100%;
  overflow: hidden;
}
:deep(.el-tabs__content) {
  flex: 1;
  padding: 0;
  overflow: hidden;
}
:deep(.el-tab-pane) {
  height: 100%;
}
:deep(.el-tabs__header) {
  margin-bottom: 0;
  background-color: var(--el-bg-color-overlay);
}

.tab-content {
  height: 100%;
  display: flex;
}

.list-editor {
  justify-content: center;
  align-items: center;
}

.form-editor {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.left-panel {
  width: 250px;
  flex-shrink: 0;
  border-right: 1px solid var(--el-border-color);
  padding: 10px;
  background: var(--el-bg-color-overlay);
  overflow-y: auto;
  height: 100%;
  box-sizing: border-box;
}

.component-group {
  margin-bottom: 20px;
}

.group-title {
  font-weight: bold;
  margin-bottom: 10px;
  color: var(--el-text-color-regular);
}

.component-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.component-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--el-bg-color);
  padding: 10px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  cursor: grab;
  font-size: 12px;
  color: var(--el-text-color-primary);
  transition: all 0.2s;
}

.component-item:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
  box-shadow: var(--el-box-shadow-light);
}

.component-item .el-icon {
  font-size: 20px;
  margin-bottom: 5px;
}

.center-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--el-fill-color-light);
  border-right: 1px solid var(--el-border-color);
  min-width: 0; /* Allow shrinking */
}

.canvas-toolbar {
  height: 50px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
}

.canvas-wrapper {
  flex: 1;
  overflow: hidden;
  position: relative;
}
.canvas-scroller {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  justify-content: center;
}

.canvas-container {
  background: var(--el-bg-color);
  box-shadow: var(--el-box-shadow);
  min-height: 100%;
  padding: 20px;
  transition: width 0.3s;
  position: relative;
}

.canvas-container.pc {
  width: 100%;
  max-width: 1200px;
}
.canvas-container.mobile {
  width: 375px;
}

.root-drag-area {
  min-height: 100%;
  height: 100%;
}

.empty-placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--el-text-color-placeholder);
  pointer-events: none;
}

.right-panel {
  width: 320px;
  flex-shrink: 0;
  background: var(--el-bg-color);
  overflow-y: auto;
  padding: 15px;
  height: 100%;
  box-sizing: border-box;
}

.props-editor h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: var(--el-text-color-primary);
}

.option-item {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 5px;
}

.column-item-editor {
  border: 1px solid var(--el-border-color-lighter);
  padding: 8px;
  border-radius: 4px;
  margin-bottom: 8px;
  background-color: var(--el-fill-color-lighter);
}
.col-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.col-row {
  display: flex;
  gap: 5px;
  margin-bottom: 5px;
}

.field-selector {
  max-height: 300px;
  overflow-y: auto;
}
.field-item {
  margin-bottom: 5px;
}
</style>
