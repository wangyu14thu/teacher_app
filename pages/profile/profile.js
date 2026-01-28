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

  // 上传作品
  uploadWork() {
    wx.navigateTo({
      url: '/pages/upload/upload'
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
      content: '1. 上传项目并通过审核可获得积分\n2. 积分可用于兑换资料\n3. 不同资料需要不同积分数',
      showCancel: false,
      confirmText: '我知道了'
    })
  }
})
