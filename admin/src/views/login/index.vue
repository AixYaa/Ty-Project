<template>
  <div class="login-container">
    <div class="login-bg" :style="{ backgroundImage: `url(${bgImage})` }"></div>
    <div class="login-content">
      <div class="login-left">
        <div class="login-image-wrapper">
          <img :src="loginImage" alt="system" class="login-image" />
        </div>
      </div>
      <div class="login-right">
        <div class="login-card">
          <div class="card-header">
            <h1 class="system-name">{{ systemInfo.systemName || '管理平台' }}</h1>
            <p class="system-desc">{{ systemInfo.systemDescription || '企业级管理系统' }}</p>
            <div class="version-badge">v{{ systemInfo.systemVersion || '1.0.0' }}</div>
          </div>
          <el-form :model="loginForm" class="login-form" size="large" @submit.prevent="handleLogin">
            <el-form-item>
              <el-input
                v-model="loginForm.username"
                :placeholder="$t('login.placeholder.username')"
                :prefix-icon="User"
                clearable
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
          <div class="card-footer">
            <span class="copyright">{{ copyrightInfo.copyright }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../store/user';
import { useSystemStore } from '../../store/system';
import { ElMessage } from 'element-plus';
import { User, Lock } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import bgImage from '../../assets/loginbg4.png';
import loginImage from '../../assets/loginbg5.png';

const router = useRouter();
const userStore = useUserStore();
const systemStore = useSystemStore();
const { t } = useI18n();

const systemInfo = computed(() => systemStore.getSystemInfo());
const copyrightInfo = computed(() => systemStore.getCopyrightInfo());

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

onMounted(async () => {
  if (!systemStore.isLoaded) {
    await systemStore.loadSystemInfo();
  }
});
</script>

<style scoped>
.login-container {
  height: 100vh;
  width: 100%;
  position: relative;
  overflow: hidden;
}

.login-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 0;
}

.login-content {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
}

.login-left {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.login-image-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-image {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 20px;
}

.login-right {
  width: 480px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 40px;
}

.login-card {
  width: 100%;
  max-width: 360px;
}

.card-header {
  text-align: center;
  margin-bottom: 40px;
}

.system-name {
  font-size: 28px;
  font-weight: bold;
  color: #1c2e40;
  margin: 0 0 12px;
  letter-spacing: 1px;
}

.system-desc {
  font-size: 14px;
  color: #666;
  margin: 0 0 16px;
}

.version-badge {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(79, 195, 247, 0.15);
  border: 1px solid rgba(79, 195, 247, 0.3);
  border-radius: 20px;
  font-size: 12px;
  color: #2080c0;
  letter-spacing: 1px;
}

.login-form {
  padding: 0 8px;
}

:deep(.el-form-item) {
  margin-bottom: 24px;
}

:deep(.el-input__wrapper) {
  background: #f8f9fa;
  border: 1px solid #e0e4e8;
  box-shadow: none;
  border-radius: 10px;
  padding: 4px 12px;
  transition: all 0.3s;
}

:deep(.el-input__wrapper:hover) {
  border-color: #2080c0;
}

:deep(.el-input__wrapper.is-focus) {
  background: #ffffff;
  border-color: #2080c0;
  box-shadow: 0 0 0 2px rgba(32, 128, 192, 0.15);
}

:deep(.el-input__inner) {
  color: #333;
  height: 40px;
}

:deep(.el-input__inner::placeholder) {
  color: #999;
}

.login-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #2080c0 0%, #1c6db0 100%);
  border: none;
  border-radius: 10px;
  color: #ffffff;
  letter-spacing: 2px;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(32, 128, 192, 0.3);
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(32, 128, 192, 0.4);
  background: linear-gradient(135deg, #3a9bdc 0%, #2080c0 100%);
}

.login-btn:active {
  transform: translateY(0);
}

.login-btn.is-loading {
  background: linear-gradient(135deg, #2080c0 0%, #1c6db0 100%);
}

.card-footer {
  margin-top: 32px;
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #e0e4e8;
}

.copyright {
  font-size: 12px;
  color: #999;
  letter-spacing: 0.5px;
}

@media (max-width: 900px) {
  .login-left {
    display: none;
  }

  .login-right {
    width: 100%;
    background: rgba(255, 255, 255, 0.98);
  }
}
</style>
