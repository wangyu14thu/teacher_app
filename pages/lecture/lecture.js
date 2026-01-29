// pages/lecture/lecture.js
Page({
  data: {
    
  },

  onLoad(options) {
    
  },

  // VIP权益提示
  showVIPTip() {
    wx.showModal({
      title: 'VIP权益专属',
      content: '功能开发中，敬请期待！',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 下期预告提示
  showPreviewTip() {
    wx.showModal({
      title: '下期预告',
      content: '功能开发中，精彩内容即将上线，敬请期待！',
      showCancel: false,
      confirmText: '知道了'
    })
  }
})
