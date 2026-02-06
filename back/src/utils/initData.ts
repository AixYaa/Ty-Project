import { SysService } from '../services/sysService';
import { GeneralService } from '../services/generalService';
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
              import { ref } from 'vue';
              const name = ref('World');
              const count = ref(0);
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
        // Force update to ensure latest code
        await SysService.updateSchema(schemaId.toString(), {
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
              import { ref } from 'vue';
              const name = ref('World');
              const count = ref(0);
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
        });
        console.log('HelloWorld schema updated:', schemaId);
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
      const parentMenu = await this.createOrUpdateMenu('/sys', '系统管理', 'Setting', 900, null, null, ['admin']);
      const parentMenuManage = await this.createOrUpdateMenu('/manage', '管理中心', 'Monitor', 900, null, null, ['admin']);
      const parentId = parentMenu._id.toString();
      const parentIdManage = parentMenuManage._id.toString();

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
      :deleteApi="deleteMenu"
      :operation="{ view: true, edit: true, delete: true, mode: 'hover' }"
      :formConfig="{ label: '菜单', initForm: { name: '', path: '', icon: '', sort: 0, parentId: undefined, schemaId: '', roles: [] }, width: '600px' }"
      @submit="submitForm"
      row-key="_id"
    >
      <!-- Table Header Buttons -->
      <template #tableHeader>
        <el-button type="primary" :icon="CirclePlus" @click="openAdd">新增菜单</el-button>
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
      </template>

      <!-- Built-in Editor Slot -->
      <template #edit-form="{ model, isEdit }">
        <el-tabs type="border-card">
          <el-tab-pane label="基本信息">
            <el-form :model="model" label-width="80px" style="padding-top: 10px;">
              <el-form-item label="父菜单">
                <el-tree-select
                  v-model="model.parentId"
                  :data="menuTreeData"
                  :props="{ label: 'name', value: '_id', children: 'children' }"
                  check-strictly
                  placeholder="请选择父菜单"
                  clearable
                  style="width: 100%"
                />
              </el-form-item>
              <el-form-item label="名称">
                <el-input v-model="model.name" placeholder="菜单名称" />
              </el-form-item>
              <el-form-item label="路径">
                <el-input v-model="model.path" placeholder="路由路径 (如 /sys/menu)" />
              </el-form-item>
              <el-form-item label="图标">
                <IconSelect v-model="model.icon" />
              </el-form-item>
              <el-form-item label="排序">
                <el-input-number v-model="model.sort" :min="0" />
              </el-form-item>
              <el-form-item label="绑定架构">
                <el-select v-model="model.schemaId" placeholder="请选择架构" style="width: 100%" clearable>
                  <el-option
                    v-for="item in schemaList"
                    :key="item._id"
                    :label="item.name"
                    :value="item._id"
                  />
                </el-select>
              </el-form-item>
            </el-form>
          </el-tab-pane>
          <el-tab-pane label="角色权限">
             <el-form :model="model" label-width="80px" style="padding-top: 10px;">
               <el-form-item label="可见角色">
                 <el-select
                    v-model="model.roles"
                    multiple
                    placeholder="请选择可见角色 (留空则所有角色可见)"
                    style="width: 100%"
                 >
                   <el-option
                     v-for="role in roleList"
                     :key="role.code"
                     :label="role.name"
                     :value="role.code"
                   />
                 </el-select>
               </el-form-item>
             </el-form>
          </el-tab-pane>
        </el-tabs>
      </template>

      <!-- Built-in Viewer Slot -->
      <template #view-form="{ model }">
        <el-form :model="model" label-width="80px" disabled>
          <el-form-item label="父菜单">
             <el-tree-select v-model="model.parentId" :data="menuTreeData" :props="{ label: 'name', value: '_id', children: 'children' }" style="width: 100%" />
          </el-form-item>
          <el-form-item label="名称"><el-input v-model="model.name" /></el-form-item>
          <el-form-item label="路径"><el-input v-model="model.path" /></el-form-item>
          <el-form-item label="图标"><IconSelect v-model="model.icon" disabled /></el-form-item>
          <el-form-item label="排序"><el-input-number v-model="model.sort" /></el-form-item>
          <el-form-item label="绑定架构">
             <el-select v-model="model.schemaId" style="width: 100%">
               <el-option v-for="item in schemaList" :key="item._id" :label="item.name" :value="item._id" />
             </el-select>
          </el-form-item>
          <el-form-item label="可见角色">
             <el-select v-model="model.roles" multiple style="width: 100%">
               <el-option v-for="role in roleList" :key="role.code" :label="role.name" :value="role.code" />
             </el-select>
          </el-form-item>
        </el-form>
      </template>
    </ProTable>
  </div>
        `,
        script: `
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { CirclePlus, Delete, EditPen, Warning } from '@element-plus/icons-vue';
import request from 'app-request';
import ProTable from '@/components/ProTable/index.vue';
import IconSelect from '@/components/IconSelect/index.vue';
import { VueMonacoEditor } from '@guolao/vue-monaco-editor';

// API
// Use generic core API for menu
const getMenuTree = () => request.get('/sys/menu/tree'); // Keep specialized tree API for now as generic one is flat list
const createMenu = (data) => request.post('/core/sys_menu', data);
const updateMenu = (id, data) => request.put('/core/sys_menu/' + id, data);
const deleteMenu = (id) => request.delete('/core/sys_menu/' + id);
const batchDeleteMenu = (ids) => request.post('/core/sys_menu/batch-delete', { ids });
const getSchemaListAll = () => request.get('/core/sys_schema', { params: { pageSize: 1000 } });
const getRoleListAll = () => request.get('/core/sys_role', { params: { pageSize: 1000 } });

// State
const proTable = ref();
const menuTreeData = ref([]);
const schemaList = ref([]);
const roleList = ref([]);

const initParam = reactive({});

const beforeSearchSubmit = (params) => {
  // Example: Modify params before search
  // e.g. Trim whitespace
  if (params.name) params.name = params.name.trim();
  if (params.path) params.path = params.path.trim();
  return params;
};

// Columns Config
const columns = [
  { type: 'selection', fixed: 'left' },
  { prop: 'name', label: '菜单名称',  align: 'left', search: { el: 'input' } },
  { prop: 'path', label: '路由路径', search: { el: 'input' } },
  { prop: 'icon', label: '图标' },
  { prop: 'sort', label: '排序' },
  { prop: 'schemaId', label: '绑定架构', showOverflowTooltip: true }
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
  const [schemaRes, roleRes] = await Promise.all([
    getSchemaListAll(),
    getRoleListAll()
  ]);
  schemaList.value = Array.isArray(schemaRes) ? schemaRes : schemaRes.list || [];
  roleList.value = Array.isArray(roleRes) ? roleRes : roleRes.list || [];
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
const openAdd = () => {
  proTable.value?.openAdd();
};

const handleAdd = (parent) => {
  // Special case: Add submenu with parentId
  proTable.value?.openAdd();
};

const submitForm = async (formData, done) => {
  try {
    if (formData._id) {
      await updateMenu(formData._id, formData);
      ElMessage.success('更新成功');
    } else {
      await createMenu(formData);
      ElMessage.success('创建成功');
    }
    done();
  } catch (e) {
    console.error(e);
    done();
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
      await this.createOrUpdateMenu('/sys/menu', '菜单管理', 'Menu', 1, menuSchema._id, parentId, ['admin']);

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
      :deleteApi="deleteEntity"
      :operation="{ view: true, edit: true, delete: true, mode: 'hover' }"
      :formConfig="{ label: '实体', initForm: { name: '' }, width: '500px' }"
      @submit="submitForm"
      row-key="_id"
    >
      <template #tableHeader>
        <el-button type="primary" :icon="CirclePlus" @click="openAdd">新增实体</el-button>
      </template>

      <!-- Built-in Editor Slot -->
      <template #edit-form="{ model }">
        <el-form :model="model" label-width="100px">
          <el-form-item label="实体名称">
            <el-input v-model="model.name" placeholder="数据库集合名 (如: user_data)" />
          </el-form-item>
        </el-form>
      </template>

      <!-- Built-in Viewer Slot -->
      <template #view-form="{ model }">
        <el-form :model="model" label-width="100px" disabled>
          <el-form-item label="实体名称">
            <el-input v-model="model.name" />
          </el-form-item>
        </el-form>
      </template>
    </ProTable>
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
const initParam = reactive({});

const form = ref({
  name: ''
});
const columns = [
  { type: 'selection', fixed: 'left', width: 55 },
  { prop: 'name', label: '实体名称', search: { el: 'input' } }
];

const getTableList = async (params) => {
  const res = await getEntityList(params);
  return {
    data: Array.isArray(res) ? res : res.list || [],
    total: Array.isArray(res) ? res.length : res.total || 0
  };
};

// Actions
const openAdd = () => {
  proTable.value?.openAdd();
};

const submitForm = async (formData, done) => {
  try {
    if (!formData.name) {
       ElMessage.warning('实体名称不能为空');
       done();
       return;
    }

    if (formData._id) {
      await updateEntity(formData._id, formData);
      ElMessage.success('更新成功');
    } else {
      await createEntity(formData);
      ElMessage.success('创建成功');
    }
    done();
  } catch (e) {
    console.error(e);
    done();
  }
};
        `,
        style: `.page-container { padding: 20px; } .code-tabs { height: 500px; } .editor-container { height: 400px; }`
      };
      const entitySchema = await this.createOrUpdateSchema('SysEntityManage', '实体管理', entitySchemaCode, entitySysEntity._id.toString(), viewSysEntity._id.toString());
      await this.createOrUpdateMenu('/sys/entity', '实体管理', 'DataBoard', 2, entitySchema._id, parentId, ['admin']);

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
      :deleteApi="deleteView"
      :operation="{ view: true, edit: true, delete: true, mode: 'hover' }"
      :formConfig="{ label: '视图', initForm: { name: '', entityId: '', type: 'list', config: {} } }"
      @submit="submitForm"
      row-key="_id"
    >
      <template #tableHeader>
        <el-button type="primary" :icon="CirclePlus" @click="openAdd">新增视图</el-button>
      </template>

      <template #entityId="{ row }">
        <el-tag>{{ getEntityName(row.entityId) }}</el-tag>
      </template>

      <!-- Built-in Editor Slot -->
      <template #edit-form="{ model, isEdit }">
        <el-form :model="model" label-width="100px">
            <el-form-item label="视图名称">
              <el-input v-model="model.name" placeholder="视图名称 (如: 用户列表)" />
            </el-form-item>
            <el-form-item label="关联实体">
              <el-select v-model="model.entityId" placeholder="请选择实体" style="width: 100%">
                <el-option
                  v-for="item in entityList"
                  :key="item._id"
                  :label="item.name"
                  :value="item._id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="视图类型">
              <el-select v-model="model.type" placeholder="请选择视图类型" style="width: 100%">
                <el-option label="列表视图 (List)" value="list" />
                <el-option label="表单视图 (Form)" value="form" />
              </el-select>
            </el-form-item>
        </el-form>
      </template>

      <!-- Built-in Viewer Slot -->
      <template #view-form="{ model }">
        <el-form :model="model" label-width="100px" disabled>
          <el-form-item label="视图名称">
            <el-input v-model="model.name" />
          </el-form-item>
          <el-form-item label="关联实体">
             <el-select v-model="model.entityId" style="width: 100%">
               <el-option v-for="item in entityList" :key="item._id" :label="item.name" :value="item._id" />
             </el-select>
          </el-form-item>
          <el-form-item label="视图类型">
            <el-select v-model="model.type" style="width: 100%">
              <el-option label="列表视图 (List)" value="list" />
              <el-option label="表单视图 (Form)" value="form" />
            </el-select>
          </el-form-item>
        </el-form>
      </template>
    </ProTable>
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
const initParam = reactive({});
const entityList = ref([]);

// Columns
const columns = [
  { type: 'selection', fixed: 'left', width: 55 },
  { prop: 'name', label: '视图名称', search: { el: 'input' } },
  { prop: 'entityId', label: '关联实体' },
  { prop: 'type', label: '视图类型' }
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
const openAdd = () => {
  proTable.value?.openAdd();
};

const submitForm = async (formData, done) => {
  try {
    if (!formData.name || !formData.entityId) {
       ElMessage.warning('名称和实体不能为空');
       done();
       return;
    }

    if (formData._id) {
      await updateView(formData._id, formData);
      ElMessage.success('更新成功');
    } else {
      await createView(formData);
      ElMessage.success('创建成功');
    }
    done();
  } catch (e) {
    console.error(e);
    done();
  }
};
        `,
        style: `.page-container { padding: 20px; }`
      };
      const viewSchema = await this.createOrUpdateSchema('SysViewManage', '视图管理', viewSchemaCode, entitySysView._id.toString(), viewSysView._id.toString());
      await this.createOrUpdateMenu('/sys/view', '视图管理', 'View', 3, viewSchema._id, parentId, ['admin']);

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
      :deleteApi="deleteSchema"
      :operation="{ view: true, edit: true, delete: true, mode: 'hover' }"
      :formConfig="{ 
        label: '架构', 
        initForm: { name: '', entityId: '', viewId: '', vue: { template: '', script: '', style: '' } },
        width: '90%',
        class: 'schema-edit-drawer',
        contentStyle: { height: '100%', display: 'flex', flexDirection: 'column' }
      }"
      @submit="submitForm"
      row-key="_id"
    >
      <template #tableHeader>
        <el-button type="primary" :icon="CirclePlus" @click="openAdd">新增架构</el-button>
      </template>

      <template #entityId="{ row }">
        <el-tag type="info">{{ getEntityName(row.entityId) }}</el-tag>
      </template>

      <template #viewId="{ row }">
        <el-tag type="warning">{{ getViewName(row.viewId) }}</el-tag>
      </template>

      <!-- Built-in Editor Slot -->
      <template #edit-form="{ model, isEdit }">
        <div class="schema-drawer-content">
          <el-form :model="model" label-width="100px" class="schema-form-flex">
            <div class="schema-form-header">
              <el-form-item label="架构名称">
                <el-input v-model="model.name" placeholder="架构唯一标识 (如: UserList)" />
              </el-form-item>
              <el-row>
                <el-col :span="12">
                  <el-form-item label="关联实体">
                    <el-select v-model="model.entityId" placeholder="请选择实体" style="width: 100%" @change="handleEntityChange(model)">
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
                    <el-select v-model="model.viewId" placeholder="请选择视图" style="width: 100%" :disabled="!model.entityId">
                      <el-option
                        v-for="item in getFilteredViewList(model.entityId)"
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
                  <div style="display: flex; align-items: center;">
                      <span v-if="hasError" style="color: #f56c6c; margin-right: 15px; font-size: 14px;">
                          <el-icon style="vertical-align: middle"><Warning /></el-icon> 代码存在语法错误
                      </span>
                      <el-button type="primary" link @click="generateCode(model)" :disabled="!model.viewId">根据视图生成代码</el-button>
                  </div>
              </div>
            </div>

            <el-tabs v-model="activeTab" type="border-card" class="code-tabs">
              <el-tab-pane label="Template" name="template">
                <template #label>
                    Template <el-badge :value="errors.template.length" type="danger" v-if="errors.template.length > 0" />
                </template>
                <div class="editor-container">
                    <vue-monaco-editor
                        v-model:value="model.vue.template"
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
                        v-model:value="model.vue.script"
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
                        v-model:value="model.vue.style"
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
        </div>
      </template>

      <!-- Built-in Viewer Slot -->
      <template #view-form="{ model }">
        <div class="schema-drawer-content" style="height: 70vh; display: flex; flex-direction: column; overflow: hidden;">
          <el-form :model="model" label-width="100px" class="schema-form-flex" style="height: 100%; display: flex; flex-direction: column;">
            <div class="schema-form-header" style="flex-shrink: 0;">
              <el-form-item label="架构名称">
                <el-input v-model="model.name" readonly />
              </el-form-item>
              <el-row>
                <el-col :span="12">
                   <el-form-item label="关联实体">
                      <el-select v-model="model.entityId" style="width: 100%" disabled>
                        <el-option v-for="item in entityList" :key="item._id" :label="item.name" :value="item._id" />
                      </el-select>
                   </el-form-item>
                </el-col>
                <el-col :span="12">
                   <el-form-item label="关联视图">
                      <el-select v-model="model.viewId" style="width: 100%" disabled>
                        <el-option v-for="item in getFilteredViewList(model.entityId)" :key="item._id" :label="item.name" :value="item._id" />
                      </el-select>
                   </el-form-item>
                </el-col>
              </el-row>
            </div>

            <el-tabs v-model="activeTab" type="border-card" class="code-tabs" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
              <el-tab-pane label="Template" name="template" style="height: 100%;">
                <div class="editor-container" style="height: 100%;">
                    <vue-monaco-editor
                        :value="model.vue.template"
                        theme="vs-dark"
                        language="html"
                        :options="{ readOnly: true, automaticLayout: true, scrollBeyondLastLine: false, minimap: { enabled: false } }"
                        height="100%"
                    />
                </div>
              </el-tab-pane>
              <el-tab-pane label="Script" name="script" style="height: 100%;">
                <div class="editor-container" style="height: 100%;">
                    <vue-monaco-editor
                        :value="model.vue.script"
                        theme="vs-dark"
                        language="javascript"
                        :options="{ readOnly: true, automaticLayout: true, scrollBeyondLastLine: false, minimap: { enabled: false } }"
                        height="100%"
                    />
                </div>
              </el-tab-pane>
              <el-tab-pane label="Style" name="style" style="height: 100%;">
                <div class="editor-container" style="height: 100%;">
                    <vue-monaco-editor
                        :value="model.vue.style"
                        theme="vs-dark"
                        language="css"
                        :options="{ readOnly: true, automaticLayout: true, scrollBeyondLastLine: false, minimap: { enabled: false } }"
                        height="100%"
                    />
                </div>
              </el-tab-pane>
            </el-tabs>
          </el-form>
        </div>
      </template>
    </ProTable>
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
const activeTab = ref('template');
const initParam = reactive({});
const entityList = ref([]);
const viewList = ref([]);

// Validation
const errors = reactive({ template: [], script: [], style: [] });
const hasError = computed(() => errors.template.length > 0 || errors.script.length > 0 || errors.style.length > 0);

const handleValidate = (markers, type) => {
    errors[type] = markers.filter(marker => marker.severity === 8); // Error = 8
};

// Computed Helpers
const getFilteredViewList = (entityId) => {
  if (!entityId) return [];
  return viewList.value.filter(v => v.entityId === entityId);
};

// Columns
const columns = [
  { type: 'selection', fixed: 'left', width: 55 },
  { prop: 'name', label: '架构名称', width: 200, search: { el: 'input' } },
  { prop: 'entityId', label: '关联实体',},
  { prop: 'viewId', label: '关联视图', }
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
const openAdd = () => {
  errors.template = []; errors.script = []; errors.style = [];
  activeTab.value = 'template';
  proTable.value?.openAdd();
};

const handleEntityChange = (model) => {
  model.viewId = '';
};

const generateCode = (model) => {
  // Mock generation logic based on view type
  const view = viewList.value.find(v => v._id === model.viewId);
  const entity = entityList.value.find(e => e._id === model.entityId);
  
  if (!view || !entity) return;

  if (view.type === 'list') {
    model.vue.template = \`
<div class="page-container">
  <ProTable
      ref="proTable"
      :columns="columns"
      :requestApi="getTableList"
      :operation="{ edit: true, delete: true, mode: 'hover' }"
      @edit="handleEdit"
      @delete="handleDelete"
      row-key="_id"
    >
      <template #tableHeader>
        <el-button type="primary" :icon="CirclePlus" @click="handleAdd">新增</el-button>
      </template>
    </ProTable>
  <!-- Add Dialog Here -->
</div>
\`;
    model.vue.script = \`
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
  { prop: 'name', label: 'Name' } // Example
];

const handleAdd = () => { /* ... */ };
const handleEdit = (row) => { /* ... */ };
const handleDelete = async (row) => { /* ... */ };
\`;
    model.vue.style = \`.page-container { padding: 20px; }\`;
  }
  
  ElMessage.success('代码已生成 (示例)');
};

const submitForm = async (formData, done) => {
  try {
    if (!formData.name) {
       ElMessage.warning('架构名称不能为空');
       done();
       return;
    }
    
    if (hasError.value) {
       ElMessage.error('代码存在语法错误，请修正后再提交');
       done();
       return;
    }

    if (formData._id) {
      await updateSchema(formData._id, formData);
      ElMessage.success('更新成功');
    } else {
      await createSchema(formData);
      ElMessage.success('创建成功');
    }
    done();
  } catch (e) {
    console.error(e);
    done();
  }
};
        `,
        style: `
.page-container { padding: 20px; }
.schema-edit-drawer .el-drawer__body {
  flex: 1;
  min-height: 0;
  padding: 10px 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.schema-drawer-content {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.schema-form-flex { height: 100%; display: flex; flex-direction: column; }
.schema-form-header { flex: 0 0 auto; padding-right: 10px; }
.code-tabs { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.code-tabs :deep(.el-tabs__content) { flex: 1; padding: 0; overflow: hidden; }
.code-tabs :deep(.el-tab-pane) { height: 100%; }
.editor-container { height: 100%; }
`
      };
      const schemaSchema = await this.createOrUpdateSchema('SysSchemaManage', '架构管理', schemaSchemaCode, entitySysSchema._id.toString(), viewSysSchema._id.toString());
      await this.createOrUpdateMenu('/sys/schema', '架构管理', 'Document', 4, schemaSchema._id, parentId, ['admin']);

      // --- 5. 角色管理 (Role Management) ---
      const entitySysRole = await this.createOrUpdateEntity('sys_role');
      const viewSysRole = await this.createOrUpdateView('SysRoleList', entitySysRole._id.toString());
      
      const roleSchemaCode = {
        template: `
<div class="page-container">
    <ProTable
      ref="proTable"
      :columns="columns"
      :requestApi="getTableList"
      :initParam="initParam"
      :batchDeleteApi="batchDeleteRole"
      :deleteApi="deleteRole"
      :operation="{ view: true, edit: true, delete: true, mode: 'hover' }"
      :formConfig="{ label: '角色', initForm: { name: '', code: '', description: '', status: 1 }, width: '500px' }"
      @submit="submitForm"
      row-key="_id"
    >
      <template #tableHeader>
        <el-button type="primary" :icon="CirclePlus" @click="openAdd">新增角色</el-button>
      </template>
      
      <template #status="{ row }">
        <el-tag :type="row.status === 1 ? 'success' : 'danger'">{{ row.status === 1 ? '启用' : '禁用' }}</el-tag>
      </template>

      <!-- Editor -->
      <template #edit-form="{ model }">
        <el-form :model="model" label-width="100px">
          <el-form-item label="角色名称">
            <el-input v-model="model.name" placeholder="如: 管理员" />
          </el-form-item>
          <el-form-item label="角色标识">
            <el-input v-model="model.code" placeholder="如: admin" />
          </el-form-item>
          <el-form-item label="描述">
            <el-input v-model="model.description" type="textarea" />
          </el-form-item>
          <el-form-item label="状态">
             <el-switch v-model="model.status" :active-value="1" :inactive-value="0" />
          </el-form-item>
        </el-form>
      </template>

      <!-- Viewer -->
      <template #view-form="{ model }">
        <el-form :model="model" label-width="100px" disabled>
          <el-form-item label="角色名称"><el-input v-model="model.name" /></el-form-item>
          <el-form-item label="角色标识"><el-input v-model="model.code" /></el-form-item>
          <el-form-item label="描述"><el-input v-model="model.description" type="textarea" /></el-form-item>
          <el-form-item label="状态">
             <el-tag :type="model.status === 1 ? 'success' : 'danger'">{{ model.status === 1 ? '启用' : '禁用' }}</el-tag>
          </el-form-item>
        </el-form>
      </template>
    </ProTable>
</div>
        `,
        script: `
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import { CirclePlus } from '@element-plus/icons-vue';
import request from 'app-request';
import ProTable from '@/components/ProTable/index.vue';

// API
const getRoleList = (params) => request.get('/core/sys_role', { params });
const createRole = (data) => request.post('/core/sys_role', data);
const updateRole = (id, data) => request.put('/core/sys_role/' + id, data);
const deleteRole = (id) => request.delete('/core/sys_role/' + id);
const batchDeleteRole = (ids) => request.post('/core/sys_role/batch-delete', { ids });

const proTable = ref();
const initParam = reactive({});

const columns = [
  { type: 'selection', fixed: 'left', width: 55 },
  { prop: 'name', label: '角色名称', search: { el: 'input' } },
  { prop: 'code', label: '角色标识', search: { el: 'input' } },
  { prop: 'description', label: '描述' },
  { prop: 'status', label: '状态' }
];

const getTableList = async (params) => {
  const res = await getRoleList(params);
  return {
    data: Array.isArray(res) ? res : res.list || [],
    total: Array.isArray(res) ? res.length : res.total || 0
  };
};

const openAdd = () => proTable.value?.openAdd();

const submitForm = async (formData, done) => {
  try {
    if (!formData.name || !formData.code) {
       ElMessage.warning('名称和标识不能为空');
       done();
       return;
    }
    if (formData._id) {
      await updateRole(formData._id, formData);
      ElMessage.success('更新成功');
    } else {
      await createRole(formData);
      ElMessage.success('创建成功');
    }
    done();
  } catch (e) {
    console.error(e);
    done();
  }
};
        `,
        style: `.page-container { padding: 20px; }`
      };
      
      const roleSchema = await this.createOrUpdateSchema('SysRoleManage', '角色管理', roleSchemaCode, entitySysRole._id.toString(), viewSysRole._id.toString());
      await this.createOrUpdateMenu('/manage/role', '角色管理', 'Avatar', 5, roleSchema._id, parentIdManage, ['admin']);


      // --- 6. 用户管理 (User Management) ---
      // Note: User entity is 'sys用户' (already used by AuthService)
      // We ensure the metadata entity exists
      const entitySysUser = await this.createOrUpdateEntity('sys用户');
      const viewSysUser = await this.createOrUpdateView('SysUserList', entitySysUser._id.toString());

      const userSchemaCode = {
        template: `
<div class="page-container">
    <ProTable
      ref="proTable"
      :columns="columns"
      :requestApi="getTableList"
      :initParam="initParam"
      :batchDeleteApi="batchDeleteUser"
      :deleteApi="deleteUser"
      :operation="{ view: true, edit: true, delete: true, mode: 'hover' }"
      :formConfig="{ label: '用户', initForm: { username: '', password: '', name: '', role: '', status: 1 }, width: '500px' }"
      @submit="submitForm"
      row-key="_id"
    >
      <template #tableHeader>
        <el-button type="primary" :icon="CirclePlus" @click="openAdd">新增用户</el-button>
      </template>

      <template #role="{ row }">
        <el-tag type="info">{{ getRoleName(row.role) }}</el-tag>
      </template>
      
      <template #status="{ row }">
        <el-switch v-model="row.status" :active-value="1" :inactive-value="0" @change="handleStatusChange(row)" />
      </template>

      <!-- Editor -->
      <template #edit-form="{ model, isEdit }">
        <el-form :model="model" label-width="100px">
          <el-form-item label="用户名">
            <el-input v-model="model.username" placeholder="登录账号" :disabled="isEdit" />
          </el-form-item>
          <el-form-item label="密码" v-if="!isEdit">
            <el-input v-model="model.password" type="password" show-password placeholder="初始密码" />
          </el-form-item>
          <el-form-item label="重置密码" v-else>
            <el-input v-model="model.password" type="password" show-password placeholder="留空则不修改" />
          </el-form-item>
          <el-form-item label="姓名">
            <el-input v-model="model.name" placeholder="真实姓名" />
          </el-form-item>
          <el-form-item label="角色">
             <el-select v-model="model.role" placeholder="选择角色" style="width: 100%" clearable>
                <el-option v-for="item in roleList" :key="item.code" :label="item.name" :value="item.code" />
             </el-select>
          </el-form-item>
          <el-form-item label="状态">
             <el-switch v-model="model.status" :active-value="1" :inactive-value="0" />
          </el-form-item>
        </el-form>
      </template>
      
      <!-- Viewer -->
      <template #view-form="{ model }">
        <el-form :model="model" label-width="100px" disabled>
          <el-form-item label="用户名"><el-input v-model="model.username" /></el-form-item>
          <el-form-item label="姓名"><el-input v-model="model.name" /></el-form-item>
          <el-form-item label="角色"><el-tag>{{ getRoleName(model.role) }}</el-tag></el-form-item>
          <el-form-item label="状态">
             <el-tag :type="model.status === 1 ? 'success' : 'danger'">{{ model.status === 1 ? '启用' : '禁用' }}</el-tag>
          </el-form-item>
        </el-form>
      </template>
    </ProTable>
</div>
        `,
        script: `
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { CirclePlus } from '@element-plus/icons-vue';
import request from 'app-request';
import ProTable from '@/components/ProTable/index.vue';

// API
const getUserList = (params) => request.get('/core/sys用户', { params });
const createUser = (data) => request.post('/core/sys用户', data);
const updateUser = (id, data) => request.put('/core/sys用户/' + id, data);
const deleteUser = (id) => request.delete('/core/sys用户/' + id);
const batchDeleteUser = (ids) => request.post('/core/sys用户/batch-delete', { ids });
const getRoleListApi = () => request.get('/core/sys_role', { params: { pageSize: 100 } });

const proTable = ref();
const initParam = reactive({});
const roleList = ref([]);

const columns = [
  { type: 'selection', fixed: 'left', width: 55 },
  { prop: 'username', label: '用户名', search: { el: 'input' } },
  { prop: 'name', label: '姓名', search: { el: 'input' } },
  { prop: 'role', label: '角色' },
  { prop: 'status', label: '状态' },
  { prop: 'createdAt', label: '创建时间', width: 180 }
];

const getTableList = async (params) => {
  const res = await getUserList(params);
  return {
    data: Array.isArray(res) ? res : res.list || [],
    total: Array.isArray(res) ? res.length : res.total || 0
  };
};

const getRoleName = (code) => {
  const role = roleList.value.find(r => r.code === code);
  return role ? role.name : code;
};

onMounted(async () => {
  const res = await getRoleListApi();
  roleList.value = Array.isArray(res) ? res : res.list || [];
});

const openAdd = () => {
  proTable.value.openAdd();
};

const handleStatusChange = async (row) => {
  try {
    if (row._id) {
       await updateUser(row._id, { status: row.status });
       ElMessage.success('状态更新成功');
    }
  } catch (e) {
    row.status = row.status === 1 ? 0 : 1; // revert
    console.error(e);
  }
};

const submitForm = async (formData, done) => {
  try {
    if (!formData.username) {
       ElMessage.warning('用户名不能为空');
       done();
       return;
    }
    if (!formData._id && !formData.password) {
       ElMessage.warning('初始密码不能为空');
       done();
       return;
    }

    if (formData._id) {
      if (!formData.password) delete formData.password;
      await updateUser(formData._id, formData);
      ElMessage.success('更新成功');
    } else {
      await createUser(formData);
      ElMessage.success('创建成功');
    }
    done();
  } catch (e) {
    console.error(e);
    done();
  }
};
        `,
        style: `.page-container { padding: 20px; }`
      };
      
      const userSchema = await this.createOrUpdateSchema('SysUserManage', '用户管理', userSchemaCode, entitySysUser._id.toString(), viewSysUser._id.toString());
      await this.createOrUpdateMenu('/manage/user', '用户管理', 'User', 6, userSchema._id, parentIdManage, ['admin']);

    } catch (error) {
      console.error('Failed to init sys schemas:', error);
    }
  }

  static async initDefaultRoles() {
    try {
      console.log('Initializing default roles...');
      // Check if admin role exists
      const { list } = await GeneralService.getList('sys_role', { code: 'admin' });
      if (list.length === 0) {
        console.log('Creating default admin role...');
        await GeneralService.create('sys_role', {
          name: '超级管理员',
          code: 'admin',
          description: '系统超级管理员，拥有所有权限',
          status: 1
        });
      } else {
        console.log('Admin role already exists');
      }
      
      // Check if user role exists
      const { list: userList } = await GeneralService.getList('sys_role', { code: 'user' });
      if (userList.length === 0) {
         console.log('Creating default user role...');
         await GeneralService.create('sys_role', {
           name: '普通用户',
           code: 'user',
           description: '普通注册用户',
           status: 1
         });
      } else {
        console.log('User role already exists');
      }
    } catch (error) {
      console.error('Failed to init default roles:', error);
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
  static async createOrUpdateMenu(path: string, name: string, icon: string, sort: number, schemaId: any, parentId: string | null, roles?: string[]) {
    const menus = await SysService.getMenus({ path });
    let menu;

    if (menus.length > 0) {
      menu = menus[0];
      // Update existing menu if schemaId is missing or different
      const updates: any = {};
      let needsUpdate = false;

      if (schemaId && (!menu.schemaId || menu.schemaId !== schemaId.toString())) {
        updates.schemaId = schemaId.toString();
        needsUpdate = true;
      }
      
      if (parentId && (!menu.parentId || menu.parentId !== parentId)) {
        updates.parentId = parentId;
        needsUpdate = true;
      }

      // Update roles if provided and different
      if (roles) {
        const currentRoles = menu.roles || [];
        const rolesChanged = roles.length !== currentRoles.length || !roles.every(r => currentRoles.includes(r));
        if (rolesChanged) {
          updates.roles = roles;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await SysService.updateMenu(menu._id.toString(), updates);
        console.log(`Updated menu for ${path}: ${Object.keys(updates).join(', ')}`);
      }
    } else {
      // Create new menu
      const menuData: SysMenu = {
        name,
        path,
        icon,
        sort,
        schemaId: schemaId ? schemaId.toString() : undefined,
        parentId: parentId || undefined,
        roles: roles
      };
      const result = await SysService.createMenu(menuData);
      menu = { ...menuData, _id: result._id };
      console.log(`Created menu: ${path}`);
    }
    return menu;
  }
}
