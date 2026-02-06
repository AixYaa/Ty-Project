export default {
  system: {
    title: 'Aix Admin',
    subTitle: '企业级后台管理系统',
    welcome: '欢迎使用管理平台',
  },
  login: {
    title: '欢迎登录',
    subTitle: '请输入您的账号和密码',
    username: '用户名',
    password: '密码',
    loginBtn: '登 录',
    success: '登录成功',
    placeholder: {
      username: '请输入用户名',
      password: '请输入密码'
    },
    tips: {
      inputRequired: '请输入用户名和密码'
    }
  },
  dashboard: {
    overview: '这是您的仪表盘首页。'
  },
  header: {
    logout: '退出登录',
    confirmLogout: '确认退出登录吗？',
    tip: '提示'
  },
  menu: {
    basicInfo: '基本信息',
    parentMenu: '父菜单',
    rolePermission: '角色权限',
    visibleRoles: '可见角色',
    visibleRolesPlaceholder: '请选择可见角色 (留空则所有角色可见)',
    system: {
      management: '系统管理',
      center: '管理中心',
      menu: '菜单管理',
      entity: '实体管理',
      view: '视图管理',
      schema: '架构管理',
      role: '角色管理',
      user: '用户管理'
    },
    test: {
      dynamic: '动态测试'
    }
  },
  common: {
    home: '首页',
    operation: '操作',
    add: '新增',
    edit: '编辑',
    view: '查看',
    delete: '删除',
    confirm: '确定',
    cancel: '取消',
    search: '搜索',
    reset: '重置',
    submit: '提交',
    back: '返回',
    loading: '加载中...',
    warning: '警告',
    pleaseInput: '请输入',
    pleaseSelect: '请选择',
    notEmpty: '{name}不能为空',
    nameAndEntityRequired: '名称和实体不能为空',
    nameAndCodeRequired: '名称和标识不能为空',
    passwordPlaceholder: '留空则不修改',
    statusUpdated: '状态更新成功'
  },
  status: {
    enabled: '启用',
    disabled: '禁用'
  },
  view: {
    listView: '列表视图 (List)',
    formView: '表单视图 (Form)'
  },
  schema: {
    codeEdit: '代码编辑',
    syntaxError: '代码存在语法错误',
    fixSyntaxError: '代码存在语法错误，请修正后再提交',
    generateCode: '根据视图生成代码'
  },
  error: {
    403: '抱歉，您无权访问该页面',
    404: '抱歉，您访问的页面不存在',
    500: '抱歉，服务器出错了',
    backToHome: '返回首页'
  },
  table: {
    confirmDelete: '确定删除 "{name}" 吗？<br/>此操作不可恢复！',
    confirmBatchDelete: '确定删除选中的 <span style="color:red;font-weight:bold">{count}</span> 项吗？<br/>此操作不可恢复！',
    deleteSuccess: '删除成功',
    batchDeleteSuccess: '批量删除成功',
    add: '新增{name}',
    addSubMenu: '新增子菜单',
    edit: '编辑{name}',
    view: '查看{name}'
  },
  column: {
    menuName: '菜单名称',
    routePath: '路由路径',
    icon: '图标',
    sort: '排序',
    bindSchema: '绑定架构',
    entityName: '实体名称',
    viewName: '视图名称',
    relatedEntity: '关联实体',
    viewType: '视图类型',
    schemaName: '架构名称',
    relatedView: '关联视图',
    roleName: '角色名称',
    roleCode: '角色标识',
    description: '描述',
    status: '状态',
    username: '用户名',
    name: '姓名',
    role: '角色',
    createTime: '创建时间',
    password: '密码',
    resetPassword: '重置密码'
  }
};
