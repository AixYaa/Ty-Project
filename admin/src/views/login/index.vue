<template>
  <div class="login-container">
    <div class="login-content">
      <div class="login-left">
        <div class="login-welcome">
          <h1>{{ $t('system.title') }}</h1>
          <p>{{ $t('system.subTitle') }}</p>
        </div>
      </div>
      <div class="login-right">
        <el-card class="login-card" shadow="never">
          <div class="login-header">
            <h2>{{ $t('login.title') }}</h2>
            <p class="sub-title">{{ $t('login.subTitle') }}</p>
          </div>
          <el-form :model="loginForm" class="login-form" size="large">
            <el-form-item>
              <el-input
                v-model="loginForm.username"
                :placeholder="$t('login.placeholder.username')"
                :prefix-icon="User"
                @keyup.enter="handleLogin"
              />
            </el-form-item>
            <el-form-item>
              <el-input
                v-model="loginForm.password"
                type="password"
                :placeholder="$t('login.placeholder.password')"
                :prefix-icon="Lock"
                show-password
                @keyup.enter="handleLogin"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" class="login-btn" :loading="loading" @click="handleLogin">
                {{ $t('login.loginBtn') }}
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../store/user';
import { ElMessage } from 'element-plus';
import { User, Lock } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';

const router = useRouter();
const userStore = useUserStore();
const { t } = useI18n();

const loginForm = ref({
  username: '',
  password: ''
});

const loading = ref(false);

const handleLogin = async () => {
  if (!loginForm.value.username || !loginForm.value.password) {
    ElMessage.warning(t('login.tips.inputRequired'));
    return;
  }

  loading.value = true;
  try {
    await userStore.login(loginForm.value);
    ElMessage.success(t('login.success'));
    router.push('/');
  } catch {
    // 错误已在 request 中处理
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-container {
  height: 100vh;
  width: 100%;
  background-color: #f0f2f5;
  background-image: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.login-content {
  display: flex;
  width: 900px;
  height: 500px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.login-left {
  flex: 1;
  background: linear-gradient(135deg, #1c2e40 0%, #2080c0 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #fff;
  padding: 40px;
}

.login-welcome h1 {
  font-size: 36px;
  font-weight: bold;
  margin-bottom: 20px;
}

.login-welcome p {
  font-size: 16px;
  opacity: 0.8;
}

.login-right {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  background-color: #fff;
}

.login-card {
  width: 100%;
  border: none;
}

.login-header {
  margin-bottom: 30px;
  text-align: center;
}

.login-header h2 {
  font-size: 24px;
  color: #333;
  margin-bottom: 10px;
  font-weight: 600;
}

.sub-title {
  color: #909399;
  font-size: 14px;
}

.login-form {
  padding: 0 20px;
}

.login-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  background-color: #2080c0;
  border-color: #2080c0;
  transition: all 0.3s;
}

.login-btn:hover {
  background-color: #3a9bdc;
  border-color: #3a9bdc;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(32, 128, 192, 0.3);
}

:deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #dcdfe6 inset;
  background-color: #f8f9fa;
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #2080c0 inset;
  background-color: #fff;
}
</style>
