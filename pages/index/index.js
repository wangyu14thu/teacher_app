// pages/index/index.js
Page({
  data: {
    totalCases: 36 // 总案例数量
  },

  onLoad(options) {
    // 页面加载时可以获取用户信息等
    this.loadUserInfo()
  },

  onShow() {
    // 页面显示时刷新数据
  },

  loadUserInfo() {
    const teacherInfo = wx.getStorageSync('teacherInfo')
    if (!teacherInfo) {
      // 如果没有用户信息，跳转到注册页
      wx.redirectTo({
        url: '/pages/register/register'
      })
    }
  },

  // 跳转到SVIP工作坊
  goToVIPWorkshop() {
    wx.navigateTo({
      url: '/pages/swiper-vip/swiper-vip'
    })
  },

  // 跳转到专题讲座
  navigateToLecture() {
    wx.navigateTo({
      url: '/pages/lecture/lecture'
    })
  },

  // 跳转到项目案例
  navigateToCases() {
    wx.navigateTo({
      url: '/pages/cases/cases'
    })
  },

  // 跳转到我的项目
  navigateToMyProjects() {
    wx.navigateTo({
      url: '/pages/my-projects/my-projects'
    })
  },

  // 快速设计
  quickDesign() {
    wx.navigateTo({
      url: '/pages/my-projects/my-projects?tab=design'
    })
  },

  // 快速搜索
  quickSearch() {
    wx.navigateTo({
      url: '/pages/cases/cases?action=search'
    })
  },

  // 热门推荐
  quickHot() {
    wx.navigateTo({
      url: '/pages/hot-projects/hot-projects'
    })
  },

  // 我的积分
  quickPoints() {
    wx.switchTab({
      url: '/pages/profile/profile'
    })
  }
})
