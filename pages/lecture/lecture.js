// pages/lecture/lecture.js
Page({
  data: {
    
  },

  onLoad(options) {
    
  },

  // 讲座主题提示
  showThemeTip() {
    wx.showModal({
      title: '讲座主题',
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
