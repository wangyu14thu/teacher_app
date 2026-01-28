// pages/case-detail/case-detail.js
const app = getApp()

Page({
  data: {
    grade: null,
    cases: [],
    teacherPoints: 0
  },

  onLoad(options) {
    const grade = JSON.parse(decodeURIComponent(options.grade))
    const teacherInfo = wx.getStorageSync('teacherInfo')
    
    this.setData({
      grade,
      cases: grade.cases,
      teacherPoints: teacherInfo ? teacherInfo.points || 0 : 0
    })
  },

  // 查看案例详情
  viewCase(e) {
    const index = e.currentTarget.dataset.index
    const caseItem = this.data.cases[index]

    wx.showModal({
      title: caseItem.title,
      content: `学科：${caseItem.subject}\n难度：${caseItem.difficulty}\n\n该案例需要15积分兑换\n当前积分：${this.data.teacherPoints}`,
      confirmText: '兑换',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          if (this.data.teacherPoints < 15) {
            wx.showToast({
              title: '积分不足',
              icon: 'none'
            })
            return
          }
          
          wx.showToast({
            title: '兑换成功',
            icon: 'success'
          })
        }
      }
    })
  }
})

