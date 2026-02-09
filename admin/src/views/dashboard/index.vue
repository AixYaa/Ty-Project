<template>
  <div class="dashboard-container">
    <!-- Welcome Card -->
    <el-card class="mb-4 welcome-card">
      <div class="welcome-content">
        <div class="greeting-wrapper">
          <el-avatar :size="64" class="user-avatar" :src="userStore.userInfo?.avatar">
            {{
              (userStore.userInfo?.name || userStore.userInfo?.username || 'A')
                .charAt(0)
                .toUpperCase()
            }}
          </el-avatar>
          <div class="greeting-text">
            <h1>
              Hello, {{ userStore.userInfo?.name || userStore.userInfo?.username || 'Admin' }}
            </h1>
            <p>{{ $t('dashboard.overview') }}</p>
          </div>
        </div>
      </div>
    </el-card>

    <!-- Statistics Cards -->
    <el-row :gutter="20" class="mb-4">
      <el-col v-for="(stat, index) in statistics" :key="index" :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" :style="{ backgroundColor: stat.color }">
            <component :is="stat.icon" />
          </div>
          <div class="stat-info">
            <div class="stat-label">{{ $t(stat.label) }}</div>
            <div class="stat-value">{{ stat.value }}</div>
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
              <span>{{ $t('dashboard.charts.visitsTrend') }}</span>
            </div>
          </template>
          <div ref="lineChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="8">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header">
              <span>{{ $t('dashboard.charts.userDistribution') }}</span>
            </div>
          </template>
          <div ref="pieChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Git Log Section -->
    <el-card class="timeline-card-container">
      <template #header>
        <div class="card-header">
          <span>{{ $t('dashboard.projectUpdates') }} (Git Log)</span>
        </div>
      </template>
      <div class="timeline-content">
        <el-timeline v-if="commits.length > 0">
          <el-timeline-item
            v-for="(activity, index) in commits"
            :key="index"
            :timestamp="activity.date"
            placement="top"
            :type="index === 0 ? 'primary' : ''"
            :hollow="index === 0"
          >
            <el-card shadow="hover" class="commit-card">
              <div class="commit-header">
                <div class="commit-meta">
                  <el-tag size="small" :type="stringToTagType(activity.author)">{{
                    activity.author
                  }}</el-tag>
                  <span class="commit-hash" title="Click to copy" @click="copyHash(activity.hash)">
                    {{ activity.hash }}
                  </span>
                </div>
              </div>
              <h4 class="commit-message">{{ activity.message }}</h4>
            </el-card>
          </el-timeline-item>
        </el-timeline>
        <el-empty v-else :description="$t('dashboard.noHistory')" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue';
import { useUserStore } from '@/store/user';
import { getGitLogs, type GitCommit } from '@/api/common';
import { ElMessage } from 'element-plus';
import { User, View, Goods, Money } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import { useDark } from '@vueuse/core';

const userStore = useUserStore();
const commits = ref<GitCommit[]>([]);
const lineChartRef = ref<HTMLElement | null>(null);
const pieChartRef = ref<HTMLElement | null>(null);
let lineChart: echarts.ECharts | null = null;
let pieChart: echarts.ECharts | null = null;
const isDark = useDark();

// Mock Statistics Data
const statistics = [
  { label: 'dashboard.statistics.users', value: '1,234', icon: User, color: '#409EFF' },
  { label: 'dashboard.statistics.visits', value: '4,567', icon: View, color: '#67C23A' },
  { label: 'dashboard.statistics.orders', value: '89', icon: Goods, color: '#E6A23C' },
  { label: 'dashboard.statistics.income', value: '$12,345', icon: Money, color: '#F56C6C' }
];

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
        data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        axisLabel: { color: textColor },
        axisLine: { lineStyle: { color: borderColor } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: borderColor } }
      },
      series: [
        {
          name: 'Visits',
          type: 'line',
          smooth: true,
          data: [120, 132, 101, 134, 90, 230, 210],
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(64,158,255,0.5)' },
              { offset: 1, color: 'rgba(64,158,255,0.01)' }
            ])
          },
          itemStyle: { color: '#409EFF' }
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
        textStyle: { color: textColor }
      },
      series: [
        {
          name: 'User Distribution',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: isDark.value ? '#1d1e1f' : '#fff',
            borderWidth: 2
          },
          label: { show: false, position: 'center' },
          emphasis: { label: { show: true, fontSize: 20, fontWeight: 'bold', color: textColor } },
          data: [
            { value: 1048, name: 'Admin' },
            { value: 735, name: 'Editor' },
            { value: 580, name: 'Viewer' },
            { value: 484, name: 'Guest' },
            { value: 300, name: 'Other' }
          ]
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

// Generate a consistent tag type based on string
const stringToTagType = (str: string) => {
  const types = ['', 'success', 'warning', 'danger', 'info'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return types[Math.abs(hash) % types.length] as any;
};

const copyHash = async (hash: string) => {
  try {
    await navigator.clipboard.writeText(hash);
    ElMessage.success('Copied: ' + hash);
  } catch (err) {
    console.error('Failed to copy', err);
  }
};

onMounted(async () => {
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
  background: linear-gradient(135deg, #fff 0%, #f0f9ff 100%);
  transition: background 0.3s;
}

/* Dark mode override for welcome card */
html.dark .welcome-card {
  background: linear-gradient(135deg, var(--el-bg-color-overlay) 0%, var(--el-bg-color) 100%);
}

.welcome-content {
  padding: 10px 0;
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
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--el-text-color-primary); /* Variable */
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
  padding: 10px;
}

.commit-card {
  border-left: 3px solid var(--el-border-color-lighter); /* Variable */
  background-color: var(--el-bg-color-overlay); /* Variable */
}

.commit-card:hover {
  border-left-color: #409eff;
}

.commit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.commit-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.commit-message {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--el-text-color-primary); /* Variable */
  font-weight: 500;
}

.commit-hash {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
  background-color: var(--el-fill-color-light); /* Variable */
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--el-text-color-secondary); /* Variable */
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.commit-hash:hover {
  background-color: var(--el-color-primary-light-9);
  color: #409eff;
}
</style>
