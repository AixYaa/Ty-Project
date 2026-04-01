import { SysService } from '../services/sysService';
import { GeneralService } from '../services/generalService';
import { AuditLogService } from '../services/auditService';
import { SysSchema, SysMenu } from '../types/sys';
import { getDb } from '../db/mongo';

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
      const entitySysMenu = await this.createOrUpdateEntity('sys菜单');
      const entitySysEntity = await this.createOrUpdateEntity('sys实体');
      const entitySysView = await this.createOrUpdateEntity('sys视图');
      const entitySysSchema = await this.createOrUpdateEntity('sys架构');
      const entitySysUser = await this.createOrUpdateEntity('sys用户');
      const entitySysRole = await this.createOrUpdateEntity('sys角色');
      const entitySysI18n = await this.createOrUpdateEntity('sys国际化');
      const entitySysConfig = await this.createOrUpdateEntity('sys系统配置');

      const viewSysMenu = await this.createOrUpdateView('sys菜单列表', entitySysMenu._id.toString());
      const viewSysEntity = await this.createOrUpdateView('sys实体列表', entitySysEntity._id.toString());
      const viewSysView = await this.createOrUpdateView('sys视图列表', entitySysView._id.toString());
      const viewSysSchema = await this.createOrUpdateView('sys架构列表', entitySysSchema._id.toString());
      const viewSysUser = await this.createOrUpdateView('sys用户列表', entitySysUser._id.toString());
      const viewSysRole = await this.createOrUpdateView('sys角色列表', entitySysRole._id.toString());
      const viewSysI18n = await this.createOrUpdateView('sys国际化列表', entitySysI18n._id.toString());
      const viewSysConfig = await this.createOrUpdateView('sys系统配置列表', entitySysConfig._id.toString());

      // Update Entity Names to Chinese (as requested)
      // Note: We keep collection name (first arg) in English for best practice in DB, 
      // but we can update the display name if the second argument of createOrUpdateEntity supports it or via update.
      // Checking createOrUpdateEntity signature... it seems it only takes name.
      // Let's check definition of createOrUpdateEntity in this file.
      // Wait, I can't see the definition in previous read. Let me read the definition first.

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
      :operation="{ permissions: { view: 'menu:view', edit: 'menu:edit', delete: 'menu:edit' }, view: true, edit: true, delete: true, mode: 'hover' }"
      :formConfig="{ label: $t('column.menuName'), initForm: { name: '', path: '', icon: '', sort: 0, parentId: undefined, schemaId: '', roles: [] }, width: '600px' }"
      @submit="submitForm"
      row-key="_id"
    >
      <!-- Table Header Buttons -->
      <template #tableHeader>
        <el-button v-permission="'menu:edit'" type="primary" :icon="CirclePlus" @click="openAdd">{{ $t('table.add', { name: $t('column.menuName') }) }}</el-button>
      </template>

      <!-- Custom Columns -->
      <template #name="{ row }">
        {{ $t(row.name) }}
      </template>
      <template #icon="{ row }">
        <el-icon v-if="row.icon">
          <component :is="row.icon" />
        </el-icon>
      </template>

      <template #schemaId="{ row }">
        <el-tag type="success">{{ getSchemaName(row.schemaId) }}</el-tag>
      </template>

      <template #operation="{ row }">
        <el-button v-permission="'menu:edit'" link type="primary" :icon="CirclePlus" @click="handleAdd(row)">{{ $t('table.addSubMenu') }}</el-button>
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
                  :props="{ label: (data) => $t(data.name), value: '_id', children: 'children' }"
                  check-strictly
                  :placeholder="$t('common.pleaseSelect') + $t('menu.parentMenu')"
                  clearable
                  style="width: 100%"
                />
              </el-form-item>
              <el-form-item :label="$t('column.menuName')">
                <el-input v-model="model.name" :placeholder="$t('common.pleaseInput') + $t('column.menuName')">
                   <template #append v-if="model.name && model.name.includes('.')">
                      {{ $t(model.name) }}
                   </template>
                </el-input>
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
             <el-tree-select v-model="model.parentId" :data="menuTreeData" :props="{ label: (data) => $t(data.name), value: '_id', children: 'children' }" style="width: 100%" />
          </el-form-item>
          <el-form-item :label="$t('column.menuName')">
             <span v-if="model.name && model.name.includes('.')">{{ $t(model.name) }} ({{ model.name }})</span>
             <span v-else>{{ model.name }}</span>
          </el-form-item>
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
const createMenu = (data) => request.post('/core/sys菜单', data);
const updateMenu = (id, data) => request.put('/core/sys菜单/' + id, data);
const deleteMenu = (id) => request.delete('/core/sys菜单/' + id);
const batchDeleteMenu = (ids) => request.post('/core/sys菜单/batch-delete', { ids });
const getSchemaListAll = () => request.get('/core/sys架构', { params: { pageSize: 1000 } });
const getRoleListAll = () => request.get('/core/sys角色', { params: { pageSize: 1000 } });

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

      const menuSchema = await this.createOrUpdateSchema('sys菜单管理', '菜单管理', menuSchemaCode, entitySysMenu._id.toString(), viewSysMenu._id.toString());
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
      :operation="{ permissions: { view: 'entity:view', edit: 'entity:edit', delete: 'entity:edit' }, view: true, edit: true, delete: true, mode: 'hover' }"
      :formConfig="{ label: $t('column.entityName'), initForm: { name: '' }, width: '500px' }"
      @submit="submitForm"
      row-key="_id"
    >
      <template #tableHeader>
        <el-button v-permission="'entity:edit'" type="primary" :icon="CirclePlus" @click="openAdd">{{ $t('table.add', { name: $t('column.entityName') }) }}</el-button>
      </template>

      <template #name="{ row }">
        {{ $t(row.name) }}
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
import { ref, reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { CirclePlus, Delete, EditPen, Warning } from '@element-plus/icons-vue';
import request from 'app-request';
import ProTable from '@/components/ProTable/index.vue';

// API
const { t } = useI18n();
const getEntityList = (params) => request.get('/core/sys实体', { params });
const createEntity = (data) => request.post('/core/sys实体', data);
const updateEntity = (id, data) => request.put('/core/sys实体/' + id, data);
const deleteEntity = (id) => request.delete('/core/sys实体/' + id);
const batchDeleteEntity = (ids) => request.post('/core/sys实体/batch-delete', { ids });

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
      const entitySchema = await this.createOrUpdateSchema('sys实体管理', '实体管理', entitySchemaCode, entitySysEntity._id.toString(), viewSysEntity._id.toString());
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
      :operation="{ permissions: { view: 'entity:view', edit: 'entity:edit', delete: 'entity:edit' }, view: true, edit: true, delete: true, mode: 'hover' }"
      :formConfig="{ label: $t('column.viewName'), initForm: { name: '', entityId: '', type: 'list', config: {} } }"
      @submit="submitForm"
      row-key="_id"
    >
      <template #tableHeader>
        <el-button v-permission="'entity:edit'" type="primary" :icon="CirclePlus" @click="openAdd">{{ $t('table.add', { name: $t('column.viewName') }) }}</el-button>
      </template>

      <template #name="{ row }">
        {{ $t(row.name) }}
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
              <el-select 
                v-model="model.entityId" 
                filterable 
                :placeholder="$t('common.pleaseSelect') + $t('column.relatedEntity')" 
                style="width: 100%" 
                @visible-change="handleEntitySelectVisible"
              >
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
const getViewList = (params) => request.get('/core/sys视图', { params });
const createView = (data) => request.post('/core/sys视图', data);
const updateView = (id, data) => request.put('/core/sys视图/' + id, data);
const deleteView = (id) => request.delete('/core/sys视图/' + id);
const batchDeleteView = (ids) => request.post('/core/sys视图/batch-delete', { ids });
const getEntityListAll = () => request.get('/core/sys实体', { params: { pageSize: 1000 } });

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

const handleEntitySelectVisible = (visible) => {
  if (visible) {
    getEntityListAll().then(res => {
      entityList.value = Array.isArray(res) ? res : res.list || [];
    });
  }
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
      const viewSchema = await this.createOrUpdateSchema('sys视图管理', '视图管理', viewSchemaCode, entitySysView._id.toString(), viewSysView._id.toString());
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
      :operation="{ permissions: { view: 'schema:view', edit: 'schema:edit', delete: 'schema:edit' }, view: true, edit: true, delete: true, mode: 'hover' }"
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
        <el-button v-permission="'schema:edit'" type="primary" :icon="CirclePlus" @click="openAdd">新增架构</el-button>
      </template>

      <template #name="{ row }">
        {{ $t(row.name) }}
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
                    <el-select 
                      v-model="model.entityId" 
                      filterable 
                      :placeholder="$t('common.pleaseSelect') + $t('column.relatedEntity')" 
                      style="width: 100%" 
                      @change="handleEntityChange(model)"
                      @visible-change="handleEntitySelectVisible"
                    >
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

    <!-- 查看日志弹窗 -->
    <el-dialog v-model="logsVisible" title="运行日志" width="800px">
      <el-table :data="logsList" v-loading="logsLoading" stripe>
        <el-table-column prop="startTime" label="开始时间" width="180">
          <template #default="{ row }">{{ formatTime(row.startTime) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'success' ? 'success' : row.status === 'failed' ? 'danger' : 'info'" size="small">
              {{ row.status === 'success' ? '成功' : row.status === 'failed' ? '失败' : row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="duration" label="耗时(ms)" width="100" />
        <el-table-column prop="result" label="结果">
          <template #default="{ row }">
            <span v-if="row.result" class="log-result">{{ row.result }}</span>
            <span v-else-if="row.error" class="log-error">{{ row.error }}</span>
            <span v-else class="text-gray-400">-</span>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
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
const getSchemaList = (params) => request.get('/core/sys架构', { params });
const createSchema = (data) => request.post('/core/sys架构', data);
const updateSchema = (id, data) => request.put('/core/sys架构/' + id, data);
const deleteSchema = (id) => request.delete('/core/sys架构/' + id);
const batchDeleteSchema = (ids) => request.post('/core/sys架构/batch-delete', { ids });
const getEntityListAll = () => request.get('/core/sys实体', { params: { pageSize: 1000 } });
const getViewListAll = () => request.get('/core/sys视图', { params: { pageSize: 1000 } });

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

const handleEntitySelectVisible = (visible) => {
  if (visible) {
    getEntityListAll().then(res => {
      entityList.value = Array.isArray(res) ? res : res.list || [];
    });
  }
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
      :operation="{ permissions: { edit: 'i18n:edit' }, edit: true, delete: false, mode: 'hover' }"
      @edit="handleEdit"
      @delete="handleDelete"
      row-key="_id"
    >
      <template #tableHeader>
        <el-button v-permission="'i18n:edit'" type="primary" :icon="CirclePlus" @click="handleAdd">{{ $t('common.add') }}</el-button>
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

      const schemaSchema = await this.createOrUpdateSchema('sys架构管理', '架构管理', schemaSchemaCode, entitySysSchema._id.toString(), viewSysSchema._id.toString());
      await this.createOrUpdateMenu('/sys/schema', 'menu.system.schema', 'Document', 4, schemaSchema._id, parentId, ['admin']);

      // --- 5. 角色管理 (Role Management) ---
      // const entitySysRole = await this.createOrUpdateEntity('sys_role');
      // const viewSysRole = await this.createOrUpdateView('SysRoleList', entitySysRole._id.toString());
      
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
      :operation="{ permissions: { view: 'role:view', edit: 'role:edit', delete: 'role:edit' }, view: true, edit: true, delete: true, mode: 'hover' }"
      :formConfig="{ label: $t('column.roleName'), initForm: { name: '', code: '', description: '', permissions: [], status: 1 }, width: '600px' }"
      @submit="submitForm"
      row-key="_id"
    >
      <template #tableHeader>
        <el-button v-permission="'role:edit'" type="primary" :icon="CirclePlus" @click="openAdd">{{ $t('table.add', { name: $t('column.roleName') }) }}</el-button>
      </template>
      
      <template #permissions="{ row }">
        <el-tag v-for="p in row.permissions" :key="p" type="info" class="mr-2" size="small">{{ getPermissionName(p) }}</el-tag>
        <span v-if="!row.permissions || row.permissions.length === 0" class="text-gray-400">-</span>
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
          <el-form-item :label="$t('column.permissions')">
            <el-select v-model="model.permissions" multiple collapse-tags collapse-tags-max-length="3" :placeholder="$t('common.pleaseSelect') + $t('column.permissions')" style="width: 100%">
              <el-option v-for="item in allPermissions" :key="item.code" :label="item.name + ' (' + item.code + ')'" :value="item.code" />
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
          <el-form-item :label="$t('column.roleName')"><el-input v-model="model.name" /></el-form-item>
          <el-form-item :label="$t('column.roleCode')"><el-input v-model="model.code" /></el-form-item>
          <el-form-item :label="$t('column.description')"><el-input v-model="model.description" type="textarea" /></el-form-item>
          <el-form-item :label="$t('column.permissions')">
            <el-tag v-for="p in model.permissions" :key="p" type="info" class="mr-2">{{ getPermissionName(p) }}</el-tag>
            <span v-if="!model.permissions || model.permissions.length === 0">-</span>
          </el-form-item>
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
import { CirclePlus, Tickets } from '@element-plus/icons-vue';
import request from 'app-request';
import ProTable from '@/components/ProTable/index.vue';

const { t } = useI18n();
const getRoleList = (params) => request.get('/core/sys角色', { params });
const createRole = (data) => request.post('/core/sys角色', data);
const updateRole = (id, data) => request.put('/core/sys角色/' + id, data);
const deleteRole = (id) => request.delete('/core/sys角色/' + id);
const batchDeleteRole = (ids) => request.post('/core/sys角色/batch-delete', { ids });
const getPermissionList = (params) => request.get('/core/sys权限', { params });

const proTable = ref();
const initParam = reactive({});
const allPermissions = ref([]);

const columns = [
  { type: 'selection', fixed: 'left', width: 55 },
  { prop: 'name', label: 'column.roleName', search: { el: 'input' } },
  { prop: 'code', label: 'column.roleCode', search: { el: 'input' } },
  { prop: 'permissions', label: 'column.permissions', width: 300 },
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

onMounted(async () => {
  const permRes = await getPermissionList({ pageSize: 100 });
  allPermissions.value = Array.isArray(permRes) ? permRes : permRes.list || [];
});

const openAdd = () => proTable.value?.openAdd();

const getPermissionName = (code) => {
  if (code === '*') return t('common.allPermissions');
  const perm = allPermissions.value.find(p => p.code === code);
  return perm ? perm.name + ' (' + perm.code + ')' : code;
};

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
        style: `.page-container { padding: 20px; } .mr-2 { margin-right: 8px; }`
      };
      
      const roleSchema = await this.createOrUpdateSchema('sys角色管理', '角色管理', roleSchemaCode, entitySysRole._id.toString(), viewSysRole._id.toString());
      await this.createOrUpdateMenu('/manage/role', 'menu.system.role', 'Avatar', 5, roleSchema._id, parentIdManage, ['admin']);


      // --- 5.1 权限管理 (Permission Management) ---
      const entitySysPermission = await this.createOrUpdateEntity('sys权限');
      const viewSysPermission = await this.createOrUpdateView('sys权限列表', entitySysPermission._id.toString());

      const permissionSchemaCode = {
        template: `
<div class="page-container">
    <ProTable
      ref="proTable"
      :columns="columns"
      :requestApi="getTableList"
      :initParam="initParam"
      :batchDeleteApi="batchDeletePermission"
      :deleteApi="deletePermission"
      :operation="{ permissions: { view: 'permission:view', edit: 'permission:edit', delete: 'permission:edit' }, view: true, edit: true, delete: true, mode: 'hover' }"
      :formConfig="{ label: $t('column.permissionCode'), initForm: { code: '', name: '', type: 'menu', description: '' }, width: '500px' }"
      @submit="submitForm"
      row-key="_id"
    >
      <template #tableHeader>
        <el-button v-permission="'permission:edit'" type="primary" :icon="CirclePlus" @click="openAdd">{{ $t('table.add', { name: $t('column.permissionName') }) }}</el-button>
      </template>
      
      <template #type="{ row }">
        <el-tag :type="typeTagMap[row.type] || 'info'">{{ row.type }}</el-tag>
      </template>

      <!-- Editor -->
      <template #edit-form="{ model, isEdit }">
        <el-form :model="model" label-width="100px">
          <el-form-item :label="$t('column.permissionCode')">
            <el-input v-model="model.code" :placeholder="$t('common.pleaseInput') + $t('column.permissionCode')" :disabled="isEdit" />
          </el-form-item>
          <el-form-item :label="$t('column.permissionName')">
            <el-input v-model="model.name" :placeholder="$t('common.pleaseInput') + $t('column.permissionName')" />
          </el-form-item>
          <el-form-item :label="$t('column.permissionType')">
            <el-select v-model="model.type" style="width: 100%">
              <el-option label="菜单权限" value="menu" />
              <el-option label="按钮权限" value="button" />
              <el-option label="字段权限" value="field" />
              <el-option label="API权限" value="api" />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('column.description')">
            <el-input v-model="model.description" type="textarea" :placeholder="$t('common.pleaseInput') + $t('column.description')" />
          </el-form-item>
        </el-form>
      </template>

      <!-- Viewer -->
      <template #view-form="{ model }">
        <el-form :model="model" label-width="100px" disabled>
          <el-form-item :label="$t('column.permissionCode')"><el-input v-model="model.code" /></el-form-item>
          <el-form-item :label="$t('column.permissionName')"><el-input v-model="model.name" /></el-form-item>
          <el-form-item :label="$t('column.permissionType')"><el-tag>{{ model.type }}</el-tag></el-form-item>
          <el-form-item :label="$t('column.description')"><el-input v-model="model.description" type="textarea" /></el-form-item>
        </el-form>
      </template>
    </ProTable>
</div>
        `,
        script: `
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import { CirclePlus, Tickets } from '@element-plus/icons-vue';
import request from 'app-request';
import ProTable from '@/components/ProTable/index.vue';

const getPermissionList = (params) => request.get('/core/sys权限', { params });
const createPermission = (data) => request.post('/core/sys权限', data);
const updatePermission = (id, data) => request.put('/core/sys权限/' + id, data);
const deletePermission = (id) => request.delete('/core/sys权限/' + id);
const batchDeletePermission = (ids) => request.post('/core/sys权限/batch-delete', { ids });

const proTable = ref();
const initParam = reactive({});

const typeTagMap = { menu: 'primary', button: 'success', field: 'warning', api: 'danger' };

const columns = [
  { type: 'selection', fixed: 'left', width: 55 },
  { prop: 'code', label: 'column.permissionCode', search: { el: 'input' } },
  { prop: 'name', label: 'column.permissionName', search: { el: 'input' } },
  { prop: 'type', label: 'column.permissionType' },
  { prop: 'description', label: 'column.description' }
];

const getTableList = async (params) => {
  const res = await getPermissionList(params);
  return {
    data: Array.isArray(res) ? res : res.list || [],
    total: Array.isArray(res) ? res.length : res.total || 0
  };
};

const openAdd = () => proTable.value?.openAdd();

const submitForm = async (formData, done) => {
  try {
    if (!formData.code || !formData.name) {
       ElMessage.warning('请输入权限代码和名称');
       done();
       return;
    }
    if (formData._id) {
      await updatePermission(formData._id, formData);
      ElMessage.success('更新成功');
    } else {
      await createPermission(formData);
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
      
      const permissionSchema = await this.createOrUpdateSchema('sys权限管理', '权限管理', permissionSchemaCode, entitySysPermission._id.toString(), viewSysPermission._id.toString());
      await this.createOrUpdateMenu('/manage/permission', 'menu.system.permission', 'Key', 4, permissionSchema._id, parentIdManage, ['admin']);


      // --- 6. 用户管理 (User Management) ---
      // Note: User entity is 'sys用户' (already used by AuthService)
      // We ensure the metadata entity exists
      // const entitySysUser = await this.createOrUpdateEntity('sys用户');
      // const viewSysUser = await this.createOrUpdateView('SysUserList', entitySysUser._id.toString());

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
      :operation="{ permissions: { view: 'user:view', edit: 'user:edit', delete: 'user:edit' }, view: true, edit: true, delete: true, mode: 'hover' }"
      :formConfig="{ label: $t('column.username'), initForm: { username: '', password: '', name: '', role: '', status: 1, avatar: null }, width: '500px' }"
      @submit="submitForm"
      row-key="_id"
    >
      <template #tableHeader>
        <el-button v-permission="'user:edit'" type="primary" :icon="CirclePlus" @click="openAdd">{{ $t('table.add', { name: $t('column.username') }) }}</el-button>
      </template>

      <template #avatar="{ row }">
        <el-image 
          v-if="row.avatar" 
          style="width: 40px; height: 40px; border-radius: 50%" 
          :src="getAvatarUrl(row.avatar, 'compressed')" 
          :preview-src-list="[getAvatarUrl(row.avatar, 'original')]" 
          fit="cover" 
          preview-teleported
        />
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
          <el-form-item label="Avatar">
            <el-upload
              class="avatar-uploader"
              action="/api/common/upload"
              :show-file-list="false"
              :http-request="(options) => handleAvatarRequest(options, model)"
              :before-upload="beforeAvatarUpload"
            >
              <img v-if="model.avatar" :src="getAvatarUrl(model.avatar, 'compressed')" class="avatar" />
              <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
            </el-upload>
          </el-form-item>
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
          <el-form-item :label="$t('column.avatar')">
             <el-image 
              v-if="model.avatar" 
              style="width: 60px; height: 60px; border-radius: 50%" 
              :src="getAvatarUrl(model.avatar, 'compressed')" 
              fit="cover" 
            />
          </el-form-item>
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
import { CirclePlus, Plus } from '@element-plus/icons-vue';
import request from 'app-request';
import ProTable from '@/components/ProTable/index.vue';

// API
const { t } = useI18n();
const getUserList = (params) => request.get('/core/sys用户', { params });
const createUser = (data) => request.post('/core/sys用户', data);
const updateUser = (id, data) => request.put('/core/sys用户/' + id, data);
const deleteUser = (id) => request.delete('/core/sys用户/' + id);
const batchDeleteUser = (ids) => request.post('/core/sys用户/batch-delete', { ids });
const getRoleListApi = () => request.get('/core/sys角色', { params: { pageSize: 100 } });

const proTable = ref();
const initParam = reactive({});
const roleList = ref([]);
const uploadHeaders = reactive({
  Authorization: 'Bearer ' + localStorage.getItem('accessToken')
});

const columns = [
  { type: 'selection', fixed: 'left', width: 55 },
  { prop: 'avatar', label: 'column.avatar', width: 80,isImage: true },
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

// Avatar Helper
const getAvatarUrl = (avatar, type) => {
  if (!avatar) return '';
  // If it's a string, try to parse or return as is (assuming it might be just one url if legacy)
  // But our new upload returns object.
  // If backend stored it as object (MongoDB allows), then we can access props.
  if (typeof avatar === 'string') {
     try {
         const obj = JSON.parse(avatar);
         return obj[type] || obj.compressed || obj.original || '';
     } catch (e) {
         // Maybe it's a direct URL?
         return avatar;
     }
  }
  return avatar[type] || avatar.compressed || avatar.original || '';
};

const handleAvatarSuccess = (response, model) => {
  if (response.status === 200) {
    model.avatar = response.data;
    ElMessage.success('Avatar uploaded!');
  } else {
    ElMessage.error('Upload failed');
  }
};

const handleAvatarRequest = async (options, model) => {
  const { file, onSuccess, onError } = options;
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/common/upload', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('accessToken')
      },
      body: formData
    });

    const result = await response.json();
    if (result.status === 200) {
      model.avatar = result.data;
      ElMessage.success('Avatar uploaded!');
      onSuccess(result);
    } else {
      ElMessage.error(result.msg || 'Upload failed');
      onError(new Error(result.msg || 'Upload failed'));
    }
  } catch (error) {
    console.error('Upload error:', error);
    ElMessage.error('Upload failed');
    onError(error);
  }
};

const beforeAvatarUpload = (rawFile) => {
  if (rawFile.type !== 'image/jpeg' && rawFile.type !== 'image/png') {
    ElMessage.error('Avatar must be JPG format!');
    return false;
  } else if (rawFile.size / 1024 / 1024 > 2) {
    ElMessage.error('Avatar picture size can not exceed 2MB!');
    return false;
  }
  return true;
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
        style: `
.page-container { padding: 20px; }
.avatar-uploader .avatar {
  width: 178px;
  height: 178px;
  display: block;
}
.avatar-uploader .el-upload,
.avatar-uploader.el-upload {
  border: 1px dashed var(--el-border-color, #d9d9d9);
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: var(--el-transition-duration-fast);
}
.avatar-uploader .el-upload:hover,
.avatar-uploader.el-upload:hover {
  border-color: var(--el-color-primary, #409eff);
}
.el-icon.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 178px;
  height: 178px;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
}
        `
      };
      
      const userSchema = await this.createOrUpdateSchema('sys用户管理', '用户管理', userSchemaCode, entitySysUser._id.toString(), viewSysUser._id.toString());
      await this.createOrUpdateMenu('/manage/user', 'menu.system.user', 'User', 6, userSchema._id, parentIdManage, ['admin']);

      // --- 7. 定时任务管理 (Scheduler Management) ---
      const entitySysScheduler = await this.createOrUpdateEntity('sys定时任务');
      const viewSysScheduler = await this.createOrUpdateView('SysSchedulerList', entitySysScheduler._id.toString());

      const schedulerSchemaCode = {
        template: `
<div class="page-container">
    <ProTable
      ref="proTable"
      :columns="columns"
      :requestApi="getTableList"
      :initParam="initParam"
      :batchDeleteApi="batchDeleteTask"
      :deleteApi="deleteTask"
      :operation="{ permissions: { view: 'scheduler:view', edit: 'scheduler:edit', delete: 'scheduler:delete' }, view: true, edit: true, delete: true, mode: 'hover' }"
      :formConfig="{ label: $t('column.taskName'), initForm: { name: '', code: '', interval: '5min', apiPath: '', apiMethod: 'GET', apiParams: '', description: '', status: 1 }, width: '600px' }"
      @submit="submitForm"
      row-key="_id"
    >
      <template #tableHeader>
        <el-button v-permission="'scheduler:edit'" type="primary" :icon="CirclePlus" @click="openAdd">{{ $t('table.add', { name: $t('column.taskName') }) }}</el-button>
      </template>

      <template #status="{ row }">
        <el-tag :type="row.status === 1 ? 'success' : 'danger'">{{ row.status === 1 ? $t('status.enabled') : $t('status.disabled') }}</el-tag>
      </template>

      <template #interval="{ row }">
        <el-tag type="warning">{{ getIntervalLabel(row.interval || row.cronExpression) }}</el-tag>
      </template>

      <template #lastRunResult="{ row }">
        <el-tag v-if="row.lastRunResult === 'success'" type="success" size="small">成功</el-tag>
        <el-tooltip v-else-if="row.lastRunResult" :content="row.lastRunResult" placement="top">
          <el-tag type="danger" size="small">失败</el-tag>
        </el-tooltip>
        <span v-else class="text-gray-400">-</span>
      </template>

      <template #nextRunTime="{ row }">
        <span v-if="row.nextRunTime">{{ formatTime(row.nextRunTime) }}</span>
        <span v-else class="text-gray-400">-</span>
      </template>

      <template #operation="{ row }">
        <el-button link type="primary" :icon="Tickets" @click="viewLogs(row)">日志</el-button>
      </template>

      <!-- Editor -->
      <template #edit-form="{ model, isEdit }">
        <el-form :model="model" label-width="110px">
          <el-form-item :label="$t('column.taskName')">
            <el-input v-model="model.name" :placeholder="$t('common.pleaseInput') + $t('column.taskName')" />
          </el-form-item>
          <el-form-item :label="$t('column.taskCode')">
            <el-input v-model="model.code" :placeholder="$t('common.pleaseInput') + $t('column.taskCode')" :disabled="isEdit" />
          </el-form-item>
          <el-form-item :label="$t('column.taskInterval')">
            <el-select v-model="model.interval" style="width: 100%">
              <el-option label="每 5 分钟" value="5min" />
              <el-option label="每 10 分钟" value="10min" />
              <el-option label="每 15 分钟" value="15min" />
              <el-option label="每 30 分钟" value="30min" />
              <el-option label="每小时" value="1hour" />
              <el-option label="每 6 小时" value="6hour" />
              <el-option label="每 12 小时" value="12hour" />
              <el-option label="每天凌晨" value="1day" />
              <el-option label="每周一凌晨" value="1week" />
              <el-option label="每月 1 号" value="1month" />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('column.apiPath')">
            <el-input v-model="model.apiPath" placeholder="/api/core/your-entity" />
          </el-form-item>
          <el-form-item :label="$t('column.apiMethod')">
            <el-select v-model="model.apiMethod" style="width: 100%">
              <el-option label="GET" value="GET" />
              <el-option label="POST" value="POST" />
              <el-option label="PUT" value="PUT" />
              <el-option label="DELETE" value="DELETE" />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('column.apiParams')">
            <el-input v-model="model.apiParams" type="textarea" :rows="3" placeholder='{"key": "value"} 或 ?key=value' />
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
        <el-form :model="model" label-width="110px" disabled>
          <el-form-item :label="$t('column.taskName')"><el-input v-model="model.name" /></el-form-item>
          <el-form-item :label="$t('column.taskCode')"><el-input v-model="model.code" /></el-form-item>
          <el-form-item :label="$t('column.taskInterval')"><el-input :value="getIntervalLabel(model.interval || model.cronExpression)" /></el-form-item>
          <el-form-item :label="$t('column.apiPath')"><el-input v-model="model.apiPath" /></el-form-item>
          <el-form-item :label="$t('column.apiMethod')"><el-input v-model="model.apiMethod" /></el-form-item>
          <el-form-item :label="$t('column.apiParams')"><el-input v-model="model.apiParams" type="textarea" /></el-form-item>
          <el-form-item :label="$t('column.description')"><el-input v-model="model.description" type="textarea" /></el-form-item>
          <el-form-item :label="$t('column.status')">
            <el-tag :type="model.status === 1 ? 'success' : 'danger'">{{ model.status === 1 ? $t('status.enabled') : $t('status.disabled') }}</el-tag>
          </el-form-item>
          <el-form-item :label="上次运行"><span>{{ model.lastRunTime ? formatTime(model.lastRunTime) : '-' }}</span></el-form-item>
          <el-form-item :label="下次运行"><span>{{ model.nextRunTime ? formatTime(model.nextRunTime) : '-' }}</span></el-form-item>
        </el-form>
      </template>
    </ProTable>

    <!-- 查看日志抽屉 -->
    <el-drawer v-model="logsVisible" title="运行日志" :size="logsDrawerWidth + 'px'" direction="rtl" class="scheduler-logs-drawer">
      <div class="logs-drawer-content">
        <!-- 筛选栏 -->
        <div class="logs-toolbar">
          <el-select v-model="logsFilterStatus" placeholder="状态筛选" clearable style="width: 120px" @change="handleLogsFilter">
            <el-option label="全部" value="" />
            <el-option label="成功" value="success" />
            <el-option label="失败" value="failed" />
          </el-select>
        </div>
        <!-- 日志表格 -->
        <el-table :data="logsPagedList" v-loading="logsLoading" stripe style="flex: 1">
          <el-table-column prop="startTime" label="开始时间" width="170">
            <template #default="{ row }">{{ formatTime(row.startTime) }}</template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.status === 'success' ? 'success' : row.status === 'failed' ? 'danger' : 'info'" size="small">
                {{ row.status === 'success' ? '成功' : row.status === 'failed' ? '失败' : row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="duration" label="耗时" width="80">
            <template #default="{ row }">{{ row.duration }}ms</template>
          </el-table-column>
          <el-table-column prop="result" label="结果">
            <template #default="{ row }">
              <pre v-if="row._displayResult" class="log-result">{{ row._displayResult }}</pre>
              <span v-else-if="row.error" class="log-error">{{ row.error }}</span>
              <span v-else class="text-gray-400">-</span>
            </template>
          </el-table-column>
        </el-table>
        <!-- 分页 -->
        <div class="logs-pagination">
          <el-pagination
            v-model:current-page="logsPage"
            v-model:page-size="logsPageSize"
            :total="logsFilteredList.length"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next"
            background
          />
        </div>
      </div>
    </el-drawer>

    <!-- 日志抽屉拖拽手柄 -->
    <div v-if="logsVisible" class="logs-resize-handle" :style="{ right: logsDrawerWidth + 'px' }" title="拖动调整宽度" @mousedown.prevent="startLogsResize">
      <div class="resize-dots"><span></span><span></span><span></span></div>
    </div>
    </div>
        `,
        script: `
import { ref, reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { CirclePlus, Tickets } from '@element-plus/icons-vue';
import request from 'app-request';
import ProTable from '@/components/ProTable/index.vue';

const { t } = useI18n();
const getTaskList = (params) => request.get('/core/sys定时任务', { params });
const createTask = (data) => request.post('/core/sys定时任务', data);
const updateTask = (id, data) => request.put('/core/sys定时任务/' + id, data);
const deleteTask = (id) => request.delete('/core/sys定时任务/' + id);
const batchDeleteTask = (ids) => request.post('/core/sys定时任务/batch-delete', { ids });

const proTable = ref();
const initParam = reactive({});

const INTERVAL_MAP = {
   '5min': '*/5 * * * *',
   '10min': '*/10 * * * *',
   '15min': '*/15 * * * *',
   '30min': '*/30 * * * *',
   '1hour': '0 * * * *',
   '6hour': '0 */6 * * *',
   '12hour': '0 */12 * * *',
   '1day': '0 0 * * *',
   '1week': '0 0 * * 1',
   '1month': '0 0 1 * *'
 };

 const INTERVAL_LABELS = {
   '5min': '每 5 分钟',
   '10min': '每 10 分钟',
   '15min': '每 15 分钟',
   '30min': '每 30 分钟',
   '1hour': '每小时',
   '6hour': '每 6 小时',
   '12hour': '每 12 小时',
   '1day': '每天凌晨',
   '1week': '每周一凌晨',
   '1month': '每月 1 号'
 };

const columns = [
  { type: 'selection', fixed: 'left', width: 55 },
  { prop: 'name', label: 'column.taskName', search: { el: 'input' } },
  { prop: 'code', label: 'column.taskCode', search: { el: 'input' } },
  { prop: 'interval', label: 'column.taskInterval', width: 150 },
  { prop: 'apiPath', label: 'column.apiPath', search: { el: 'input' } },
  { prop: 'apiMethod', label: 'column.apiMethod', width: 100 },
  { prop: 'status', label: 'column.status', width: 100 },
  { prop: 'lastRunResult', label: 'column.lastRunResult', width: 100 },
  { prop: 'nextRunTime', label: 'column.nextRunTime', width: 180 },
  { prop: 'description', label: 'column.description' }
];

const getTableList = async (params) => {
  const res = await getTaskList(params);
  return {
    data: Array.isArray(res) ? res : res.list || [],
    total: Array.isArray(res) ? res.length : res.total || 0
  };
};

const getIntervalLabel = (val) => {
  return INTERVAL_LABELS[val] || val || '-';
};

const formatTime = (time) => {
  if (!time) return '-';
  const d = new Date(time);
  return d.toLocaleString('zh-CN', { hour12: false });
};

const logsVisible = ref(false);
const logsList = ref([]);
const logsLoading = ref(false);
const currentTaskId = ref('');
const logsDrawerWidth = ref(600);

let logsResizeStartX = 0;
let logsResizeStartWidth = 0;

const startLogsResize = (e) => {
  logsResizeStartX = e.clientX;
  logsResizeStartWidth = logsDrawerWidth.value;
  document.addEventListener('mousemove', onLogsResize);
  document.addEventListener('mouseup', stopLogsResize);
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
};

const onLogsResize = (e) => {
  const delta = logsResizeStartX - e.clientX;
  const newWidth = Math.min(Math.max(logsResizeStartWidth + delta, 300), window.innerWidth * 0.8);
  logsDrawerWidth.value = Math.round(newWidth);
};

const stopLogsResize = () => {
  document.removeEventListener('mousemove', onLogsResize);
  document.removeEventListener('mouseup', stopLogsResize);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
};

const logsFilterStatus = ref('');
const logsPage = ref(1);
const logsPageSize = ref(20);

const logsFilteredList = computed(() => {
  if (!logsFilterStatus.value) return logsList.value;
  return logsList.value.filter((item) => item.status === logsFilterStatus.value);
});

const logsPagedList = computed(() => {
  const start = (logsPage.value - 1) * logsPageSize.value;
  return logsFilteredList.value.slice(start, start + logsPageSize.value);
});

const handleLogsFilter = () => {
  logsPage.value = 1;
};

const viewLogs = async (row) => {
  currentTaskId.value = row._id;
  logsVisible.value = true;
  logsPage.value = 1;
  logsFilterStatus.value = '';
  logsLoading.value = true;
  try {
    const res = await request.get('/scheduler/task/runs/' + row._id);
    const list = Array.isArray(res) ? res : res?.list || [];
    logsList.value = list.map((item) => {
      if (item.result && typeof item.result === 'string') {
        try {
          const parsed = JSON.parse(item.result);
          item._displayResult = typeof parsed === 'object'
            ? JSON.stringify(parsed.data || parsed, null, 2)
            : item.result;
        } catch {
          item._displayResult = item.result;
        }
      }
      return item;
    });
    logsFilteredList.value = logsList.value;
  } catch (e) {
    console.error(e);
    logsList.value = [];
    logsFilteredList.value = [];
  } finally {
    logsLoading.value = false;
  }
};

const openAdd = () => proTable.value?.openAdd();

const submitForm = async (formData, done) => {
  try {
    if (!formData.name || !formData.code || !formData.apiPath) {
      ElMessage.warning('请填写名称、标识和API路径');
      done();
      return;
    }
    const payload = { ...formData, cronExpression: INTERVAL_MAP[formData.interval] || formData.interval };
    if (payload._id) {
      await updateTask(payload._id, payload);
      ElMessage.success('更新成功');
    } else {
      await createTask(payload);
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
.text-gray-400 { color: #999; font-size: 13px; }
.logs-drawer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.logs-toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}
.logs-pagination {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
.logs-resize-handle {
  position: fixed;
  top: 0;
  bottom: 0;
  width: 10px;
  cursor: col-resize;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  transition: background-color 0.2s;
}
.logs-resize-handle:hover { background-color: rgba(64, 158, 255, 0.1); }
.resize-dots {
  display: flex;
  flex-direction: column;
  gap: 3px;
  pointer-events: none;
}
.resize-dots span {
  display: block;
  width: 2px;
  height: 2px;
  background-color: #909399;
  border-radius: 50%;
}
.log-result {
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
  color: #67c23a;
}
.log-error {
  font-size: 12px;
  color: #f56c6c;
}
        `
      };

      const schedulerSchema = await this.createOrUpdateSchema('sys定时任务管理', '定时任务管理', schedulerSchemaCode, entitySysScheduler._id.toString(), viewSysScheduler._id.toString());
      await this.createOrUpdateMenu('/manage/scheduler', 'menu.system.scheduler', 'Timer', 7, schedulerSchema._id, parentIdManage, ['admin']);

      // const entitySysI18n = await this.createOrUpdateEntity('sys_i18n');
      // const viewSysI18n = await this.createOrUpdateView('SysI18nList', entitySysI18n._id.toString());
      
      const i18nSchemaCode = {
        template: `
<div class="table-box">
    <ProTable
      ref="proTable"
      :columns="columns"
      :requestApi="getTableList"
      :pagination="true"
      :toolButton="false"
    >
      <!-- Table Header Buttons -->
      <template #tableHeader>
        <el-button v-permission="'i18n:edit'" type="primary" :icon="CirclePlus" @click="handleAdd">{{ $t('common.add') }}</el-button>
        <el-button v-permission="'i18n:edit'" type="success" :icon="Check" @click="handleSave" :loading="saving">{{ $t('common.submit') }}</el-button>
      </template>

      <!-- Inline Edit Columns -->
      <template #key="{ row }">
        <el-input v-model="row.key" placeholder="e.g. menu.system" />
      </template>
      <template #zh-CN="{ row }">
        <el-input v-model="row['zh-CN']" type="textarea" :autosize="{ minRows: 1, maxRows: 4 }" />
      </template>
      <template #en-US="{ row }">
        <el-input v-model="row['en-US']" type="textarea" :autosize="{ minRows: 1, maxRows: 4 }" />
      </template>

      <!-- Actions -->
      <template #operation="{ row }">
        <el-button v-permission="'i18n:edit'" type="danger" :icon="Delete" circle @click="handleDelete(row)" />
      </template>
    </ProTable>
</div>
        `,
        script: `
import { ref, reactive } from 'vue';
import { CirclePlus, Check, Delete } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useI18n } from 'vue-i18n';
import request from 'app-request';
import ProTable from '@/components/ProTable/index.vue';

// API
const getLocales = () => request.get('/i18n');
const saveLocales = (data) => request.post('/i18n', data);

// Helper
const loadLocaleMessages = async (locale, i18nGlobal) => {
  try {
    const res = await fetch(\`/locales/\${locale}.json\`);
    const messages = await res.json();
    i18nGlobal.setLocaleMessage(locale, messages);
  } catch (e) {
    console.error(\`Failed to load locale: \${locale}\`, e);
  }
};

const { t, locale } = useI18n();
const i18n = useI18n();

const proTable = ref();
const saving = ref(false);
const localData = ref([]);

// Columns
const columns = [
  { type: 'index', label: '#', width: 60 },
  { prop: 'key', label: 'column.key', minWidth: 200, search: { el: 'input' } },
  { prop: 'zh-CN', label: 'column.zhCN', minWidth: 300, search: { el: 'input' } },
  { prop: 'en-US', label: 'column.enUS', minWidth: 300, search: { el: 'input' } },
  { prop: 'operation', label: 'common.operation', fixed: 'right', width: 100 }
];

// Mock Server-side Pagination with Local Data
const getTableList = async (params) => {
  // 1. Init Data
  if (localData.value.length === 0) {
    try {
      const res = await getLocales();
      let data = [];
      if (Array.isArray(res)) {
        data = res;
      } else if (res.code === 200) {
        data = res.data;
      }
      // Add temp _id for ProTable/el-table keys
      localData.value = data.map(item => ({
        ...item,
        _id: item._id || (Date.now() + Math.random().toString(36).substr(2, 9))
      }));
    } catch (error) {
      console.error(error);
      return { data: { list: [], total: 0 } };
    }
  }

  let result = [...localData.value];

  // 2. Filter
  if (params.key) {
    const lower = params.key.toLowerCase();
    result = result.filter(item => item.key && item.key.toLowerCase().includes(lower));
  }
  if (params['zh-CN']) {
    const lower = params['zh-CN'].toLowerCase();
    result = result.filter(item => item['zh-CN'] && item['zh-CN'].toLowerCase().includes(lower));
  }
  if (params['en-US']) {
    const lower = params['en-US'].toLowerCase();
    result = result.filter(item => item['en-US'] && item['en-US'].toLowerCase().includes(lower));
  }

  // 3. Pagination
  const { pageNum, pageSize } = params;
  const total = result.length;
  const start = (pageNum - 1) * pageSize;
  const end = start + pageSize;
  const list = result.slice(start, end);

  return {
    data: list,
    total: total,
    pageNum,
    pageSize
  };
};

const handleAdd = () => {
  // Add to local data with temp ID
  localData.value.unshift({
    _id: Date.now() + Math.random().toString(36).substr(2, 9),
    key: '',
    'zh-CN': '',
    'en-US': ''
  });
  // Refresh table
  proTable.value?.getTableList();
};

const handleDelete = (row) => {
  ElMessageBox.confirm(t('i18n.confirmDeleteKey'), t('common.warning'), {
    confirmButtonText: t('common.confirm'),
    cancelButtonText: t('common.cancel'),
    type: 'warning'
  }).then(() => {
    const index = localData.value.findIndex(item => item._id === row._id);
    if (index !== -1) {
      localData.value.splice(index, 1);
      proTable.value?.getTableList();
    }
  });
};

const handleSave = async () => {
  // Validate
  const emptyKey = localData.value.find(item => !item.key || !item.key.trim());
  if (emptyKey) {
    ElMessage.warning(t('i18n.keyRequired'));
    return;
  }
  
  const keys = localData.value.map(item => item.key);
  const uniqueKeys = new Set(keys);
  if (keys.length !== uniqueKeys.size) {
    ElMessage.warning(t('i18n.duplicateKeys'));
    return;
  }

  saving.value = true;
  try {
    // Strip temp _id before saving if needed, or backend handles it.
    // Assuming backend cleans unknown fields or we should clean it.
    // Let's clean it to be safe.
    const dataToSave = localData.value.map(({ _id, ...rest }) => rest);

    const res = await saveLocales(dataToSave);
    const isSuccess = res.code === 200 || res.status === 200 || res.success;
    
    if (isSuccess) {
      ElMessage.success(t('i18n.saveSuccess'));
      await loadLocaleMessages(locale.value, i18n);
    } else {
      ElMessage.error(res.msg || t('i18n.saveFailed'));
    }
  } catch (error) {
    console.error(error);
    ElMessage.error(t('i18n.saveFailed'));
  } finally {
    saving.value = false;
  }
};
        `,
        style: `
.table-box {
  height: 100%;
}
        `
      };

      const i18nSchema = await this.createOrUpdateSchema('sys国际化管理', '国际化管理', i18nSchemaCode, entitySysI18n._id.toString(), viewSysI18n._id.toString());
      await this.createOrUpdateMenu('/sys/i18n', 'menu.system.i18n', 'Connection', 7, i18nSchema._id, parentId, ['admin']);

      // --- 8. 审计日志 (Audit Log) ---
      // Sync rollback status for existing logs
      await AuditLogService.syncRollbackStatus();
      
      const entitySysAudit = await this.createOrUpdateEntity('sys审计日志');
      const viewSysAudit = await this.createOrUpdateView('sys审计日志列表', entitySysAudit._id.toString());

      const auditSchemaCode = {
        template: `
<div class="page-container">
    <ProTable
      ref="proTable"
      :columns="columns"
      :requestApi="getAuditLogs"
      :initParam="initParam"
      :toolButton="false"
      row-key="_id"
    >
      <!-- Custom Columns -->
      <template #method="{ row }">
        <el-tag :type="getMethodType(row.method)">{{ row.method }}</el-tag>
      </template>

      <template #status="{ row }">
        <el-tag :type="getStatusType(row.status)">{{ row.status }}</el-tag>
      </template>
      
      <template #duration="{ row }">
        <span :class="getDurationClass(row.duration)">{{ row.duration }}ms</span>
      </template>

      <template #params="{ row }">
         <el-popover placement="left" :title="$t('audit.requestParams')" :width="400" trigger="click">
            <template #reference>
              <el-button link type="primary">{{ $t('audit.viewParams') }}</el-button>
            </template>
            <pre style="max-height: 400px; overflow: auto;">{{ formatParams(row.params) }}</pre>
         </el-popover>
      </template>

      <template #snapshot="{ row }">
         <el-popover v-if="row.snapshot" placement="left" :title="$t('audit.snapshot')" :width="400" trigger="click">
            <template #reference>
              <el-button link type="primary">{{ $t('audit.viewSnapshot') }}</el-button>
            </template>
            <pre style="max-height: 400px; overflow: auto;">{{ formatParams(row.snapshot) }}</pre>
         </el-popover>
         <span v-else>-</span>
      </template>

      <template #operation="{ row }">
        <el-button 
          v-if="(row.snapshot || row.method === 'POST') && row.method !== 'ROLLBACK' && !row.isRolledBack" 
          link 
          type="danger" 
          :icon="RefreshLeft" 
          @click="handleRollback(row)"
        >
          {{ $t('audit.rollback') }}
        </el-button>
        <el-tag v-else-if="row.isRolledBack" type="info" size="small">{{ $t('audit.rolledBack') }}</el-tag>
        <el-tag v-else type="info" size="small">{{ $t('audit.noSnapshot') }}</el-tag>
      </template>
    </ProTable>
</div>
        `,
        script: `
import { ref, reactive } from 'vue';
import ProTable from '@/components/ProTable/index.vue';
import request from 'app-request';
import { useI18n } from 'vue-i18n';
import { RefreshLeft } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

// API
const getAuditLogs = (params) => request.get('/audit', { params });
const rollbackAuditLog = (id) => request.post(\`/audit/\${id}/rollback\`);

const { t } = useI18n();

const proTable = ref();
const initParam = reactive({});

const columns = [
  { type: 'index', label: '#', width: 80 },
  { prop: 'username', label: 'column.username', search: { el: 'input' } },
  { prop: 'method', label: 'audit.method', width: 120, search: { el: 'select', props: { style: { width: '200px' } }, options: [
      { label: 'POST', value: 'POST' },
      { label: 'PUT', value: 'PUT' },
      { label: 'DELETE', value: 'DELETE' },
      { label: 'PATCH', value: 'PATCH' }
    ] } 
  },
  { prop: 'path', label: 'audit.path', minWidth: 200 },
  { prop: 'status', label: 'audit.status', width: 100 },
  { prop: 'duration', label: 'audit.duration', width: 100, sortable: true },
  { prop: 'ip', label: 'audit.ip', width: 140 },
  { prop: 'createdAt', label: 'column.createTime', width: 180, sortable: true },
  { prop: 'params', label: 'audit.params', width: 100 },
  { prop: 'snapshot', label: 'audit.snapshot', width: 100 },
  { prop: 'operation', label: 'common.operation', width: 150, fixed: 'right' }
];

const getMethodType = (method) => {
  const map = {
    GET: 'info',
    POST: 'success',
    PUT: 'warning',
    DELETE: 'danger',
    PATCH: 'warning'
  };
  return map[method] || 'info';
};

const getStatusType = (status) => {
  if (status >= 200 && status < 300) return 'success';
  if (status >= 300 && status < 400) return 'warning';
  return 'danger';
};

const getDurationClass = (duration) => {
  if (duration > 1000) return 'text-danger';
  if (duration > 500) return 'text-warning';
  return 'text-success';
};

const formatParams = (params) => {
  try {
    return typeof params === 'string' ? JSON.stringify(JSON.parse(params), null, 2) : JSON.stringify(params, null, 2);
  } catch (e) {
    return params;
  }
};

const handleRollback = (row) => {
  ElMessageBox.confirm(t('audit.rollbackConfirm'), t('common.warning'), {
    confirmButtonText: t('common.confirm'),
    cancelButtonText: t('common.cancel'),
    type: 'warning'
  }).then(async () => {
    try {
      await rollbackAuditLog(row._id);
      ElMessage.success(t('audit.rollbackSuccess'));
      proTable.value?.getTableList();
    } catch (error) {
      console.error(error);
    }
  });
};
        `,
        style: `
.page-container { padding: 20px; height: 100%; }
.text-danger { color: #f56c6c; }
.text-warning { color: #e6a23c; }
.text-success { color: #67c23a; }
        `
      };

      const auditSchema = await this.createOrUpdateSchema('sys审计日志', '操作日志', auditSchemaCode, entitySysAudit._id.toString(), viewSysAudit._id.toString());
      await this.createOrUpdateMenu('/sys/audit', 'menu.system.audit', 'DocumentCopy', 8, auditSchema._id, parentId, ['admin']);

      // --- 9. 接口日志 (API Log) ---
      const entitySysApiLog = await this.createOrUpdateEntity('sys接口管理');
      const viewSysApiLog = await this.createOrUpdateView('sys接口管理', entitySysApiLog._id.toString());

      const apiLogSchemaCode = {
        template: `
<div class="page-container">
    <!-- Statistics Cards -->
    <el-row :gutter="20" class="mb-4">
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ stats.totalRequests || 0 }}</div>
          <div class="stat-label">总请求数</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ Math.round(stats.avgDuration || 0) }}ms</div>
          <div class="stat-label">平均响应时间</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value text-success">{{ successRate }}%</div>
          <div class="stat-label">成功率</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value text-danger">{{ errorRate }}%</div>
          <div class="stat-label">错误率</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- ProTable -->
    <ProTable
      ref="proTable"
      :columns="columns"
      :requestApi="getApiLogs"
      :initParam="initParam"
      :toolButton="true"
      row-key="_id"
    >
      <template #method="{ row }">
        <el-tag :type="getMethodType(row.method)">{{ row.method }}</el-tag>
      </template>

      <template #status="{ row }">
        <el-tag :type="getStatusType(row.status)">{{ row.status }}</el-tag>
      </template>

      <template #duration="{ row }">
        <span :class="getDurationClass(row.duration)">{{ row.duration }}ms</span>
      </template>

      <template #path="{ row }">
        <el-tooltip :content="row.path" placement="top" :show-after="300">
          <span class="path-text">{{ row.path }}</span>
        </el-tooltip>
      </template>

      <template #requestBody="{ row }">
         <el-popover v-if="row.requestBody" placement="left" :title="$t('apiLog.requestBody')" :width="400" trigger="click">
            <template #reference>
              <el-button link type="primary">{{ $t('apiLog.view') }}</el-button>
            </template>
            <pre style="max-height: 400px; overflow: auto;">{{ formatParams(row.requestBody) }}</pre>
         </el-popover>
         <span v-else>-</span>
      </template>

      <template #responseBody="{ row }">
         <el-popover v-if="row.responseBody" placement="left" :title="$t('apiLog.responseBody')" :width="400" trigger="click">
            <template #reference>
              <el-button link type="primary">{{ $t('apiLog.view') }}</el-button>
            </template>
            <pre style="max-height: 400px; overflow: auto;">{{ formatParams(row.responseBody) }}</pre>
         </el-popover>
         <span v-else>-</span>
      </template>

      <template #error="{ row }">
        <el-tag v-if="row.error" type="danger" size="small">{{ row.error }}</el-tag>
        <span v-else>-</span>
      </template>
    </ProTable>
</div>
        `,
        script: `
import { ref, reactive, onMounted, nextTick, computed } from 'vue';
import ProTable from '@/components/ProTable/index.vue';
import request from 'app-request';

const getApiLogs = (params) => request.get('/api-log', { params });
const getApiStatistics = () => request.get('/api-log/statistics');

const proTable = ref();
const initParam = reactive({});
const stats = ref({});
const lineChartRef = ref(null);
const pieChartRef = ref(null);

const successRate = computed(() => {
  if (!stats.value.statusStats || stats.value.statusStats.length === 0) return 0;
  const total = stats.value.statusStats.reduce((sum, s) => sum + s.count, 0);
  const success = stats.value.statusStats.filter((s) => s.status >= 200 && s.status < 400).reduce((sum, s) => sum + s.count, 0);
  return total > 0 ? Math.round((success / total) * 100) : 0;
});

const errorRate = computed(() => {
  return 100 - successRate.value;
});

const fetchStatistics = async () => {
  try {
    const res = await getApiStatistics();
    if (res && res.data) {
      stats.value = res.data;
    }
  } catch (e) {
    console.error(e);
  }
};

onMounted(() => {
  fetchStatistics();
});

const columns = [
  { type: 'index', label: '#', width: 80 },
  { prop: 'method', label: 'apiLog.method', width: 100, search: { el: 'select', props: { style: { width: '120px' } }, options: [
      { label: 'GET', value: 'GET' },
      { label: 'POST', value: 'POST' },
      { label: 'PUT', value: 'PUT' },
      { label: 'DELETE', value: 'DELETE' },
      { label: 'PATCH', value: 'PATCH' }
    ] }
  },
  { prop: 'path', label: 'apiLog.path', minWidth: 200, search: { el: 'input' } },
  { prop: 'status', label: 'apiLog.status', width: 100, search: { el: 'select', props: { style: { width: '120px' } }, options: [
      { label: '200', value: '200' },
      { label: '400', value: '400' },
      { label: '401', value: '401' },
      { label: '500', value: '500' }
    ] } },
  { prop: 'duration', label: 'apiLog.duration', width: 110, sortable: true },
  { prop: 'username', label: 'apiLog.user', width: 120, search: { el: 'input' } },
  { prop: 'ip', label: 'apiLog.ip', width: 140 },
  { prop: 'createdAt', label: 'column.createTime', width: 180, sortable: true },
  { prop: 'requestBody', label: 'apiLog.requestBody', width: 100 },
  { prop: 'responseBody', label: 'apiLog.responseBody', width: 100 },
  { prop: 'error', label: 'apiLog.error', width: 120 }
];

const getMethodType = (method) => {
  const map = {
    GET: 'info',
    POST: 'success',
    PUT: 'warning',
    DELETE: 'danger',
    PATCH: 'warning'
  };
  return map[method] || 'info';
};

const getStatusType = (status) => {
  if (status >= 200 && status < 300) return 'success';
  if (status >= 300 && status < 400) return 'warning';
  if (status >= 400 && status < 500) return 'warning';
  return 'danger';
};

const getDurationClass = (duration) => {
  if (duration > 1000) return 'text-danger';
  if (duration > 500) return 'text-warning';
  return 'text-success';
};

const formatParams = (params) => {
  try {
    return typeof params === 'string' ? JSON.stringify(JSON.parse(params), null, 2) : JSON.stringify(params, null, 2);
  } catch (e) {
    return params;
  }
};
        `,
        style: `
.page-container { padding: 20px; height: 100%; }
.mb-4 { margin-bottom: 20px; }
.text-danger { color: #f56c6c; }
.text-warning { color: #e6a23c; }
.text-success { color: #67c23a; }
.path-text { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block; }
.stat-card { text-align: center; }
.stat-value { font-size: 28px; font-weight: bold; margin-bottom: 8px; }
.stat-label { color: #909399; font-size: 14px; }
        `
      };

      const apiLogSchema = await this.createOrUpdateSchema('sys接口管理', '接口日志', apiLogSchemaCode, entitySysApiLog._id.toString(), viewSysApiLog._id.toString());
      await this.createOrUpdateMenu('/sys/api-log', 'menu.system.apiLog', 'Connection', 9, apiLogSchema._id, parentId, ['admin']);

      // --- 10. 系统配置 (System Config) ---
      const configSchemaCode = {
        template: `
<div class="page-container">
    <ProTable
      ref="proTable"
      :columns="columns"
      :requestApi="getTableList"
      :initParam="initParam"
      :operation="{ view: true, edit: true, delete: false, mode: 'hover' }"
      :formConfig="{ label: $t('column.configName'), initForm: { name: '', key: '', value: '', type: 'string', description: '' }, width: '600px' }"
      @submit="submitForm"
      row-key="_id"
    >
      <template #tableHeader>
        <el-button v-permission="'config:edit'" type="primary" :icon="CirclePlus" @click="openAdd">{{ $t('table.add', { name: $t('column.configName') }) }}</el-button>
      </template>

      <template #type="{ row }">
        <el-tag :type="getTypeTag(row.type)">{{ $t('config.type.' + row.type) }}</el-tag>
      </template>
      <template #value="{ row }">
        <span v-if="row.type === 'boolean'">{{ row.value === 'true' ? $t('common.yes') : $t('common.no') }}</span>
        <span v-else-if="row.type === 'number'">{{ row.value }}</span>
        <span v-else class="value-text" :title="row.value">{{ row.value }}</span>
      </template>

      <!-- Built-in Editor Slot -->
      <template #edit-form="{ model, isEdit }">
        <el-form :model="model" label-width="120px">
          <el-form-item :label="$t('column.configName')">
            <el-input v-model="model.name" :placeholder="$t('common.pleaseInput') + $t('column.configName')" />
          </el-form-item>
          <el-form-item :label="$t('column.configKey')">
            <el-input v-model="model.key" :placeholder="$t('common.pleaseInput') + $t('column.configKey')" :disabled="isEdit" />
          </el-form-item>
          <el-form-item :label="$t('column.configType')">
            <el-select v-model="model.type" style="width: 100%" :disabled="isEdit">
              <el-option :label="$t('config.type.string')" value="string" />
              <el-option :label="$t('config.type.number')" value="number" />
              <el-option :label="$t('config.type.boolean')" value="boolean" />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('column.configValue')">
            <el-input v-if="model.type === 'string'" v-model="model.value" :placeholder="$t('common.pleaseInput') + $t('column.configValue')" />
            <el-input-number v-else-if="model.type === 'number'" v-model="model.valueNum" :min="0" style="width: 100%" :placeholder="$t('common.pleaseInput') + $t('column.configValue')" @change="handleNumChange(model)" />
            <el-switch v-else-if="model.type === 'boolean'" v-model="model.valueBool" @change="handleBoolChange(model)" />
          </el-form-item>
          <el-form-item :label="$t('column.description')">
            <el-input v-model="model.description" type="textarea" :placeholder="$t('common.pleaseInput') + $t('column.description')" />
          </el-form-item>
        </el-form>
      </template>

      <!-- Built-in Viewer Slot -->
      <template #view-form="{ model }">
        <el-form :model="model" label-width="120px" disabled>
          <el-form-item :label="$t('column.configName')">
            <el-input v-model="model.name" />
          </el-form-item>
          <el-form-item :label="$t('column.configKey')">
            <el-input v-model="model.key" />
          </el-form-item>
          <el-form-item :label="$t('column.configType')">
            <el-tag :type="getTypeTag(model.type)">{{ $t('config.type.' + model.type) }}</el-tag>
          </el-form-item>
          <el-form-item :label="$t('column.configValue')">
            <span v-if="model.type === 'boolean'">{{ model.value === 'true' ? $t('common.yes') : $t('common.no') }}</span>
            <span v-else-if="model.type === 'number'">{{ model.value }}</span>
            <el-input v-else v-model="model.value" />
          </el-form-item>
          <el-form-item :label="$t('column.description')">
            <el-input v-model="model.description" type="textarea" />
          </el-form-item>
          <el-form-item :label="$t('column.createTime')">
            <el-input :value="formatTime(model.createdAt)" />
          </el-form-item>
          <el-form-item :label="$t('column.updateTime')">
            <el-input :value="formatTime(model.updatedAt)" />
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

const { t } = useI18n();

const getTableList = (params) => request.get('/core/sys系统配置', { params });
const updateConfig = (id, data) => request.put('/core/sys系统配置/' + id, data);
const createConfig = (data) => request.post('/core/sys系统配置', data);

const proTable = ref();
const initParam = reactive({});

const columns = [
  { type: 'selection', fixed: 'left', width: 55 },
  { prop: 'name', label: 'column.configName', search: { el: 'input' }, minWidth: 150 },
  { prop: 'key', label: 'column.configKey', search: { el: 'input' }, minWidth: 150 },
  { prop: 'value', label: 'column.configValue', minWidth: 200 },
  { prop: 'type', label: 'column.configType', width: 120 },
  { prop: 'description', label: 'column.description', minWidth: 200 },
  { prop: 'createdAt', label: 'column.createTime', width: 180 }
];

const getTypeTag = (type) => {
  const map = { string: 'info', number: 'success', boolean: 'warning' };
  return map[type] || 'info';
};

const formatTime = (time) => {
  if (!time) return '-';
  const d = new Date(time);
  return d.toLocaleString('zh-CN', { hour12: false });
};

const handleNumChange = (model) => {
  if (model.valueNum !== undefined) {
    model.value = String(model.valueNum);
  }
};

const handleBoolChange = (model) => {
  model.value = model.valueBool ? 'true' : 'false';
};

const getTableListAdapted = async (params) => {
  const res = await getTableList(params);
  const list = Array.isArray(res) ? res : res.list || [];
  return {
    data: list,
    total: Array.isArray(res) ? res.length : res.total || 0
  };
};

const openAdd = () => {
  proTable.value?.openAdd();
};

const submitForm = async (formData, done) => {
  try {
    if (!formData.name || !formData.key) {
      ElMessage.warning(t('common.notEmpty', { name: t('column.configName') + '/' + t('column.configKey') }));
      done();
      return;
    }
    const payload = { ...formData };
    if (payload.valueNum !== undefined) {
      payload.value = String(payload.valueNum);
      delete payload.valueNum;
    }
    if (payload.valueBool !== undefined) {
      payload.value = payload.valueBool ? 'true' : 'false';
      delete payload.valueBool;
    }
    if (payload._id) {
      await updateConfig(payload._id, payload);
      ElMessage.success(t('common.updateSuccess'));
    } else {
      await createConfig(payload);
      ElMessage.success(t('common.createSuccess'));
    }
    done();
  } catch (e) {
    console.error(e);
    ElMessage.error(e.message || t('common.operationFailed'));
    done();
  }
};
        `,
        style: `
.page-container { padding: 20px; }
.value-text {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
}
        `
      };

      const configSchema = await this.createOrUpdateSchema('sys系统配置', '系统配置', configSchemaCode, entitySysConfig._id.toString(), viewSysConfig._id.toString());
      await this.createOrUpdateMenu('/sys/config', 'menu.system.config', 'Setting', 10, configSchema._id, parentId, ['admin']);

      // --- Init Default System Config (Swagger) ---
      await this.initDefaultSystemConfig();

    } catch (error) {
      console.error('Failed to init sys schemas:', error);
    }
  }

  static async initDefaultPermissions() {
    try {
      console.log('Initializing default permissions...');
      
      const defaultPermissions = [
        { code: 'user:view', name: '查看用户', type: 'menu', description: '查看用户列表和详情' },
        { code: 'user:edit', name: '编辑用户', type: 'button', description: '创建、编辑、删除用户' },
        { code: 'role:view', name: '查看角色', type: 'menu', description: '查看角色列表和详情' },
        { code: 'role:edit', name: '编辑角色', type: 'button', description: '创建、编辑、删除角色' },
        { code: 'permission:view', name: '查看权限', type: 'menu', description: '查看权限列表' },
        { code: 'permission:edit', name: '编辑权限', type: 'button', description: '创建、编辑、删除权限' },
        { code: 'menu:view', name: '查看菜单', type: 'menu', description: '查看菜单列表' },
        { code: 'menu:edit', name: '编辑菜单', type: 'button', description: '创建、编辑、删除菜单' },
        { code: 'schema:view', name: '查看架构', type: 'menu', description: '查看架构列表' },
        { code: 'schema:edit', name: '编辑架构', type: 'button', description: '创建、编辑、删除架构' },
        { code: 'entity:view', name: '查看实体', type: 'menu', description: '查看实体列表' },
        { code: 'entity:edit', name: '编辑实体', type: 'button', description: '创建、编辑、删除实体' },
        { code: 'audit:view', name: '查看审计日志', type: 'menu', description: '查看操作日志' },
        { code: 'audit:rollback', name: '回滚操作', type: 'button', description: '回滚历史操作' },
        { code: 'i18n:view', name: '查看国际化', type: 'menu', description: '查看国际化配置' },
        { code: 'i18n:edit', name: '编辑国际化', type: 'button', description: '编辑国际化配置' },
        { code: 'scheduler:view', name: '查看定时任务', type: 'menu', description: '查看定时任务列表' },
        { code: 'scheduler:edit', name: '编辑定时任务', type: 'button', description: '创建、编辑、删除定时任务' },
        { code: 'scheduler:delete', name: '删除定时任务', type: 'button', description: '删除定时任务' }
      ];

      for (const perm of defaultPermissions) {
        const existing = await GeneralService.getList('sys权限', { code: perm.code });
        if (existing.list.length === 0) {
          await GeneralService.create('sys权限', perm);
          console.log(`Created permission: ${perm.code}`);
        }
      }
      console.log('Default permissions initialized');
    } catch (error) {
      console.error('Failed to init default permissions:', error);
    }
  }

  static async initDefaultSystemConfig() {
    try {
      console.log('Initializing default system config...');
      const db = getDb();
      const configs = [
        { name: '启用Swagger文档', key: 'enable_swagger', value: 'true', type: 'boolean', description: '控制是否显示API文档页面' },
        { name: '系统名称', key: 'system_name', value: 'AixProject', type: 'string', description: '系统显示名称' },
        { name: '系统版本', key: 'system_version', value: '1.0.0', type: 'string', description: '系统版本号' },
        { name: '系统描述', key: 'system_description', value: '基于 AixFramework 构建的企业级管理系统', type: 'string', description: '系统描述信息' },
        { name: '默认语言', key: 'default_language', value: 'zh-CN', type: 'string', description: '系统默认语言 (zh-CN / en-US)' },
        { name: '时区设置', key: 'timezone', value: 'Asia/Shanghai', type: 'string', description: '系统时区设置' },
        { name: '系统维护模式', key: 'maintenance_mode', value: 'false', type: 'boolean', description: '开启后仅管理员可访问' },
        { name: '维护提示信息', key: 'maintenance_message', value: '系统正在维护中，请稍后再试...', type: 'string', description: '维护模式时显示给用户的信息' },
        { name: '版权信息', key: 'copyright', value: '© 2024 AixProject. All rights reserved.', type: 'string', description: '页面底部版权信息' },
        { name: '备案号', key: 'icp_license', value: '', type: 'string', description: '网站ICP备案号' }
      ];

      for (const config of configs) {
        const existing = await db.collection('sys系统配置').findOne({ key: config.key });
        if (!existing) {
          await db.collection('sys系统配置').insertOne({
            ...config,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          console.log(`Created config: ${config.key}`);
        }
      }
    } catch (error) {
      console.error('Failed to init default system config:', error);
    }
  }

  static async initDefaultRoles() {
    try {
      console.log('Initializing default roles...');
      
      await this.initDefaultPermissions();
      
      const allPerms = await GeneralService.getList('sys权限', { pageSize: 100 });
      const allPermCodes = allPerms.list.map(p => p.code);
      
      const adminRole = await GeneralService.getList('sys角色', { code: 'admin' });
      if (adminRole.list.length === 0) {
        console.log('Creating default admin role...');
        await GeneralService.create('sys角色', {
          name: '超级管理员',
          code: 'admin',
          description: '系统超级管理员，拥有所有权限',
          permissions: ['*'],
          status: 1
        });
      } else {
        await GeneralService.update('sys角色', adminRole.list[0]._id.toString(), {
          permissions: ['*']
        });
        console.log('Admin role updated with all permissions');
      }
      
      const userRole = await GeneralService.getList('sys角色', { code: 'user' });
      if (userRole.list.length === 0) {
        console.log('Creating default user role...');
        await GeneralService.create('sys角色', {
          name: '普通用户',
          code: 'user',
          description: '普通注册用户',
          permissions: ['user:view', 'menu:view'],
          status: 1
        });
      } else {
        await GeneralService.update('sys角色', userRole.list[0]._id.toString(), {
          permissions: ['user:view', 'menu:view']
        });
        console.log('User role updated with basic permissions');
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

      // Update basic info (name, icon, sort) to ensure latest config (e.g. i18n keys)
      if (menu.name !== name) {
        updates.name = name;
        needsUpdate = true;
      }
      if (menu.icon !== icon) {
        updates.icon = icon;
        needsUpdate = true;
      }
      if (menu.sort !== sort) {
        updates.sort = sort;
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
