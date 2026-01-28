// pages/theory-detail/theory-detail.js
const app = getApp()

Page({
  data: {
    category: null,
    materials: [],
    teacherPoints: 0
  },

  onLoad(options) {
    const category = JSON.parse(decodeURIComponent(options.category))
    const teacherInfo = wx.getStorageSync('teacherInfo')
    
    this.setData({
      category,
      materials: category.materials,
      teacherPoints: teacherInfo ? teacherInfo.points || 0 : 0
    })
  },

  // 购买/兑换资料
  purchaseMaterial(e) {
    const index = e.currentTarget.dataset.index
    const material = this.data.materials[index]

    if (material.purchased) {
      wx.showToast({
        title: '已购买过该资料',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '兑换资料',
      content: `需要消耗${material.points}积分兑换《${material.title}》，是否确认？\n\n当前积分：${this.data.teacherPoints}`,
      success: async (res) => {
        if (res.confirm) {
          if (this.data.teacherPoints < material.points) {
            wx.showToast({
              title: '积分不足',
              icon: 'none'
            })
            return
          }

          // TODO: 调用云函数进行兑换
          wx.showLoading({ title: '兑换中...' })
          
          try {
            // 模拟兑换
            setTimeout(() => {
              wx.hideLoading()
              wx.showToast({
                title: '兑换成功',
                icon: 'success'
              })
              
              // 更新本地状态
              const materials = this.data.materials
              materials[index].purchased = true
              this.setData({
                materials,
                teacherPoints: this.data.teacherPoints - material.points
              })
            }, 1000)
          } catch (err) {
            wx.hideLoading()
            wx.showToast({
              title: '兑换失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 下载资料
  downloadMaterial(e) {
    const index = e.currentTarget.dataset.index
    const material = this.data.materials[index]

    if (!material.purchased) {
      wx.showToast({
        title: '请先兑换该资料',
        icon: 'none'
      })
      return
    }

    wx.showToast({
      title: '下载功能开发中',
      icon: 'none'
    })
  }
})

