<template>
  <div class="page-container">
    <el-row :gutter="20" class="mb-4">
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ stats.totalRequests || 0 }}</div>
          <div class="stat-label">{{ $t('apiLog.totalRequests') || '总请求数' }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ Math.round(stats.avgDuration || 0) }}ms</div>
          <div class="stat-label">{{ $t('apiLog.avgDuration') || '平均响应时间' }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value text-success">{{ successRate }}%</div>
          <div class="stat-label">{{ $t('apiLog.successRate') || '成功率' }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value text-danger">{{ errorRate }}%</div>
          <div class="stat-label">{{ $t('apiLog.errorRate') || '错误率' }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="mb-4">
      <el-col :xs="24" :lg="12">
        <el-card shadow="hover">
          <template #header>
            <span>{{ $t('apiLog.topPaths') || '高频接口 Top 20' }}</span>
          </template>
          <div ref="lineChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card shadow="hover">
          <template #header>
            <span>{{ $t('apiLog.methodDistribution') || '请求方法分布' }}</span>
          </template>
          <div ref="pieChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="mb-4">
      <el-col :xs="24" :lg="12">
        <el-card shadow="hover">
          <template #header>
            <span>{{ $t('apiLog.statusDistribution') || '状态码分布' }}</span>
          </template>
          <div ref="statusChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card shadow="hover">
          <template #header>
            <span>{{ $t('apiLog.responseTime') || '响应时间分布' }}</span>
          </template>
          <div ref="barChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>{{ $t('apiLog.recentLogs') || '最近请求日志' }}</span>
          <el-button type="primary" size="small" @click="refreshLogs">
            {{ $t('common.refresh') || '刷新' }}
          </el-button>
        </div>
      </template>
      <el-table v-loading="loading" :data="logs" stripe>
        <el-table-column type="index" label="#" width="60" />
        <el-table-column prop="method" :label="$t('apiLog.method') || '方法'" width="90">
          <template #default="{ row }">
            <el-tag :type="getMethodType(row.method)" size="small">{{ row.method }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="path"
          :label="$t('apiLog.path') || '路径'"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column prop="status" :label="$t('apiLog.status') || '状态'" width="90">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="duration" :label="$t('apiLog.duration') || '耗时'" width="100">
          <template #default="{ row }">
            <span :class="getDurationClass(row.duration)">{{ row.duration }}ms</span>
          </template>
        </el-table-column>
        <el-table-column prop="username" :label="$t('apiLog.user') || '用户'" width="120" />
        <el-table-column prop="ip" :label="$t('apiLog.ip') || 'IP'" width="140" />
        <el-table-column prop="createdAt" :label="$t('column.createTime') || '时间'" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="pageNum"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        class="mt-4"
        @size-change="fetchLogs"
        @current-change="fetchLogs"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import request from '@/utils/request';
import * as echarts from 'echarts';

const stats = ref<any>({});
const logs = ref<any[]>([]);
const loading = ref(false);
const pageNum = ref(1);
const pageSize = ref(20);
const total = ref(0);

const lineChartRef = ref<HTMLElement | null>(null);
const pieChartRef = ref<HTMLElement | null>(null);
const statusChartRef = ref<HTMLElement | null>(null);
const barChartRef = ref<HTMLElement | null>(null);

let lineChart: echarts.ECharts | null = null;
let pieChart: echarts.ECharts | null = null;
let statusChart: echarts.ECharts | null = null;
let barChart: echarts.ECharts | null = null;

const successRate = computed(() => {
  if (!stats.value.statusStats || stats.value.statusStats.length === 0) return 0;
  const totalCount = stats.value.statusStats.reduce((sum: number, s: any) => sum + s.count, 0);
  const successCount = stats.value.statusStats
    .filter((s: any) => s.status >= 200 && s.status < 400)
    .reduce((sum: number, s: any) => sum + s.count, 0);
  return totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;
});

const errorRate = computed(() => 100 - successRate.value);

const fetchStatistics = async () => {
  try {
    const res = await request.get('/api-log/statistics');
    if (res) {
      stats.value = res;
      await nextTick();
      initCharts();
    }
  } catch (e) {
    console.error(e);
  }
};

const fetchLogs = async () => {
  loading.value = true;
  try {
    const res: any = await request.get('/api-log', {
      params: { pageNum: pageNum.value, pageSize: pageSize.value }
    });
    if (res) {
      logs.value = res.list || [];
      total.value = res.total || 0;
    }
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const refreshLogs = () => {
  fetchLogs();
};

const initCharts = () => {
  const textColor = '#606266';
  const colors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399'];

  // Top Paths Bar Chart
  if (lineChartRef.value && stats.value.topPaths?.length > 0) {
    if (!lineChart) lineChart = echarts.init(lineChartRef.value);
    const topPaths = stats.value.topPaths.slice(0, 20);
    lineChart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: topPaths.map((p: any) =>
          p.path.length > 15 ? p.path.substring(0, 15) + '...' : p.path
        ),
        axisLabel: { rotate: 30, color: textColor }
      },
      yAxis: { type: 'value', axisLabel: { color: textColor } },
      series: [
        {
          data: topPaths.map((p: any) => ({ value: p.count, name: p.path })),
          type: 'bar',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#409EFF' },
              { offset: 1, color: '#66B1FF' }
            ])
          }
        }
      ]
    });
  }

  // Method Pie Chart
  if (pieChartRef.value && stats.value.methodStats?.length > 0) {
    if (!pieChart) pieChart = echarts.init(pieChartRef.value);
    pieChart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0, textStyle: { color: textColor } },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
          label: { show: false },
          emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
          data: stats.value.methodStats.map((m: any, i: number) => ({
            value: m.count,
            name: m.method,
            itemStyle: { color: colors[i % colors.length] }
          }))
        }
      ]
    });
  }

  // Status Pie Chart
  if (statusChartRef.value && stats.value.statusStats?.length > 0) {
    if (!statusChart) statusChart = echarts.init(statusChartRef.value);
    const statusColors: Record<number, string> = {
      200: '#67C23A',
      304: '#909399',
      401: '#E6A23C',
      404: '#F56C6C',
      500: '#F56C6C'
    };
    statusChart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0, textStyle: { color: textColor } },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
          label: { show: false },
          emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
          data: stats.value.statusStats.map((s: any) => ({
            value: s.count,
            name: String(s.status),
            itemStyle: { color: statusColors[s.status] || '#909399' }
          }))
        }
      ]
    });
  }

  // Response Time Bar Chart (Top Paths avgDuration)
  if (barChartRef.value && stats.value.topPaths?.length > 0) {
    if (!barChart) barChart = echarts.init(barChartRef.value);
    const topPaths = stats.value.topPaths.slice(0, 10);
    barChart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: topPaths.map((p: any) =>
          p.path.length > 12 ? p.path.substring(0, 12) + '...' : p.path
        ),
        axisLabel: { rotate: 30, color: textColor }
      },
      yAxis: { type: 'value', name: 'ms', axisLabel: { color: textColor } },
      series: [
        {
          data: topPaths.map((p: any) => p.avgDuration),
          type: 'bar',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#67C23A' },
              { offset: 1, color: '#95D475' }
            ])
          }
        }
      ]
    });
  }
};

const getMethodType = (method: string): 'success' | 'warning' | 'danger' | 'info' | 'primary' => {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'primary'> = {
    GET: 'info',
    POST: 'success',
    PUT: 'warning',
    DELETE: 'danger',
    PATCH: 'warning'
  };
  return map[method] || 'info';
};

const getStatusType = (status: number) => {
  if (status >= 200 && status < 300) return 'success';
  if (status >= 300 && status < 400) return 'info';
  if (status >= 400 && status < 500) return 'warning';
  return 'danger';
};

const getDurationClass = (duration: number) => {
  if (duration > 1000) return 'text-danger';
  if (duration > 500) return 'text-warning';
  return 'text-success';
};

const formatDate = (date: string) => {
  if (!date) return '';
  return new Date(date).toLocaleString();
};

const handleResize = () => {
  lineChart?.resize();
  pieChart?.resize();
  statusChart?.resize();
  barChart?.resize();
};

onMounted(() => {
  fetchStatistics();
  fetchLogs();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  lineChart?.dispose();
  pieChart?.dispose();
  statusChart?.dispose();
  barChart?.dispose();
});
</script>

<style scoped>
.page-container {
  padding: 20px;
}
.mb-4 {
  margin-bottom: 20px;
}
.mt-4 {
  margin-top: 20px;
}
.text-danger {
  color: #f56c6c;
}
.text-warning {
  color: #e6a23c;
}
.text-success {
  color: #67c23a;
}
.stat-card {
  text-align: center;
}
.stat-value {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 8px;
}
.stat-label {
  color: #909399;
  font-size: 14px;
}
.chart-container {
  height: 280px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
