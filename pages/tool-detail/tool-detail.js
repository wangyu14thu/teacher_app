// pages/tool-detail/tool-detail.js
const app = getApp()

Page({
  data: {
    tool: null,
    teacherPoints: 0,
    purchased: false
  },

  onLoad(options) {
    const tool = JSON.parse(decodeURIComponent(options.tool))
    const teacherInfo = wx.getStorageSync('teacherInfo')
    
    this.setData({
      tool,
      teacherPoints: teacherInfo ? teacherInfo.points || 0 : 0
    })
  },

  // 兑换工具
  purchaseTool() {
    if (this.data.purchased) {
      wx.showToast({
        title: '已兑换该工具',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '兑换工具',
      content: `需要消耗${this.data.tool.points}积分兑换《${this.data.tool.title}》，是否确认？\n\n当前积分：${this.data.teacherPoints}`,
      success: async (res) => {
        if (res.confirm) {
          if (this.data.teacherPoints < this.data.tool.points) {
            wx.showToast({
              title: '积分不足',
              icon: 'none'
            })
            return
          }

          wx.showLoading({ title: '兑换中...' })
          
          // TODO: 调用云函数
          setTimeout(() => {
            wx.hideLoading()
            wx.showToast({
              title: '兑换成功',
              icon: 'success'
            })
            
            this.setData({
              purchased: true,
              teacherPoints: this.data.teacherPoints - this.data.tool.points
            })
          }, 1000)
        }
      }
    })
  }
})

