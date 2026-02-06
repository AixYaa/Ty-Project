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
          name: 'menu.test.dynamic',
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
      const parentMenu = await this.createOrUpdateMenu('/sys', 'menu.system.management', 'Setting', 900, null, null, ['admin']);
      const parentMenuManage = await this.createOrUpdateMenu('/manage', 'menu.system.center', 'Monitor', 900, null, null, ['admin']);
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
      :formConfig="{ label: $t('column.menuName'), initForm: { name: '', path: '', icon: '', sort: 0, parentId: undefined, schemaId: '', roles: [] }, width: '600px' }"
      @submit="submitForm"
      row-key="_id"
    >
      <!-- Table Header Buttons -->
      <template #tableHeader>
        <el-button type="primary" :icon="CirclePlus" @click="openAdd">{{ $t('table.add', { name: $t('column.menuName') }) }}</el-button>
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
        <el-button link type="primary" :icon="CirclePlus" @click="handleAdd(row)">{{ $t('table.addSubMenu') }}</el-button>
      </template>

      <!-- Built-in Editor Slot -->
      <template #edit-form="{ model, isEdit }">
        <el-tabs type="border-card">
          <el-tab-pane :label="$t('menu.basicInfo')">
            <el-form :model="model" label-width="80px" style="padding-top: 10px;">
              <el-form-item :label="$t('menu.parentMenu')">
                <el-tree-select
                  v-model="model.parentId"
                  :data="menuTreeData"
                  :props="{ label: 'name', value: '_id', children: 'children' }"
                  check-strictly
                  :placeholder="$t('common.pleaseSelect') + $t('menu.parentMenu')"
                  clearable
                  style="width: 100%"
                />
              </el-form-item>
              <el-form-item :label="$t('column.menuName')">
                <el-input v-model="model.name" :placeholder="$t('common.pleaseInput') + $t('column.menuName')" />
              </el-form-item>
              <el-form-item :label="$t('column.routePath')">
                <el-input v-model="model.path" :placeholder="$t('common.pleaseInput') + $t('column.routePath')" />
              </el-form-item>
              <el-form-item :label="$t('column.icon')">
                <IconSelect v-model="model.icon" />
              </el-form-item>
              <el-form-item :label="$t('column.sort')">
                <el-input-number v-model="model.sort" :min="0" />
              </el-form-item>
              <el-form-item :label="$t('column.bindSchema')">
                <el-select v-model="model.schemaId" :placeholder="$t('common.pleaseSelect') + $t('column.bindSchema')" style="width: 100%" clearable>
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
          <el-tab-pane :label="$t('menu.rolePermission')">
             <el-form :model="model" label-width="80px" style="padding-top: 10px;">
               <el-form-item :label="$t('menu.visibleRoles')">
                 <el-select
                    v-model="model.roles"
                    multiple
                    :placeholder="$t('menu.visibleRolesPlaceholder')"
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
          <el-form-item :label="$t('menu.parentMenu')">
             <el-tree-select v-model="model.parentId" :data="menuTreeData" :props="{ label: 'name', value: '_id', children: 'children' }" style="width: 100%" />
          </el-form-item>
          <el-form-item :label="$t('column.menuName')"><el-input v-model="model.name" /></el-form-item>
          <el-form-item :label="$t('column.routePath')"><el-input v-model="model.path" /></el-form-item>
          <el-form-item :label="$t('column.icon')"><IconSelect v-model="model.icon" disabled /></el-form-item>
          <el-form-item :label="$t('column.sort')"><el-input-number v-model="model.sort" /></el-form-item>
          <el-form-item :label="$t('column.bindSchema')">
             <el-select v-model="model.schemaId" style="width: 100%">
               <el-option v-for="item in schemaList" :key="item._id" :label="item.name" :value="item._id" />
             </el-select>
          </el-form-item>
          <el-form-item :label="$t('menu.visibleRoles')">
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
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { CirclePlus, Delete, EditPen, Warning } from '@element-plus/icons-vue';
import request from 'app-request';
import ProTable from '@/components/ProTable/index.vue';
import IconSelect from '@/components/IconSelect/index.vue';
import { VueMonacoEditor } from '@guolao/vue-monaco-editor';

// API
const { t } = useI18n();
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
  { prop: 'name', label: 'column.menuName',  align: 'left', search: { el: 'input' } },
  { prop: 'path', label: 'column.routePath', search: { el: 'input' } },
  { prop: 'icon', label: 'column.icon' },
  { prop: 'sort', label: 'column.sort' },
  { prop: 'schemaId', label: 'column.bindSchema', showOverflowTooltip: true }
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
}
        `
      };

      const menuSchema = await this.createOrUpdateSchema('SysMenuManage', '菜单管理', menuSchemaCode, entitySysMenu._id.toString(), viewSysMenu._id.toString());
      await this.createOrUpdateMenu('/sys/menu', 'menu.system.menu', 'Menu', 1, menuSchema._id, parentId, ['admin']);

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
      :formConfig="{ label: $t('column.entityName'), initForm: { name: '' }, width: '500px' }"
      @submit="submitForm"
      row-key="_id"
    >
      <template #tableHeader>
        <el-button type="primary" :icon="CirclePlus" @click="openAdd">{{ $t('table.add', { name: $t('column.entityName') }) }}</el-button>
      </template>

      <!-- Built-in Editor Slot -->
      <template #edit-form="{ model }">
        <el-form :model="model" label-width="100px">
          <el-form-item :label="$t('column.entityName')">
            <el-input v-model="model.name" :placeholder="$t('common.pleaseInput') + $t('column.entityName')" />
          </el-form-item>
        </el-form>
      </template>

      <!-- Built-in Viewer Slot -->
      <template #view-form="{ model }">
        <el-form :model="model" label-width="100px" disabled>
          <el-form-item :label="$t('column.entityName')">
            <el-input v-model="model.name" />
          </el-form-item>
        </el-form>
      </template>
    </ProTable>
</div>
        `,
        script: `
import { ref, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { CirclePlus, Delete, EditPen, Warning } from '@element-plus/icons-vue';
import request from 'app-request';
import ProTable from '@/components/ProTable/index.vue';

// API
const { t } = useI18n();
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
  { prop: 'name', label: 'column.entityName', search: { el: 'input' } }
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
       ElMessage.warning($t('common.notEmpty', { name: $t('column.entityName') }));
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
      await this.createOrUpdateMenu('/sys/entity', 'menu.system.entity', 'DataBoard', 2, entitySchema._id, parentId, ['admin']);

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
      :formConfig="{ label: $t('column.viewName'), initForm: { name: '', entityId: '', type: 'list', config: {} } }"
      @submit="submitForm"
      row-key="_id"
    >
      <template #tableHeader>
        <el-button type="primary" :icon="CirclePlus" @click="openAdd">{{ $t('table.add', { name: $t('column.viewName') }) }}</el-button>
      </template>

      <template #entityId="{ row }">
        <el-tag>{{ getEntityName(row.entityId) }}</el-tag>
      </template>

      <!-- Built-in Editor Slot -->
      <template #edit-form="{ model, isEdit }">
        <el-form :model="model" label-width="100px">
            <el-form-item :label="$t('column.viewName')">
              <el-input v-model="model.name" :placeholder="$t('common.pleaseInput') + $t('column.viewName')" />
            </el-form-item>
            <el-form-item :label="$t('column.relatedEntity')">
              <el-select v-model="model.entityId" :placeholder="$t('common.pleaseSelect') + $t('column.relatedEntity')" style="width: 100%">
                <el-option
                  v-for="item in entityList"
                  :key="item._id"
                  :label="item.name"
                  :value="item._id"
                />
              </el-select>
            </el-form-item>
            <el-form-item :label="$t('column.viewType')">
              <el-select v-model="model.type" :placeholder="$t('common.pleaseSelect') + $t('column.viewType')" style="width: 100%">
                <el-option :label="$t('view.listView')" value="list" />
                <el-option :label="$t('view.formView')" value="form" />
              </el-select>
            </el-form-item>
        </el-form>
      </template>

      <!-- Built-in Viewer Slot -->
      <template #view-form="{ model }">
        <el-form :model="model" label-width="100px" disabled>
          <el-form-item :label="$t('column.viewName')">
            <el-input v-model="model.name" />
          </el-form-item>
          <el-form-item :label="$t('column.relatedEntity')">
             <el-select v-model="model.entityId" style="width: 100%">
               <el-option v-for="item in entityList" :key="item._id" :label="item.name" :value="item._id" />
             </el-select>
          </el-form-item>
          <el-form-item :label="$t('column.viewType')">
            <el-select v-model="model.type" style="width: 100%">
              <el-option :label="$t('view.listView')" value="list" />
              <el-option :label="$t('view.formView')" value="form" />
            </el-select>
          </el-form-item>
        </el-form>
      </template>
    </ProTable>
</div>
        `,
        script: `
import { ref, reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { CirclePlus, Delete, EditPen } from '@element-plus/icons-vue';
import request from 'app-request';
import ProTable from '@/components/ProTable/index.vue';

// API
const { t } = useI18n();
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
  { prop: 'name', label: 'column.viewName', search: { el: 'input' } },
  { prop: 'entityId', label: 'column.relatedEntity' },
  { prop: 'type', label: 'column.viewType' }
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
       ElMessage.warning($t('common.nameAndEntityRequired'));
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
      await this.createOrUpdateMenu('/sys/view', 'menu.system.view', 'View', 3, viewSchema._id, parentId, ['admin']);

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
        label: $t('column.schemaName'), 
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
              <el-form-item :label="$t('column.schemaName')">
                <el-input v-model="model.name" :placeholder="$t('common.pleaseInput') + $t('column.schemaName')" />
              </el-form-item>
              <el-row>
                <el-col :span="12">
                  <el-form-item :label="$t('column.relatedEntity')">
                    <el-select v-model="model.entityId" :placeholder="$t('common.pleaseSelect') + $t('column.relatedEntity')" style="width: 100%" @change="handleEntityChange(model)">
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
                  <el-form-item :label="$t('column.relatedView')">
                    <el-select v-model="model.viewId" :placeholder="$t('common.pleaseSelect') + $t('column.relatedView')" style="width: 100%" :disabled="!model.entityId">
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
                  <span style="font-weight: bold;">{{ $t('schema.codeEdit') }}</span>
                  <div style="display: flex; align-items: center;">
                      <span v-if="hasError" style="color: #f56c6c; margin-right: 15px; font-size: 14px;">
                          <el-icon style="vertical-align: middle"><Warning /></el-icon> {{ $t('schema.syntaxError') }}
                      </span>
                      <el-button type="primary" link @click="generateCode(model)" :disabled="!model.viewId">{{ $t('schema.generateCode') }}</el-button>
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
              <el-form-item :label="$t('column.schemaName')">
                <el-input v-model="model.name" readonly />
              </el-form-item>
              <el-row>
                <el-col :span="12">
                   <el-form-item :label="$t('column.relatedEntity')">
                      <el-select v-model="model.entityId" style="width: 100%" disabled>
                        <el-option v-for="item in entityList" :key="item._id" :label="item.name" :value="item._id" />
                      </el-select>
                   </el-form-item>
                </el-col>
                <el-col :span="12">
                   <el-form-item :label="$t('column.relatedView')">
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
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { CirclePlus, Delete, EditPen, Warning } from '@element-plus/icons-vue';
import request from 'app-request';
import ProTable from '@/components/ProTable/index.vue';
import { VueMonacoEditor } from '@guolao/vue-monaco-editor';

// API
const { t } = useI18n();
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
  { prop: 'name', label: 'column.schemaName', width: 200, search: { el: 'input' } },
  { prop: 'entityId', label: 'column.relatedEntity',},
  { prop: 'viewId', label: 'column.relatedView', }
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
        <el-button type="primary" :icon="CirclePlus" @click="handleAdd">{{ $t('common.add') }}</el-button>
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
       ElMessage.warning($t('common.notEmpty', { name: $t('column.schemaName') }));
       done();
       return;
    }
    
    if (hasError.value) {
       ElMessage.error($t('schema.fixSyntaxError'));
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
      await this.createOrUpdateMenu('/sys/schema', 'menu.system.schema', 'Document', 4, schemaSchema._id, parentId, ['admin']);

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
      :formConfig="{ label: $t('column.roleName'), initForm: { name: '', code: '', description: '', status: 1 }, width: '500px' }"
      @submit="submitForm"
      row-key="_id"
    >
      <template #tableHeader>
        <el-button type="primary" :icon="CirclePlus" @click="openAdd">{{ $t('table.add', { name: $t('column.roleName') }) }}</el-button>
      </template>
      
      <template #status="{ row }">
        <el-tag :type="row.status === 1 ? 'success' : 'danger'">{{ row.status === 1 ? $t('status.enabled') : $t('status.disabled') }}</el-tag>
      </template>

      <!-- Editor -->
      <template #edit-form="{ model }">
        <el-form :model="model" label-width="100px">
          <el-form-item :label="$t('column.roleName')">
            <el-input v-model="model.name" :placeholder="$t('common.pleaseInput') + $t('column.roleName')" />
          </el-form-item>
          <el-form-item :label="$t('column.roleCode')">
            <el-input v-model="model.code" :placeholder="$t('common.pleaseInput') + $t('column.roleCode')" />
          </el-form-item>
          <el-form-item :label="$t('column.description')">
            <el-input v-model="model.description" type="textarea" :placeholder="$t('common.pleaseInput') + $t('column.description')" />
          </el-form-item>
          <el-form-item :label="$t('column.status')">
             <el-switch v-model="model.status" :active-value="1" :inactive-value="0" />
          </el-form-item>
        </el-form>
      </template>

      <!-- Viewer -->
      <template #view-form="{ model }">
        <el-form :model="model" label-width="100px" disabled>
          <el-form-item :label="$t('column.roleName')"><el-input v-model="model.name" /></el-form-item>
          <el-form-item :label="$t('column.roleCode')"><el-input v-model="model.code" /></el-form-item>
          <el-form-item :label="$t('column.description')"><el-input v-model="model.description" type="textarea" /></el-form-item>
          <el-form-item :label="$t('column.status')">
             <el-tag :type="model.status === 1 ? 'success' : 'danger'">{{ model.status === 1 ? $t('status.enabled') : $t('status.disabled') }}</el-tag>
          </el-form-item>
        </el-form>
      </template>
    </ProTable>
</div>
        `,
        script: `
import { ref, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { CirclePlus } from '@element-plus/icons-vue';
import request from 'app-request';
import ProTable from '@/components/ProTable/index.vue';

// API
const { t } = useI18n();
const getRoleList = (params) => request.get('/core/sys_role', { params });
const createRole = (data) => request.post('/core/sys_role', data);
const updateRole = (id, data) => request.put('/core/sys_role/' + id, data);
const deleteRole = (id) => request.delete('/core/sys_role/' + id);
const batchDeleteRole = (ids) => request.post('/core/sys_role/batch-delete', { ids });

const proTable = ref();
const initParam = reactive({});

const columns = [
  { type: 'selection', fixed: 'left', width: 55 },
  { prop: 'name', label: 'column.roleName', search: { el: 'input' } },
  { prop: 'code', label: 'column.roleCode', search: { el: 'input' } },
  { prop: 'description', label: 'column.description' },
  { prop: 'status', label: 'column.status' }
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
       ElMessage.warning($t('common.nameAndCodeRequired'));
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
      await this.createOrUpdateMenu('/manage/role', 'menu.system.role', 'Avatar', 5, roleSchema._id, parentIdManage, ['admin']);


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
      :formConfig="{ label: $t('column.username'), initForm: { username: '', password: '', name: '', role: '', status: 1 }, width: '500px' }"
      @submit="submitForm"
      row-key="_id"
    >
      <template #tableHeader>
        <el-button type="primary" :icon="CirclePlus" @click="openAdd">{{ $t('table.add', { name: $t('column.username') }) }}</el-button>
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
          <el-form-item :label="$t('column.username')">
            <el-input v-model="model.username" :placeholder="$t('common.pleaseInput') + $t('column.username')" :disabled="isEdit" />
          </el-form-item>
          <el-form-item :label="$t('column.password')" v-if="!isEdit">
            <el-input v-model="model.password" type="password" show-password :placeholder="$t('common.pleaseInput') + $t('column.password')" />
          </el-form-item>
          <el-form-item :label="$t('column.resetPassword')" v-else>
            <el-input v-model="model.password" type="password" show-password :placeholder="$t('common.passwordPlaceholder')" />
          </el-form-item>
          <el-form-item :label="$t('column.name')">
            <el-input v-model="model.name" :placeholder="$t('common.pleaseInput') + $t('column.name')" />
          </el-form-item>
          <el-form-item :label="$t('column.role')">
             <el-select v-model="model.role" :placeholder="$t('common.pleaseSelect') + $t('column.role')" style="width: 100%" clearable>
                <el-option v-for="item in roleList" :key="item.code" :label="item.name" :value="item.code" />
             </el-select>
          </el-form-item>
          <el-form-item :label="$t('column.status')">
             <el-switch v-model="model.status" :active-value="1" :inactive-value="0" />
          </el-form-item>
        </el-form>
      </template>
      
      <!-- Viewer -->
      <template #view-form="{ model }">
        <el-form :model="model" label-width="100px" disabled>
          <el-form-item :label="$t('column.username')"><el-input v-model="model.username" /></el-form-item>
          <el-form-item :label="$t('column.name')"><el-input v-model="model.name" /></el-form-item>
          <el-form-item :label="$t('column.role')"><el-tag>{{ getRoleName(model.role) }}</el-tag></el-form-item>
          <el-form-item :label="$t('column.status')">
             <el-tag :type="model.status === 1 ? 'success' : 'danger'">{{ model.status === 1 ? $t('status.enabled') : $t('status.disabled') }}</el-tag>
          </el-form-item>
        </el-form>
      </template>
    </ProTable>
</div>
        `,
        script: `
import { ref, reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { CirclePlus } from '@element-plus/icons-vue';
import request from 'app-request';
import ProTable from '@/components/ProTable/index.vue';

// API
const { t } = useI18n();
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
  { prop: 'username', label: 'column.username', search: { el: 'input' } },
  { prop: 'name', label: 'column.name', search: { el: 'input' } },
  { prop: 'role', label: 'column.role' },
  { prop: 'status', label: 'column.status' },
  { prop: 'createdAt', label: 'column.createTime', width: 180 }
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
       ElMessage.success($t('common.statusUpdated'));
    }
  } catch (e) {
    row.status = row.status === 1 ? 0 : 1; // revert
    console.error(e);
  }
};

const submitForm = async (formData, done) => {
  try {
    if (!formData.username) {
       ElMessage.warning($t('common.notEmpty', { name: $t('column.username') }));
       done();
       return;
    }
    if (!formData._id && !formData.password) {
       ElMessage.warning($t('common.notEmpty', { name: $t('column.password') }));
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
      await this.createOrUpdateMenu('/manage/user', 'menu.system.user', 'User', 6, userSchema._id, parentIdManage, ['admin']);

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
