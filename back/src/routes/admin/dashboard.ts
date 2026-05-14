import { Router, Request, Response } from 'express';
import { getDb } from '../../db/mongo';
import { ApiResult } from '../../apiResult';

const router = Router();

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    
    // 获取各项统计数据
    const userCount = await db.collection('sys用户').countDocuments();
    const menuCount = await db.collection('sys菜单').countDocuments();
    const schemaCount = await db.collection('sys架构').countDocuments();
    const apiLogCount = await db.collection('sys_api_logs').countDocuments();
    
    // 获取最近7天的 API 访问趋势
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const apiLogsTrend = await db.collection('sys_api_logs').aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Shanghai" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    // 填充缺失的日期
    const trendData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }).replace(/\//g, '-');
      // Format 2023-05-14 correctly. toLocaleDateString might return 2023/5/14, let's format manually:
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      const found = apiLogsTrend.find(item => item._id === formattedDate);
      trendData.push({
        date: formattedDate,
        count: found ? found.count : 0
      });
    }

    res.json(ApiResult.success({
      statistics: {
        users: userCount,
        menus: menuCount,
        schemas: schemaCount,
        apiLogs: apiLogCount
      },
      trends: {
        apiLogs: trendData
      }
    }));
  } catch (error: any) {
    console.error('Failed to get dashboard stats:', error);
    res.status(500).json(ApiResult.error('Failed to get dashboard stats'));
  }
});

export default router;