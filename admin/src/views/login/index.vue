<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <h2 class="login-title">管理平台登录</h2>
      </template>
      <el-form :model="loginForm" label-width="0">
        <el-form-item>
          <el-input v-model="loginForm.username" placeholder="用户名" :prefix-icon="User" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="loginForm.password" type="password" placeholder="密码" :prefix-icon="Lock" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" class="login-btn" @click="handleLogin" :loading="loading">登录</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../store/user';
import { ElMessage } from 'element-plus';
import { User, Lock } from '@element-plus/icons-vue';

const router = useRouter();
const userStore = useUserStore();

const loginForm = ref({
  username: '',
  password: ''
});

const loading = ref(false);

const handleLogin = async () => {
  if (!loginForm.value.username || !loginForm.value.password) {
    ElMessage.warning('请输入用户名和密码');
    return;
  }
  
  loading.value = true;
  try {
    await userStore.login(loginForm.value);
    ElMessage.success('登录成功');
    router.push('/');
  } catch (error) {
    // 错误已在 request 中处理
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f0f2f5;
}
.login-card {
  width: 400px;
}
.login-title {
  text-align: center;
  margin: 0;
}
.login-btn {
  width: 100%;
}
</style>
