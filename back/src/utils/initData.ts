import { SysService } from '../services/sysService';
import { SysSchema, SysMenu } from '../types/sys';

export class DataInitializer {
  static async initTestSchemaAndMenu() {
    try {
      console.log('Initializing test schema and menu...');

      // 1. Check if schema exists
      const schemas = await SysService.getSchemas({ name: 'HelloWorld' });
      let schemaId: any;

      if (schemas.length === 0) {
        // Create Hello World Schema
        const schemaData: SysSchema = {
          name: 'HelloWorld',
          vue: {
            template: `
              <div class="hello-world">
                <el-card>
                  <template #header>
                    <div class="card-header">
                      <span>动态组件示例</span>
                    </div>
                  </template>
                  <h1>Hello {{ name }}!</h1>
                  <p>这是一个从服务端加载的动态 Vue 组件。</p>
                  <el-button type="primary" @click="count++">Count is: {{ count }}</el-button>
                </el-card>
              </div>
            `,
            script: `
              export default {
                data() {
                  return {
                    name: 'World',
                    count: 0
                  }
                }
              }
            `,
            style: `
              .hello-world {
                padding: 20px;
              }
              h1 {
                color: #409EFF;
              }
            `
          }
        };
        const newSchema = await SysService.createSchema(schemaData);
        schemaId = newSchema._id;
        console.log('Created HelloWorld schema:', schemaId);
      } else {
        schemaId = schemas[0]._id;
        console.log('HelloWorld schema already exists:', schemaId);
      }

      // 2. Check if menu exists
      const menus = await SysService.getMenus({ path: '/test/dynamic' });

      if (menus.length === 0) {
        const menuData: SysMenu = {
          name: '动态测试',
          path: '/test/dynamic',
          icon: 'Monitor',
          sort: 100,
          schemaId: schemaId.toString()
        };
        await SysService.createMenu(menuData);
        console.log('Created dynamic test menu');
      } else {
        console.log('Dynamic test menu already exists');
      }

    } catch (error) {
      console.error('Failed to init test data:', error);
    }
  }

  static async initSysManagementSchemas() {
    try {
      console.log('Initializing System Management Schemas...');

      // --- 0. Ensure Parent Menu (System Management) ---
      const parentMenu = await this.createOrUpdateMenu('/sys', '系统管理', 'Setting', 900, null, null);
      const parentId = parentMenu._id.toString();

      // --- 0.1 Initialize System Entities & Views ---
      const entitySysMenu = await this.createOrUpdateEntity('sys_menu');
      const entitySysEntity = await this.createOrUpdateEntity('sys_entity');
      const entitySysView = await this.createOrUpdateEntity('sys_view');
      const entitySysSchema = await this.createOrUpdateEntity('sys_schema');

      const viewSysMenu = await this.createOrUpdateView('SysMenuList', entitySysMenu._id.toString());
      const viewSysEntity = await this.createOrUpdateView('SysEntityList', entitySysEntity._id.toString());
      const viewSysView = await this.createOrUpdateView('SysViewList', entitySysView._id.toString());
      const viewSysSchema = await this.createOrUpdateView('SysSchemaList', entitySysSchema._id.toString());

      // --- 1. 菜单管理 (Menu Management) ---
      const menuSchemaCode = {
        template: `
<div class="page-container">
    <ProTable
      ref="proTable"
      :columns="columns"
      :requestApi="getTableList"
      :initParam="initParam"
      :beforeSearchSubmit="beforeSearchSubmit"
      :batchDeleteApi="batchDeleteMenu"
      row-key="_id"
    >
      <!-- Table Header Buttons -->
      <template #tableHeader>
        <el-button type="primary" :icon="CirclePlus" @click="handleAdd()">新增菜单</el-button>
      </template>

      <!-- Custom Columns -->
      <template #icon="{ row }">
        <el-icon v-if="row.icon">
          <component :is="row.icon" />
        </el-icon>
      </template>

      <template #schemaId="{ row }">
        <el-tag type="success">{{ getSchemaName(row.schemaId) }}</el-tag>
      </template>

      <template #operation="{ row }">
        <el-button link type="primary" :icon="CirclePlus" @click="handleAdd(row)">新增子菜单</el-button>
        <el-button link type="primary" :icon="EditPen" @click="handleEdit(row)">编辑</el-button>
        <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">删除</el-button>
      </template>
    </ProTable>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑菜单' : '新增菜单'"
      width="500px"
    >
      <el-form :model="form" label-width="80px">
        <el-form-item label="父菜单">
          <el-tree-select
            v-model="form.parentId"
            :data="menuTreeData"
            :props="{ label: 'name', value: '_id', children: 'children' }"
            check-strictly
            placeholder="请选择父菜单"
            clearable
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="菜单名称" />
        </el-form-item>
        <el-form-item label="路径">
          <el-input v-model="form.path" placeholder="路由路径 (如 /sys/menu)" />
        </el-form-item>
        <el-form-item label="图标">
          <el-input v-model="form.icon" placeholder="Element Plus 图标名" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" />
        </el-form-item>
        <el-form-item label="绑定架构">
          <el-select v-model="form.schemaId" placeholder="请选择架构" style="width: 100%" clearable>
            <el-option
              v-for="item in schemaList"
              :key="item._id"
              :label="item.name"
              :value="item._id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
        `,
        script: `
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { CirclePlus, Delete, EditPen, Warning } from '@element-plus/icons-vue';
import request from 'app-request';
import ProTable from '@/components/ProTable/index.vue';
import { VueMonacoEditor } from '@guolao/vue-monaco-editor';

// API
// Use generic core API for menu
const getMenuTree = () => request.get('/sys/menu/tree'); // Keep specialized tree API for now as generic one is flat list
const createMenu = (data) => request.post('/core/sys_menu', data);
const updateMenu = (id, data) => request.put('/core/sys_menu/' + id, data);
const deleteMenu = (id) => request.delete('/core/sys_menu/' + id);
const batchDeleteMenu = (ids) => request.post('/core/sys_menu/batch-delete', { ids });
const getSchemaListAll = () => request.get('/core/sys_schema', { params: { pageSize: 1000 } });

// State
const proTable = ref();
const dialogVisible = ref(false);
const submitting = ref(false);
const isEdit = ref(false);
const menuTreeData = ref([]);
const schemaList = ref([]);

const initParam = reactive({});

const beforeSearchSubmit = (params) => {
  // Example: Modify params before search
  // e.g. Trim whitespace
  if (params.name) params.name = params.name.trim();
  if (params.path) params.path = params.path.trim();
  return params;
};

const form = ref({
  name: '',
  path: '',
  icon: '',
  sort: 0,
  parentId: undefined,
  schemaId: ''
});

// Columns Config
const columns = [
  { type: 'selection', fixed: 'left' },
  { prop: 'name', label: '菜单名称',  align: 'left', search: { el: 'input' } },
  { prop: 'path', label: '路由路径', search: { el: 'input' } },
  { prop: 'icon', label: '图标' },
  { prop: 'sort', label: '排序' },
  { prop: 'schemaId', label: '绑定架构', showOverflowTooltip: true },
  { prop: 'operation', label: '操作', width: 280, fixed: 'right' }
];

// Data Request
const getTableList = async (params) => {
  const res = await getMenuTree();
  menuTreeData.value = res; // Cache for select

  // Frontend Filter
  let data = res;
  if (params.name || params.path) {
    data = filterTree(data, params.name, params.path);
  }

  return {
    data: data,
    total: data.length
  };
};

const getSchemaName = (id) => {
  const schema = schemaList.value.find(s => s._id === id);
  return schema ? schema.name : id;
};

// Initialize
onMounted(async () => {
  const res = await getSchemaListAll();
  schemaList.value = Array.isArray(res) ? res : res.list || [];
});

// Helper: Filter tree data
const filterTree = (tree, name, path) => {
  return tree.map(item => ({ ...item })).filter(item => {
    let match = true;
    if (name && !item.name.toLowerCase().includes(name.toLowerCase())) match = false;
    if (path && !item.path.toLowerCase().includes(path.toLowerCase())) match = false;

    if (match) return true;
    
    if (item.children && item.children.length > 0) {
      const children = filterTree(item.children, name, path);
      if (children.length > 0) {
        item.children = children;
        return true;
      }
    }
    return false;
  });
};

// Actions
const handleAdd = (parent) => {
  isEdit.value = false;
  form.value = {
    name: '',
    path: '',
    icon: '',
    sort: 0,
    parentId: parent?._id,
    schemaId: ''
  };
  dialogVisible.value = true;
};

const handleEdit = (row) => {
  isEdit.value = true;
  form.value = { ...row };
  dialogVisible.value = true;
};

const handleDelete = async (row) => {
  try {
    let msg = \`确定删除菜单 "<strong>\${row.name}</strong>" 吗？\`;
    if (row.children && row.children.length > 0) {
      msg += \`<br/><span style="color:red">注意：该菜单包含 \${row.children.length} 个子菜单！</span>\`;
    }
    msg += \`<br/>此操作不可恢复！\`;

    await ElMessageBox.confirm(msg, '警告', { 
      type: 'warning',
      dangerouslyUseHTMLString: true,
      confirmButtonText: '确定删除',
      cancelButtonText: '取消'
    });
    await deleteMenu(row._id);
    ElMessage.success('删除成功');
    proTable.value?.getTableList();
  } catch (e) {}
};

const submitForm = async () => {
  submitting.value = true;
  try {
    if (isEdit.value) {
      await updateMenu(form.value._id, form.value);
      ElMessage.success('更新成功');
    } else {
      await createMenu(form.value);
      ElMessage.success('创建成功');
    }
    dialogVisible.value = false;
    proTable.value?.getTableList();
  } finally {
    submitting.value = false;
  }
};
        `,
        style: `
.page-container {
  height: 100%;
  padding: 20px;
  background-color: #f0f2f5;
}
        `
      };

      const menuSchema = await this.createOrUpdateSchema('SysMenuManage', '菜单管理', menuSchemaCode, entitySysMenu._id.toString(), viewSysMenu._id.toString());
      await this.createOrUpdateMenu('/sys/menu', '菜单管理', 'Menu', 1, menuSchema._id, parentId);

      // --- 2. 实体管理 (Entity Management) ---
      const entitySchemaCode = {
        template: `
<div class="page-container">
    <ProTable
      ref="proTable"
      :columns="columns"
      :requestApi="getTableList"
      :initParam="initParam"
      :batchDeleteApi="batchDeleteEntity"
      row-key="_id"
    >
      <template #tableHeader>
        <el-button type="primary" :icon="CirclePlus" @click="handleAdd()">新增实体</el-button>
      </template>

      <template #operation="{ row }">
        <el-button link type="primary" :icon="EditPen" @click="handleEdit(row)">编辑</el-button>
        <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">删除</el-button>
      </template>
    </ProTable>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑实体' : '新增实体'"
      width="400px"
    >
      <el-form :model="form" label-width="100px">
        <el-form-item label="实体名称">
          <el-input v-model="form.name" placeholder="数据库集合名 (如: user_data)" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
</div>
        `,
        script: `
import { ref, reactive } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { CirclePlus, Delete, EditPen, Warning } from '@element-plus/icons-vue';
import request from 'app-request';
import ProTable from '@/components/ProTable/index.vue';

// API
const getEntityList = (params) => request.get('/core/sys_entity', { params });
const createEntity = (data) => request.post('/core/sys_entity', data);
const updateEntity = (id, data) => request.put('/core/sys_entity/' + id, data);
const deleteEntity = (id) => request.delete('/core/sys_entity/' + id);
const batchDeleteEntity = (ids) => request.post('/core/sys_entity/batch-delete', { ids });

// State
const proTable = ref();
const dialogVisible = ref(false);
const submitting = ref(false);
const isEdit = ref(false);
const initParam = reactive({});

const form = ref({
  name: ''
});

// Columns
const columns = [
  { type: 'selection', fixed: 'left', width: 55 },
  { prop: 'name', label: '实体名称', search: { el: 'input' } },
  { prop: 'operation', label: '操作', fixed: 'right', width: 180 }
];

const getTableList = async (params) => {
  const res = await getEntityList(params);
  return {
    data: Array.isArray(res) ? res : res.list || [],
    total: Array.isArray(res) ? res.length : res.total || 0
  };
};

// Actions
const handleAdd = () => {
  isEdit.value = false;
  form.value = { name: '' };
  dialogVisible.value = true;
};

const handleEdit = (row) => {
  isEdit.value = true;
  form.value = { ...row };
  dialogVisible.value = true;
};

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(\`确定删除实体 "<strong>\${row.name}</strong>" 吗？\`, '提示', { 
      type: 'warning',
      dangerouslyUseHTMLString: true
    });
    await deleteEntity(row._id);
    ElMessage.success('删除成功');
    proTable.value?.getTableList();
  } catch (e) {}
};

const submitForm = async () => {
  submitting.value = true;
  try {
    if (!form.value.name) {
       ElMessage.warning('实体名称不能为空');
       return;
    }

    if (isEdit.value) {
      await updateEntity(form.value._id, form.value);
      ElMessage.success('更新成功');
    } else {
      await createEntity(form.value);
      ElMessage.success('创建成功');
    }
    dialogVisible.value = false;
    proTable.value?.getTableList();
  } catch (e) {
    console.error(e);
  } finally {
    submitting.value = false;
  }
};
        `,
        style: `.page-container { padding: 20px; } .code-tabs { height: 500px; } .editor-container { height: 400px; }`
      };
      const entitySchema = await this.createOrUpdateSchema('SysEntityManage', '实体管理', entitySchemaCode, entitySysEntity._id.toString(), viewSysEntity._id.toString());
      await this.createOrUpdateMenu('/sys/entity', '实体管理', 'DataBoard', 2, entitySchema._id, parentId);

      // --- 3. 视图管理 (View Management) ---
      const viewSchemaCode = {
        template: `
<div class="page-container">
    <ProTable
      ref="proTable"
      :columns="columns"
      :requestApi="getTableList"
      :initParam="initParam"
      :batchDeleteApi="batchDeleteView"
      row-key="_id"
    >
      <template #tableHeader>
        <el-button type="primary" :icon="CirclePlus" @click="handleAdd()">新增视图</el-button>
      </template>

      <template #entityId="{ row }">
        <el-tag>{{ getEntityName(row.entityId) }}</el-tag>
      </template>

      <template #operation="{ row }">
        <el-button link type="primary" :icon="EditPen" @click="handleEdit(row)">编辑</el-button>
        <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">删除</el-button>
      </template>
    </ProTable>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑视图' : '新增视图'"
      width="600px"
    >
      <el-form :model="form" label-width="100px">
        <el-form-item label="视图名称">
          <el-input v-model="form.name" placeholder="视图名称 (如: 用户列表)" />
        </el-form-item>
        <el-form-item label="关联实体">
          <el-select v-model="form.entityId" placeholder="请选择实体" style="width: 100%">
            <el-option
              v-for="item in entityList"
              :key="item._id"
              :label="item.name"
              :value="item._id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="视图类型">
          <el-select v-model="form.type" placeholder="请选择视图类型" style="width: 100%">
            <el-option label="列表视图 (List)" value="list" />
            <el-option label="表单视图 (Form)" value="form" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
</div>
        `,
        script: `
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { CirclePlus, Delete, EditPen } from '@element-plus/icons-vue';
import request from 'app-request';
import ProTable from '@/components/ProTable/index.vue';

// API
const getViewList = (params) => request.get('/core/sys_view', { params });
const createView = (data) => request.post('/core/sys_view', data);
const updateView = (id, data) => request.put('/core/sys_view/' + id, data);
const deleteView = (id) => request.delete('/core/sys_view/' + id);
const batchDeleteView = (ids) => request.post('/core/sys_view/batch-delete', { ids });
const getEntityListAll = () => request.get('/core/sys_entity', { params: { pageSize: 1000 } });

// State
const proTable = ref();
const dialogVisible = ref(false);
const submitting = ref(false);
const isEdit = ref(false);
const initParam = reactive({});
const entityList = ref([]);

const form = ref({
  name: '',
  entityId: '',
  type: 'list',
  config: {}
});

// Columns
const columns = [
  { type: 'selection', fixed: 'left', width: 55 },
  { prop: 'name', label: '视图名称', search: { el: 'input' } },
  { prop: 'entityId', label: '关联实体' },
  { prop: 'type', label: '视图类型' },
  { prop: 'operation', label: '操作', fixed: 'right', width: 180 }
];

const getTableList = async (params) => {
  const res = await getViewList(params);
  return {
    data: Array.isArray(res) ? res : res.list || [],
    total: Array.isArray(res) ? res.length : res.total || 0
  };
};

const getEntityName = (id) => {
  const entity = entityList.value.find(e => e._id === id);
  return entity ? entity.name : id;
};

// Initialize
onMounted(async () => {
  const res = await getEntityListAll();
  entityList.value = Array.isArray(res) ? res : res.list || [];
});

// Actions
const handleAdd = () => {
  isEdit.value = false;
  form.value = { name: '', entityId: '', type: 'list', config: {} };
  dialogVisible.value = true;
};

const handleEdit = (row) => {
  isEdit.value = true;
  form.value = { ...row };
  dialogVisible.value = true;
};

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(\`确定删除视图 "<strong>\${row.name}</strong>" 吗？\`, '提示', { 
      type: 'warning',
      dangerouslyUseHTMLString: true
    });
    await deleteView(row._id);
    ElMessage.success('删除成功');
    proTable.value?.getTableList();
  } catch (e) {}
};

const submitForm = async () => {
  submitting.value = true;
  try {
    if (!form.value.name || !form.value.entityId) {
       ElMessage.warning('名称和实体不能为空');
       return;
    }

    if (isEdit.value) {
      await updateView(form.value._id, form.value);
      ElMessage.success('更新成功');
    } else {
      await createView(form.value);
      ElMessage.success('创建成功');
    }
    dialogVisible.value = false;
    proTable.value?.getTableList();
  } catch (e) {
    console.error(e);
  } finally {
    submitting.value = false;
  }
};
        `,
        style: `.page-container { padding: 20px; }`
      };
      const viewSchema = await this.createOrUpdateSchema('SysViewManage', '视图管理', viewSchemaCode, entitySysView._id.toString(), viewSysView._id.toString());
      await this.createOrUpdateMenu('/sys/view', '视图管理', 'View', 3, viewSchema._id, parentId);

      // --- 4. 架构管理 (Schema Management) ---
      const schemaSchemaCode = {
        template: `
<div class="page-container">
    <ProTable
      ref="proTable"
      :columns="columns"
      :requestApi="getTableList"
      :initParam="initParam"
      :batchDeleteApi="batchDeleteSchema"
      row-key="_id"
    >
      <template #tableHeader>
        <el-button type="primary" :icon="CirclePlus" @click="handleAdd()">新增架构</el-button>
      </template>

      <template #entityId="{ row }">
        <el-tag type="info">{{ getEntityName(row.entityId) }}</el-tag>
      </template>

      <template #viewId="{ row }">
        <el-tag type="warning">{{ getViewName(row.viewId) }}</el-tag>
      </template>

      <template #operation="{ row }">
        <el-button link type="primary" :icon="EditPen" @click="handleEdit(row)">编辑</el-button>
        <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">删除</el-button>
      </template>
    </ProTable>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑架构' : '新增架构'"
      width="90%"
      top="5vh"
    >
      <el-form :model="form" label-width="100px">
        <el-form-item label="架构名称">
          <el-input v-model="form.name" placeholder="架构唯一标识 (如: UserList)" />
        </el-form-item>
        <el-row>
          <el-col :span="12">
            <el-form-item label="关联实体">
              <el-select v-model="form.entityId" placeholder="请选择实体" style="width: 100%" @change="handleEntityChange">
                <el-option
                  v-for="item in entityList"
                  :key="item._id"
                  :label="item.name"
                  :value="item._id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="关联视图">
              <el-select v-model="form.viewId" placeholder="请选择视图" style="width: 100%" :disabled="!form.entityId">
                <el-option
                  v-for="item in filteredViewList"
                  :key="item._id"
                  :label="item.name"
                  :value="item._id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
             <span style="font-weight: bold;">代码编辑</span>
             <el-button type="primary" link @click="generateCode" :disabled="!form.viewId">根据视图生成代码</el-button>
        </div>

        <el-tabs v-model="activeTab" type="border-card" class="code-tabs">
          <el-tab-pane label="Template" name="template">
            <template #label>
                Template <el-badge :value="errors.template.length" type="danger" v-if="errors.template.length > 0" />
            </template>
            <div class="editor-container">
                <vue-monaco-editor
                    v-model:value="form.vue.template"
                    theme="vs-dark"
                    language="html"
                    :options="{ automaticLayout: true, scrollBeyondLastLine: false, mouseWheelZoom: true, minimap: { enabled: false } }"
                    height="100%"
                    @validate="(markers) => handleValidate(markers, 'template')"
                />
            </div>
          </el-tab-pane>
          <el-tab-pane label="Script" name="script">
            <template #label>
                Script <el-badge :value="errors.script.length" type="danger" v-if="errors.script.length > 0" />
            </template>
            <div class="editor-container">
                <vue-monaco-editor
                    v-model:value="form.vue.script"
                    theme="vs-dark"
                    language="javascript"
                    :options="{ automaticLayout: true, scrollBeyondLastLine: false, mouseWheelZoom: true, minimap: { enabled: false } }"
                    height="100%"
                    @validate="(markers) => handleValidate(markers, 'script')"
                />
            </div>
          </el-tab-pane>
          <el-tab-pane label="Style" name="style">
            <template #label>
                Style <el-badge :value="errors.style.length" type="danger" v-if="errors.style.length > 0" />
            </template>
            <div class="editor-container">
                <vue-monaco-editor
                    v-model:value="form.vue.style"
                    theme="vs-dark"
                    language="css"
                    :options="{ automaticLayout: true, scrollBeyondLastLine: false, mouseWheelZoom: true, minimap: { enabled: false } }"
                    height="100%"
                    @validate="(markers) => handleValidate(markers, 'style')"
                />
            </div>
          </el-tab-pane>
        </el-tabs>

      </el-form>
      <template #footer>
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span v-if="hasError" style="color: #f56c6c; margin-right: 10px;">
                <el-icon><Warning /></el-icon> 代码存在语法错误
            </span>
            <div>
                <el-button @click="dialogVisible = false">取消</el-button>
                <el-button type="primary" @click="submitForm" :loading="submitting" :disabled="hasError">确定</el-button>
            </div>
        </div>
      </template>
    </el-dialog>
</div>
        `,
        script: `
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { CirclePlus, Delete, EditPen, Warning } from '@element-plus/icons-vue';
import request from 'app-request';
import ProTable from '@/components/ProTable/index.vue';
import { VueMonacoEditor } from '@guolao/vue-monaco-editor';

// API
const getSchemaList = (params) => request.get('/core/sys_schema', { params });
const createSchema = (data) => request.post('/core/sys_schema', data);
const updateSchema = (id, data) => request.put('/core/sys_schema/' + id, data);
const deleteSchema = (id) => request.delete('/core/sys_schema/' + id);
const batchDeleteSchema = (ids) => request.post('/core/sys_schema/batch-delete', { ids });
const getEntityListAll = () => request.get('/core/sys_entity', { params: { pageSize: 1000 } });
const getViewListAll = () => request.get('/core/sys_view', { params: { pageSize: 1000 } });

// State
const proTable = ref();
const dialogVisible = ref(false);
const submitting = ref(false);
const isEdit = ref(false);
const activeTab = ref('template');
const initParam = reactive({});
const entityList = ref([]);
const viewList = ref([]);

const form = ref({
  name: '',
  entityId: '',
  viewId: '',
  vue: {
    template: '',
    script: '',
    style: ''
  }
});

// Validation
const errors = reactive({ template: [], script: [], style: [] });
const hasError = computed(() => errors.template.length > 0 || errors.script.length > 0 || errors.style.length > 0);

const handleValidate = (markers, type) => {
    errors[type] = markers.filter(marker => marker.severity === 8); // Error = 8
};

// Computed
const filteredViewList = computed(() => {
  if (!form.value.entityId) return [];
  return viewList.value.filter(v => v.entityId === form.value.entityId);
});

// Columns
const columns = [
  { type: 'selection', fixed: 'left', width: 55 },
  { prop: 'name', label: '架构名称', width: 200, search: { el: 'input' } },
  { prop: 'entityId', label: '关联实体',},
  { prop: 'viewId', label: '关联视图', },
  { prop: 'operation', label: '操作', fixed: 'right' }
];

const getTableList = async (params) => {
  const res = await getSchemaList(params);
  return {
    data: Array.isArray(res) ? res : res.list || [],
    total: Array.isArray(res) ? res.length : res.total || 0
  };
};

const getEntityName = (id) => {
  const entity = entityList.value.find(e => e._id === id);
  return entity ? entity.name : id;
};

const getViewName = (id) => {
  const view = viewList.value.find(v => v._id === id);
  return view ? view.name : id;
};

// Initialize
onMounted(async () => {
  const [resEntity, resView] = await Promise.all([getEntityListAll(), getViewListAll()]);
  entityList.value = Array.isArray(resEntity) ? resEntity : resEntity.list || [];
  viewList.value = Array.isArray(resView) ? resView : resView.list || [];
});

// Actions
const handleAdd = () => {
  isEdit.value = false;
  form.value = { 
    name: '', 
    entityId: '', 
    viewId: '', 
    vue: { template: '', script: '', style: '' } 
  };
  errors.template = []; errors.script = []; errors.style = [];
  dialogVisible.value = true;
};

const handleEdit = (row) => {
  isEdit.value = true;
  form.value = { ...row };
  // Ensure vue object exists
  if (!form.value.vue) form.value.vue = { template: '', script: '', style: '' };
  errors.template = []; errors.script = []; errors.style = [];
  dialogVisible.value = true;
};

const handleEntityChange = () => {
  form.value.viewId = '';
};

const generateCode = () => {
  // Mock generation logic based on view type
  const view = viewList.value.find(v => v._id === form.value.viewId);
  const entity = entityList.value.find(e => e._id === form.value.entityId);
  
  if (!view || !entity) return;

  if (view.type === 'list') {
    form.value.vue.template = \`
<div class="page-container">
  <ProTable
    ref="proTable"
    :columns="columns"
    :requestApi="getTableList"
    row-key="_id"
  >
    <template #tableHeader>
      <el-button type="primary" :icon="CirclePlus" @click="handleAdd">新增</el-button>
    </template>
    <template #operation="{ row }">
      <el-button link type="primary" :icon="EditPen" @click="handleEdit(row)">编辑</el-button>
      <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">删除</el-button>
    </template>
  </ProTable>
  <!-- Add Dialog Here -->
</div>
\`;
    form.value.vue.script = \`
import { ref, reactive } from 'vue';
import { CirclePlus, Delete, EditPen } from '@element-plus/icons-vue';
import request from 'app-request';
import ProTable from '@/components/ProTable/index.vue';

// API (Using Generic Core API)
const apiPrefix = '/core/\${entity.name}';
const getTableList = (params) => request.get(apiPrefix, { params });
const createApi = (data) => request.post(apiPrefix, data);
const updateApi = (id, data) => request.put(apiPrefix + '/' + id, data);
const deleteApi = (id) => request.delete(apiPrefix + '/' + id);

const proTable = ref();
const columns = [
  // Define columns based on entity fields if available
  { prop: 'name', label: 'Name' }, // Example
  { prop: 'operation', label: '操作', fixed: 'right', width: 180 }
];

const handleAdd = () => { /* ... */ };
const handleEdit = (row) => { /* ... */ };
const handleDelete = async (row) => { /* ... */ };
\`;
    form.value.vue.style = \`.page-container { padding: 20px; }\`;
  }
  
  ElMessage.success('代码已生成 (示例)');
};

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(\`确定删除架构 "<strong>\${row.name}</strong>" 吗？\`, '提示', { 
      type: 'warning',
      dangerouslyUseHTMLString: true
    });
    await deleteSchema(row._id);
    ElMessage.success('删除成功');
    proTable.value?.getTableList();
  } catch (e) {}
};

const submitForm = async () => {
  submitting.value = true;
  try {
    if (!form.value.name) {
       ElMessage.warning('架构名称不能为空');
       return;
    }

    if (isEdit.value) {
      await updateSchema(form.value._id, form.value);
      ElMessage.success('更新成功');
    } else {
      await createSchema(form.value);
      ElMessage.success('创建成功');
    }
    dialogVisible.value = false;
    proTable.value?.getTableList();
  } catch (e) {
    console.error(e);
  } finally {
    submitting.value = false;
  }
};
        `,
        style: `.page-container { padding: 20px; } .code-tabs { height: 500px; } .editor-container { height: 400px; }`
      };
      const schemaSchema = await this.createOrUpdateSchema('SysSchemaManage', '架构管理', schemaSchemaCode, entitySysSchema._id.toString(), viewSysSchema._id.toString());
      await this.createOrUpdateMenu('/sys/schema', '架构管理', 'Document', 4, schemaSchema._id, parentId);

    } catch (error) {
      console.error('Failed to init sys schemas:', error);
    }
  }

  // Helper: Create or Update Schema
  static async createOrUpdateSchema(name: string, displayName: string, vueCode: any, entityId?: string, viewId?: string) {
    const schemas = await SysService.getSchemas({ name });
    let schema;
    const updateData: any = { vue: vueCode };
    if (entityId) updateData.entityId = entityId;
    if (viewId) updateData.viewId = viewId;

    if (schemas.length === 0) {
      schema = await SysService.createSchema({ name, ...updateData } as any);
      console.log(`Created schema: ${name}`);
    } else {
      schema = schemas[0];
      // Update existing schema to ensure latest code is applied
      await SysService.updateSchema(schema._id.toString(), updateData);
      console.log(`Schema updated: ${name}`);
    }
    return schema;
  }

  // Helper: Create or Update Entity
  static async createOrUpdateEntity(name: string) {
    // Regex match for exact name (SysService wraps in regex)
    const result = await SysService.getEntities({ name: `^${name}$` });
    if (result.list.length > 0) {
      console.log(`Entity already exists: ${name}`);
      return result.list[0];
    }
    const entity = await SysService.createEntity({ name });
    console.log(`Created entity: ${name}`);
    return entity;
  }

  // Helper: Create or Update View
  static async createOrUpdateView(name: string, entityId: string, type: 'list' | 'form' = 'list') {
    const views = await SysService.getViews({ name });
    const view = views.find(v => v.name === name);

    if (view) {
      if (view.entityId !== entityId) {
        await SysService.updateView(view._id.toString(), { entityId });
        console.log(`Updated view entityId: ${name}`);
      } else {
        console.log(`View already exists: ${name}`);
      }
      return view;
    }
    const newView = await SysService.createView({ name, entityId, type, config: {} });
    console.log(`Created view: ${name}`);
    return newView;
  }

  // Helper: Create or Update Menu
  static async createOrUpdateMenu(path: string, name: string, icon: string, sort: number, schemaId: any, parentId: string | null) {
    const menus = await SysService.getMenus({ path });
    let menu;

    if (menus.length > 0) {
      menu = menus[0];
      // Update existing menu if schemaId is missing or different
      if (schemaId && (!menu.schemaId || menu.schemaId !== schemaId.toString())) {
        await SysService.updateMenu(menu._id.toString(), { schemaId: schemaId.toString() });
        console.log(`Updated menu schemaId for ${path}`);
      }
      // Also ensure parentId is correct if provided
      if (parentId && (!menu.parentId || menu.parentId !== parentId)) {
        await SysService.updateMenu(menu._id.toString(), { parentId });
        console.log(`Updated menu parentId for ${path}`);
      }
    } else {
      // Create new menu
      const menuData: SysMenu = {
        name,
        path,
        icon,
        sort,
        schemaId: schemaId ? schemaId.toString() : undefined,
        parentId: parentId || undefined
      };
      const result = await SysService.createMenu(menuData);
      menu = { ...menuData, _id: result._id };
      console.log(`Created menu: ${path}`);
    }
    return menu;
  }
}
