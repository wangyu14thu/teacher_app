// pages/message/message.js
Page({
  data: {
    messages: []
  },

  onLoad() {
    this.loadMessages()
  },

  loadMessages() {
    // 这里可以加载消息列表
    // 暂时显示空状态
    this.setData({
      messages: []
    })
  }
})

