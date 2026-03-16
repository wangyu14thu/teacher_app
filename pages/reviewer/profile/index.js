// pages/reviewer/profile/index.js

Page({
  data: {
    reviewerInfo: {},
    stats: {
      totalReviews: 0,
      todayReviews: 0,
      passRate: 0,
      avgTime: 0
    },
    tempCount: 0
  },

  onLoad() {
    this.loadReviewerInfo();
    this.loadStats();
  },

  onShow() {
    this.loadStats();
  },

  loadReviewerInfo() {
    const reviewerInfo = wx.getStorageSync('reviewer_info');
    if (reviewerInfo) {
      this.setData({ reviewerInfo });
    }
  },

  async loadStats() {
    // TODO: 调用云函数获取统计数据
    const stats = {
      totalReviews: 128,
      todayReviews: 15,
      passRate: 78,
      avgTime: 12
    };
    
    this.setData({ 
      stats,
      tempCount: 3
    });
  },

  navigateToHistory() {
    wx.navigateTo({
      url: '/pages/reviewer/history/index'
    });
  },

  navigateToTempTasks() {
    wx.navigateTo({
      url: '/pages/reviewer/temp-tasks/index'
    });
  },

  handleLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出审核工作台吗？',
      confirmText: '确定退出',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('reviewer_token');
          wx.removeStorageSync('reviewer_info');
          wx.reLaunch({
            url: '/pages/reviewer-login/reviewer-login'
          });
        }
      }
    });
  }
});

