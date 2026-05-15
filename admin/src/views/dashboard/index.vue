<template>
  <div class="dashboard-container">
    <!-- Welcome Card -->
    <el-card class="mb-4 welcome-card" shadow="never">
      <div class="welcome-content">
        <div class="greeting-wrapper">
          <el-avatar
            :size="72"
            class="user-avatar"
            :src="
              typeof userStore.userInfo?.avatar === 'string'
                ? userStore.userInfo?.avatar
                : userStore.userInfo?.avatar?.compressed
            "
          >
            {{
              (userStore.userInfo?.name || userStore.userInfo?.username || 'A')
                .charAt(0)
                .toUpperCase()
            }}
          </el-avatar>
          <div class="greeting-text">
            <h1>
              {{ getGreetingTime() }}，{{
                userStore.userInfo?.name || userStore.userInfo?.username || 'Admin'
              }}！
            </h1>
            <p>{{ $t('dashboard.overview') }} | 又是充满活力的一天，准备好开始工作了吗？</p>
          </div>
        </div>
        <div class="quick-actions">
          <el-button type="primary" plain @click="$router.push('/sys/menu')">
            <el-icon><Menu /></el-icon>菜单管理
          </el-button>
          <el-button type="success" plain @click="$router.push('/sys/schema')">
            <el-icon><DataBoard /></el-icon>实体模型
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- Statistics Cards -->
    <el-row :gutter="20" class="mb-4">
      <el-col v-for="(stat, index) in statistics" :key="index" :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" :style="{ backgroundColor: stat.color + '1A', color: stat.color }">
            <component :is="stat.icon" />
          </div>
          <div class="stat-info">
            <div class="stat-label">{{ stat.label }}</div>
            <el-statistic :value="stat.value" class="stat-value" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Charts Section -->
    <el-row :gutter="20" class="mb-4">
      <el-col :xs="24" :lg="16">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header">
              <span class="header-title">近7日 API 调用趋势</span>
            </div>
          </template>
          <div ref="lineChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="8">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header">
              <span class="header-title">系统模块概览</span>
            </div>
          </template>
          <div ref="pieChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Git Log Section -->
    <el-card shadow="never" class="timeline-card-container">
      <template #header>
        <div class="card-header">
          <span class="header-title">{{ $t('dashboard.projectUpdates') }} (Git Log)</span>
        </div>
      </template>
      <el-scrollbar max-height="500px" class="timeline-content">
        <el-timeline v-if="commits.length > 0">
          <el-timeline-item
            v-for="(activity, index) in commits"
            :key="index"
            :type="index === 0 ? 'primary' : 'info'"
            :hollow="index === 0"
            :size="index === 0 ? 'large' : 'normal'"
          >
            <div class="custom-commit-card">
              <div class="commit-content-wrapper">
                <div class="commit-message-box">
                  <h4 class="commit-message">{{ activity.message }}</h4>
                </div>

                <div class="commit-footer">
                  <div class="commit-meta-left">
                    <div class="author-info">
                      <el-avatar
                        :size="20"
                        class="author-avatar"
                        :style="{ backgroundColor: getAvatarColor(activity.author) }"
                      >
                        {{ activity.author.charAt(0).toUpperCase() }}
                      </el-avatar>
                      <span
                        class="author-name"
                        :class="{ 'is-me': activity.author.toLowerCase() === 'aix' }"
                        >{{ activity.author }}</span
                      >
                    </div>
                    <span class="divider"></span>
                    <span class="commit-time">
                      <el-icon><Timer /></el-icon>
                      {{ activity.date }}
                    </span>
                  </div>

                  <div class="commit-meta-right">
                    <div
                      class="commit-hash-btn"
                      title="复制 Commit Hash"
                      @click="copyHash(activity.hash)"
                    >
                      <el-icon><DocumentCopy /></el-icon>
                      <span>{{ activity.hash }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-timeline-item>
        </el-timeline>
        <el-empty v-else :description="$t('dashboard.noHistory')" />
      </el-scrollbar>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue';
import { useUserStore } from '@/store/user';
import { getGitLogs, type GitCommit } from '@/api/common';
import { getDashboardStats } from '@/api/dashboard';
import { ElMessage } from 'element-plus';
import { User, Menu, DataBoard, Connection, DocumentCopy, Timer } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import { useDark } from '@vueuse/core';

const userStore = useUserStore();
const commits = ref<GitCommit[]>([]);
const lineChartRef = ref<HTMLElement | null>(null);
const pieChartRef = ref<HTMLElement | null>(null);
let lineChart: echarts.ECharts | null = null;
let pieChart: echarts.ECharts | null = null;
const isDark = useDark();

// 获取问候语
const getGreetingTime = () => {
  const hour = new Date().getHours();
  if (hour < 6) return '凌晨好';
  if (hour < 9) return '早上好';
  if (hour < 12) return '上午好';
  if (hour < 14) return '中午好';
  if (hour < 17) return '下午好';
  if (hour < 19) return '傍晚好';
  return '晚上好';
};

// Statistics Data (Reactive)
const statistics = ref([
  { label: '系统用户数', value: 0, icon: User, color: '#409EFF' },
  { label: '菜单配置数', value: 0, icon: Menu, color: '#67C23A' },
  { label: '实体模型数', value: 0, icon: DataBoard, color: '#E6A23C' },
  { label: 'API 调用量', value: 0, icon: Connection, color: '#F56C6C' }
]);

const trendData = ref<Array<{ date: string; count: number }>>([]);
const moduleData = ref<Array<{ name: string; value: number }>>([]);

const chartTextColor = computed(() => (isDark.value ? '#E5EAF3' : '#606266'));
const chartBorderColor = computed(() => (isDark.value ? '#4C4D4F' : '#EBEEF5'));

// Initialize Charts
const initCharts = () => {
  const textColor = chartTextColor.value;
  const borderColor = chartBorderColor.value;

  if (lineChartRef.value) {
    lineChart = echarts.init(lineChartRef.value);
    lineChart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark.value ? 'rgba(0,0,0,0.7)' : '#fff',
        borderColor: borderColor,
        textStyle: { color: textColor }
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: trendData.value.map((item) => item.date),
        axisLabel: { color: textColor },
        axisLine: { lineStyle: { color: borderColor } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: borderColor, type: 'dashed' } }
      },
      series: [
        {
          name: 'API 调用量',
          type: 'line',
          smooth: true,
          data: trendData.value.map((item) => item.count),
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(64,158,255,0.3)' },
              { offset: 1, color: 'rgba(64,158,255,0.01)' }
            ])
          },
          itemStyle: { color: '#409EFF' },
          lineStyle: { width: 3 }
        }
      ]
    });
  }

  if (pieChartRef.value) {
    pieChart = echarts.init(pieChartRef.value);
    pieChart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: isDark.value ? 'rgba(0,0,0,0.7)' : '#fff',
        borderColor: borderColor,
        textStyle: { color: textColor }
      },
      legend: {
        bottom: '0%',
        textStyle: { color: textColor },
        icon: 'circle'
      },
      series: [
        {
          name: '模块分布',
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: isDark.value ? '#141414' : '#fff',
            borderWidth: 2
          },
          label: { show: false, position: 'center' },
          emphasis: { label: { show: true, fontSize: 18, fontWeight: 'bold', color: textColor } },
          data: moduleData.value
        }
      ]
    });
  }
};

// Resize handler
const handleResize = () => {
  lineChart?.resize();
  pieChart?.resize();
};

// Watch theme change to update charts
watch(isDark, () => {
  lineChart?.dispose();
  pieChart?.dispose();
  initCharts();
});

const getAvatarColor = (str: string) => {
  const colors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#9c27b0'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const copyHash = async (hash: string) => {
  try {
    await navigator.clipboard.writeText(hash);
    ElMessage.success('Copied: ' + hash);
  } catch (err) {
    console.error('Failed to copy', err);
  }
};

const loadStats = async () => {
  try {
    const data = await getDashboardStats();
    if (data) {
      if (statistics.value && statistics.value.length >= 4) {
        statistics.value[0]!.value = data.statistics.users;
        statistics.value[1]!.value = data.statistics.menus;
        statistics.value[2]!.value = data.statistics.schemas;
        statistics.value[3]!.value = data.statistics.apiLogs;
      }

      trendData.value = data.trends.apiLogs;

      // Update pie chart with some meaningful distributions
      moduleData.value = [
        { name: '用户管理', value: data.statistics.users },
        { name: '菜单配置', value: data.statistics.menus },
        { name: '数据模型', value: data.statistics.schemas }
      ];
    }
  } catch (error) {
    console.error('Failed to load dashboard stats:', error);
  }
};

onMounted(async () => {
  await loadStats();

  // Init charts
  nextTick(() => {
    initCharts();
    window.addEventListener('resize', handleResize);
  });

  // Fetch git logs
  try {
    const data = await getGitLogs();
    if (Array.isArray(data)) {
      commits.value = data;
    }
  } catch (error) {
    console.error('Failed to load git logs:', error);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  lineChart?.dispose();
  pieChart?.dispose();
});
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.mb-4 {
  margin-bottom: 20px;
}

/* Welcome Card */
.welcome-card {
  border: none;
  background: linear-gradient(135deg, #e6f7ff 0%, #ffffff 100%);
  transition: background 0.3s;
}

/* Dark mode override for welcome card */
html.dark .welcome-card {
  background: linear-gradient(135deg, #141414 0%, #1d1e1f 100%);
}

.welcome-content {
  padding: 10px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.quick-actions {
  display: flex;
  gap: 12px;
}

.header-title {
  font-weight: bold;
  font-size: 16px;
  color: var(--el-text-color-primary);
}

.greeting-wrapper {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-avatar {
  background-color: #409eff;
  font-size: 24px;
  border: 4px solid var(--el-color-white); /* Use variable for border */
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

html.dark .user-avatar {
  border-color: var(--el-bg-color);
}

.greeting-text h1 {
  margin: 0 0 5px 0;
  font-size: 24px;
  color: var(--el-text-color-primary); /* Variable */
}

.greeting-text p {
  margin: 0;
  color: var(--el-text-color-secondary); /* Variable */
}

/* Stat Cards */
.stat-card {
  border: none;
  transition: all 0.3s;
  cursor: pointer;
  margin-bottom: 10px;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.stat-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  padding: 20px;
}

.stat-icon {
  width: 40px; /* Reduced from 48px */
  height: 40px; /* Reduced from 48px */
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  color: #fff;
  font-size: 20px; /* Reduced from 24px */
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: var(--el-text-color-secondary); /* Variable */
  margin-bottom: 8px;
}

.stat-value {
  --el-statistic-content-font-size: 28px;
  --el-statistic-content-font-weight: bold;
}

/* Charts */
.chart-card {
  margin-bottom: 20px;
}

.chart-container {
  height: 300px;
  width: 100%;
}

/* Timeline */
.timeline-content {
  padding: 10px 20px 10px 10px;
}

.timeline-content :deep(.el-timeline-item__timestamp) {
  display: none; /* Hide default timestamp as it's shown in card */
}

.timeline-content :deep(.el-timeline-item__tail) {
  border-left: 2px solid var(--el-border-color-lighter);
}

.custom-commit-card {
  position: relative;
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  padding: 16px;
  margin-left: 8px;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.custom-commit-card::before {
  content: '';
  position: absolute;
  left: -6px;
  top: 18px;
  width: 10px;
  height: 10px;
  background-color: var(--el-bg-color);
  border-left: 1px solid var(--el-border-color-light);
  border-bottom: 1px solid var(--el-border-color-light);
  transform: rotate(45deg);
  z-index: 1;
}

.custom-commit-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border-color: var(--el-color-primary-light-5);
}

html.dark .custom-commit-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.custom-commit-card:hover::before {
  border-left-color: var(--el-color-primary-light-5);
  border-bottom-color: var(--el-color-primary-light-5);
}

.commit-message-box {
  margin-bottom: 16px;
}

.commit-message {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  font-weight: 500;
  word-break: break-word;
}

.commit-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--el-border-color-lighter);
}

.commit-meta-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.author-avatar {
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.author-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.author-name.is-me {
  color: var(--el-color-primary);
}

.divider {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: var(--el-border-color);
}

.commit-time {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.commit-hash-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  background-color: var(--el-fill-color-light);
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.commit-hash-btn:hover {
  color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.mr-1 {
  margin-right: 4px;
}
</style>
