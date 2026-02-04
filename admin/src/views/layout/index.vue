<template>
  <div class="app-layout">
    <el-container>
      <el-aside width="200px" class="aside">
        <div class="logo">管理平台</div>
        <el-menu
          router
          :default-active="$route.path"
          class="el-menu-vertical"
          background-color="#001529"
          text-color="#fff"
          active-text-color="#409EFF"
        >
          <el-menu-item index="/dashboard">
            <el-icon><House /></el-icon>
            <span>首页</span>
          </el-menu-item>
          
          <!-- 递归渲染菜单 -->
          <template v-for="menu in menuTree" :key="menu._id">
            <el-sub-menu v-if="menu.children && menu.children.length > 0" :index="menu._id || ''">
              <template #title>
                <el-icon v-if="menu.icon"><component :is="menu.icon" /></el-icon>
                <span>{{ menu.name }}</span>
              </template>
              <el-menu-item 
                v-for="child in menu.children" 
                :key="child._id" 
                :index="child.path"
              >
                <el-icon v-if="child.icon"><component :is="child.icon" /></el-icon>
                <span>{{ child.name }}</span>
              </el-menu-item>
            </el-sub-menu>
            <el-menu-item v-else :index="menu.path">
              <el-icon v-if="menu.icon"><component :is="menu.icon" /></el-icon>
              <span>{{ menu.name }}</span>
            </el-menu-item>
          </template>
        </el-menu>
      </el-aside>
      <el-container>
        <el-header class="header">
          <div class="header-right">
            <span class="username" v-if="userStore.userInfo">
              {{ userStore.userInfo.name || userStore.userInfo.username }}
            </span>
            <el-button type="primary" link @click="handleLogout">退出登录</el-button>
          </div>
        </el-header>
        <el-main>
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../store/user';
import { getMenuTree, type SysMenu } from '../../api/sys';
import { House } from '@element-plus/icons-vue';

const router = useRouter();
const userStore = useUserStore();
const menuTree = ref<SysMenu[]>([]);

const loadMenus = async () => {
  try {
    const res = await getMenuTree();
    menuTree.value = res;
  } catch (e) {
    console.error('Failed to load menus', e);
  }
};

const handleLogout = async () => {
  await userStore.logout();
  router.push('/login');
};

onMounted(() => {
  loadMenus();
});
</script>

<style scoped>
.app-layout {
  height: 100vh;
}
.el-container {
  height: 100%;
}
.aside {
  background-color: #001529;
  color: white;
  display: flex;
  flex-direction: column;
}
.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  font-size: 20px;
  font-weight: bold;
  background-color: #002140;
}
.el-menu-vertical {
  border-right: none;
  flex: 1;
}
.header {
  background-color: #fff;
  border-bottom: 1px solid #dcdfe6;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 20px;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}
.username {
  font-size: 14px;
  color: #606266;
}
</style>
