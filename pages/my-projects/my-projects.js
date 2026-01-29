// pages/my-projects/my-projects.js
Page({
  data: {},

  // 前往项目设计页
  goToDesign() {
    wx.navigateTo({
      url: '/pages/project-design/project-design'
    })
  },

  // 前往项目实施页
  goToImplement() {
    wx.navigateTo({
      url: '/pages/project-implementation/project-implementation'
    })
  }
})

