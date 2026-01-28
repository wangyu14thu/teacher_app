// pages/register/register.js
const app = getApp()

Page({
  data: {
    formData: {
      nickname: '',
      grade: '',
      subject: '',
      region: [],
      phone: ''
    },
    gradeList: [
      '一年级', '二年级', '三年级', '四年级', '五年级', '六年级',
      '初一', '初二', '初三',
      '高一', '高二', '高三'
    ],
    gradeIndex: -1,
    subjectList: [
      '语文', '数学', '英语', '物理', '化学', '生物',
      '历史', '地理', '政治', '音乐', '体育', '美术',
      '信息技术', '通用技术', '科学', '综合实践', '其他'
    ],
    subjectIndex: -1,
    canSubmit: false
  },

  onLoad(options) {
    // 检查是否已注册
    const teacherInfo = wx.getStorageSync('teacherInfo')
    if (teacherInfo) {
      wx.switchTab({
        url: '/pages/index/index'
      })
    }
  },

  // 昵称输入
  onNicknameInput(e) {
    this.setData({
      'formData.nickname': e.detail.value
    }, () => {
      this.checkCanSubmit()
    })
  },

  // 年级选择
  onGradeChange(e) {
    const index = e.detail.value
    this.setData({
      gradeIndex: index,
      'formData.grade': this.data.gradeList[index]
    }, () => {
      this.checkCanSubmit()
    })
  },

  // 学科选择
  onSubjectChange(e) {
    const index = e.detail.value
    this.setData({
      subjectIndex: index,
      'formData.subject': this.data.subjectList[index]
    }, () => {
      this.checkCanSubmit()
    })
  },

  // 地区选择
  onRegionChange(e) {
    this.setData({
      'formData.region': e.detail.value
    }, () => {
      this.checkCanSubmit()
    })
  },

  // 手机号输入
  onPhoneInput(e) {
    this.setData({
      'formData.phone': e.detail.value
    }, () => {
      this.checkCanSubmit()
    })
  },

  // 检查是否可以提交
  checkCanSubmit() {
    const { nickname, grade, subject, region, phone } = this.data.formData
    const canSubmit = nickname.trim() !== '' &&
                     grade !== '' &&
                     subject !== '' &&
                     region.length > 0 &&
                     phone.length === 11
    this.setData({ canSubmit })
  },

  // 提交注册
  async submitRegister() {
    if (!this.data.canSubmit) {
      return
    }

    // 验证手机号
    const phoneReg = /^1[3-9]\d{9}$/
    if (!phoneReg.test(this.data.formData.phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '注册中...',
      mask: true
    })

    try {
      // 获取 openid
      const loginRes = await wx.cloud.callFunction({
        name: 'login'
      })
      const openid = loginRes.result.openid

      // 调用注册云函数
      const res = await wx.cloud.callFunction({
        name: 'teacher',
        data: {
          action: 'register',
          openid,
          ...this.data.formData,
          points: 0, // 初始积分
          registerTime: new Date().getTime()
        }
      })

      wx.hideLoading()

      if (res.result.success) {
        const teacherInfo = {
          ...this.data.formData,
          openid,
          points: 0,
          region: this.data.formData.region.join(' ')
        }

        wx.setStorageSync('teacherInfo', teacherInfo)
        app.globalData.teacherInfo = teacherInfo
        app.globalData.openid = openid

        wx.showToast({
          title: '注册成功',
          icon: 'success'
        })

        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          })
        }, 1500)
      } else {
        throw new Error(res.result.message || '注册失败')
      }
    } catch (err) {
      wx.hideLoading()
      console.error('注册失败', err)
      wx.showToast({
        title: '注册失败，请重试',
        icon: 'none'
      })
    }
  }
})

