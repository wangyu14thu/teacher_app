// pages/points-record/points-record.js
Page({
  data: {
    totalPoints: 125,
    records: [
      {
        id: 1,
        icon: '🎉',
        title: '项目审核通过',
        time: '2024-01-28 14:30',
        points: 50,
        type: 'add'
      },
      {
        id: 2,
        icon: '📝',
        title: '发布优质项目',
        time: '2024-01-25 10:20',
        points: 30,
        type: 'add'
      },
      {
        id: 3,
        icon: '⭐',
        title: '项目被精选推荐',
        time: '2024-01-20 16:45',
        points: 100,
        type: 'add'
      },
      {
        id: 4,
        icon: '🛒',
        title: '兑换VIP会员',
        time: '2024-01-15 09:10',
        points: 55,
        type: 'minus'
      }
    ]
  },

  onLoad(options) {
    this.loadPointsData();
  },

  // 加载积分数据
  loadPointsData() {
    wx.showLoading({ title: '加载中...' });
    
    // TODO: 从云函数获取积分数据
    setTimeout(() => {
      wx.hideLoading();
    }, 500);
  }
});

