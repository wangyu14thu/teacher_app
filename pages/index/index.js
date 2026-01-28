// pages/index/index.js
const app = getApp()

Page({
  data: {
    teacherInfo: null,
    modules: [
      {
        id: 'theory',
        name: '专业理论',
        icon: '📚',
        desc: 'PBL理论知识体系',
        color: '#667eea',
        url: '/pages/theory/theory'
      },
      {
        id: 'cases',
        name: '项目案例',
        icon: '📝',
        desc: '各年级实践案例',
        color: '#f093fb',
        url: '/pages/cases/cases'
      },
      {
        id: 'tools',
        name: '实操工具',
        icon: '🛠',
        desc: '教学工具箱',
        color: '#4facfe',
        url: '/pages/tools/tools'
      },
      {
        id: 'training',
        name: '培训课程',
        icon: '🎓',
        desc: '专业研修提升',
        color: '#43e97b',
        url: '/pages/training/training'
      },
      {
        id: 'lecture',
        name: '专题讲座',
        icon: '🎤',
        desc: '专家分享交流',
        color: '#fa709a',
        url: '/pages/lecture/lecture'
      }
    ]
  },

  onLoad() {
    this.checkLogin()
  },

  onShow() {
    this.loadTeacherInfo()
  },

  // 检查登录状态
  checkLogin() {
    const teacherInfo = wx.getStorageSync('teacherInfo')
    if (!teacherInfo) {
      wx.redirectTo({
        url: '/pages/register/register'
      })
    }
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

  // 导航到模块页面
  navigateToModule(e) {
    const url = e.currentTarget.dataset.url
    wx.navigateTo({
      url
    })
  }
})

