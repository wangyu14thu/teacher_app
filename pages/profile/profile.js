// pages/profile/profile.js
const app = getApp()

Page({
  data: {
    teacherInfo: null,
    stats: {
      uploads: 0,
      purchased: 0
    }
  },

  onShow() {
    this.loadTeacherInfo()
    this.loadStats()
  },

  // 加载教师信息
  loadTeacherInfo() {
    const teacherInfo = wx.getStorageSync('teacherInfo')
    if (teacherInfo) {
      this.setData({
        teacherInfo
      })
    }
  },

  // 加载统计数据
  async loadStats() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'teacher',
        data: {
          action: 'getStats',
          openid: app.globalData.openid
        }
      })
      if (res.result.success) {
        this.setData({
          stats: res.result.stats
        })
      }
    } catch (err) {
      console.error('加载统计数据失败', err)
    }
  },

  // 编辑资料
  editProfile() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 我的项目
  goToMyProjects() {
    wx.navigateTo({
      url: '/pages/project-list/project-list'
    })
  },

  // 我的积分
  goToPointsRecord() {
    wx.showModal({
      title: '我的积分',
      content: '功能开发中，敬请期待！',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 创建学校团队
  createSchoolTeam() {
    wx.showModal({
      title: '创建学校团队',
      content: '功能开发中，敬请期待！',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 我的学校
  goToMySchool() {
    wx.showModal({
      title: '我的学校',
      content: '功能开发中，敬请期待！',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 管理后台
  goToAdminDashboard() {
    wx.showModal({
      title: '管理后台',
      content: '功能开发中，敬请期待！',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 联系我们
  contactUs() {
    wx.showModal({
      title: '联系我们',
      content: '电话：010-62846510\n手机：13681397661',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 积分说明
  showPointsInfo() {
    wx.showModal({
      title: '积分说明',
      content: '1. 发布项目并通过审核可获得积分\n2. 1积分=1元\n3. 积分可用于兑换资源',
      showCancel: false,
      confirmText: '我知道了'
    })
  }
})
