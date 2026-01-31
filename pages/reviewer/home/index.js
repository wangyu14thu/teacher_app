// pages/reviewer/home/index.js

/**
 * 审核员工作台首页
 * 这是审核员登录后的主页面
 */

Page({
  data: {
    reviewerInfo: {
      name: '审核员',
      department: '内容审核部'
    },
    pendingProjects: 23,
    pendingSchools: 8
  },

  onLoad(options) {
    // 检查登录态
    this.checkLoginStatus();
    // 加载审核员信息
    this.loadReviewerInfo();
  },

  onShow() {
    // 每次显示时刷新数据
    this.refreshData();
  },

  /**
   * 检查审核员登录态
   */
  checkLoginStatus() {
    const reviewerToken = wx.getStorageSync('reviewer_token');
    const reviewerInfo = wx.getStorageSync('reviewer_info');
    
    if (!reviewerToken || !reviewerInfo) {
      // 未登录，跳转到登录页
      wx.reLaunch({
        url: '/pages/reviewer-login/reviewer-login'
      });
      return false;
    }
    
    return true;
  },

  /**
   * 加载审核员信息
   */
  loadReviewerInfo() {
    const reviewerInfo = wx.getStorageSync('reviewer_info');
    if (reviewerInfo) {
      this.setData({
        reviewerInfo
      });
    }
  },

  /**
   * 刷新数据
   */
  refreshData() {
    // TODO: 调用云函数获取待审核数量
    // 这里使用模拟数据
    this.setData({
      pendingProjects: Math.floor(Math.random() * 30),
      pendingSchools: Math.floor(Math.random() * 10)
    });
  },

  /**
   * 导航到项目审核
   */
  navigateToProjectReview() {
    wx.showToast({
      title: '项目审核功能开发中',
      icon: 'none'
    });
    // TODO: 导航到项目审核页面
    // wx.navigateTo({
    //   url: '/pages/reviewer/project-review/index'
    // });
  },

  /**
   * 导航到学校审核
   */
  navigateToSchoolReview() {
    wx.showToast({
      title: '学校审核功能开发中',
      icon: 'none'
    });
    // TODO: 导航到学校审核页面
    // wx.navigateTo({
    //   url: '/pages/reviewer/school-review/index'
    // });
  },

  /**
   * 导航到用户管理
   */
  navigateToUserManage() {
    wx.showToast({
      title: '用户管理功能开发中',
      icon: 'none'
    });
  },

  /**
   * 导航到数据报表
   */
  navigateToReports() {
    wx.showToast({
      title: '数据报表功能开发中',
      icon: 'none'
    });
  },

  /**
   * 处理退出登录
   */
  handleLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出审核工作台吗？',
      confirmText: '确定退出',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          this.doLogout();
        }
      }
    });
  },

  /**
   * 执行退出登录
   */
  doLogout() {
    wx.showLoading({
      title: '退出中...',
      mask: true
    });

    // 清除审核员登录态
    wx.removeStorageSync('reviewer_token');
    wx.removeStorageSync('reviewer_info');

    setTimeout(() => {
      wx.hideLoading();
      
      wx.showToast({
        title: '已退出登录',
        icon: 'success',
        duration: 1500
      });

      // 跳转回登录页
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/reviewer-login/reviewer-login'
        });
      }, 1500);
    }, 500);
  }
});

