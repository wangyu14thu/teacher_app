// pages/profile/profile.js
const app = getApp()

Page({
  data: {
    teacherInfo: {
      nickname: '张老师',
      subject: '数学',
      grade: '五年级',
      region: '北京市海淀区',
      points: 120,
      avatar: ''
    },
    isEditing: false,
    editData: {},
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
    } else {
      // 如果没有存储的信息，保存默认信息
      wx.setStorageSync('teacherInfo', this.data.teacherInfo)
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

  // 开始编辑
  startEdit() {
    this.setData({
      isEditing: true,
      editData: {
        nickname: this.data.teacherInfo.nickname,
        subject: this.data.teacherInfo.subject,
        grade: this.data.teacherInfo.grade,
        region: this.data.teacherInfo.region || ''
      }
    })
  },

  // 取消编辑
  cancelEdit() {
    this.setData({
      isEditing: false,
      editData: {}
    })
  },

  // 编辑输入
  onEditInput(e) {
    const { field } = e.currentTarget.dataset
    const { value } = e.detail
    this.setData({
      [`editData.${field}`]: value
    })
  },

  // 更换头像
  changeAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        
        // 更新头像预览
        this.setData({
          'teacherInfo.avatar': tempFilePath
        })
        
        wx.showToast({
          title: '头像已选择',
          icon: 'success'
        })
      }
    })
  },

  // 保存资料
  saveProfile() {
    const { editData, teacherInfo } = this.data
    
    // 验证必填项
    if (!editData.nickname || !editData.nickname.trim()) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '保存中...'
    })

    // TODO: 上传头像到云存储
    // TODO: 调用云函数更新用户信息

    setTimeout(() => {
      // 更新本地数据
      const updatedInfo = {
        ...teacherInfo,
        nickname: editData.nickname,
        subject: editData.subject,
        grade: editData.grade,
        region: editData.region
      }

      this.setData({
        teacherInfo: updatedInfo,
        isEditing: false,
        editData: {}
      })

      // 保存到本地存储
      wx.setStorageSync('teacherInfo', updatedInfo)

      wx.hideLoading()
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })
    }, 1000)
  },

  // 我的项目
  goToMyProjects() {
    wx.navigateTo({
      url: '/pages/project-list/project-list'
    })
  },

  // 我的积分
  goToPointsRecord() {
    wx.navigateTo({
      url: '/pages/points-record/points-record'
    })
  },

  // 创建学校团队
  createSchoolTeam() {
    wx.navigateTo({
      url: '/pages/school-team/school-team'
    })
  },

  // 我的学校
  goToMySchool() {
    // TODO: 检查用户是否已加入学校团队
    // 如果未加入，提示用户先加入或创建学校团队
    wx.navigateTo({
      url: '/pages/my-school/my-school'
    })
  },

  // 管理后台
  goToAdminDashboard() {
    // TODO: 检查用户是否有管理员权限
    // 只有学校管理员才能访问此页面
    const isAdmin = true; // 临时设置，实际应从用户数据中获取
    
    if (isAdmin) {
      wx.navigateTo({
        url: '/pages/admin-dashboard/admin-dashboard'
      })
    } else {
      wx.showModal({
        title: '权限不足',
        content: '只有学校管理员才能访问管理后台',
        showCancel: false,
        confirmText: '我知道了'
      })
    }
  },

  // 联系我们
  contactUs() {
    wx.navigateTo({
      url: '/pages/contact/contact'
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
