// pages/my-projects/my-projects.js
Page({
  data: {
    currentTab: 'design',
    myDesignedProjects: [
      {
        id: 1,
        title: '《智慧校园改造计划》',
        grade: '5年级',
        subject: '综合',
        status: 'published',
        statusText: '已发布',
        updateTime: '2天前'
      },
      {
        id: 2,
        title: '《环保小卫士在行动》',
        grade: '4年级',
        subject: '科学',
        status: 'reviewing',
        statusText: '审核中',
        updateTime: '5天前'
      },
      {
        id: 3,
        title: '《传统文化探秘》',
        grade: '6年级',
        subject: '语文',
        status: 'draft',
        statusText: '草稿',
        updateTime: '1周前'
      }
    ],
    myPurchasedProjects: [
      {
        id: 101,
        title: '《小车冲冲冲》',
        grade: '4年级',
        subject: '科学',
        price: 10,
        purchaseTime: '2024-01-15'
      },
      {
        id: 102,
        title: '《见证非遗：探寻北京中轴线》',
        grade: '5年级',
        subject: '综合',
        price: 10,
        purchaseTime: '2024-01-10'
      }
    ],
    myImplementations: [
      {
        id: 1,
        title: '《智慧校园改造计划》',
        grade: '5年级',
        subject: '综合',
        progress: '启动阶段',
        coverImage: '/images/placeholder.png',
        updateTime: '昨天'
      }
    ]
  },

  onLoad(options) {
    // 检查是否有指定tab参数
    if (options.tab) {
      this.setData({
        currentTab: options.tab
      })
    }
    
    this.loadMyProjects()
  },

  // 加载我的项目
  loadMyProjects() {
    // TODO: 从云函数获取数据
    // 暂时使用示例数据
  },

  // 切换Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      currentTab: tab
    })
  },

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
  },

  // 前往项目案例库
  goToCases() {
    wx.navigateTo({
      url: '/pages/cases/cases'
    })
  },

  // 查看我的项目
  viewMyProject(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/project-design/project-design?id=${id}&mode=edit`
    })
  },

  // 查看购买的项目
  viewPurchasedProject(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/project-detail/project-detail?id=${id}`
    })
  },

  // 查看实施记录
  viewImplementation(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/project-implementation/project-implementation?id=${id}&mode=view`
    })
  },

  // 下载项目
  downloadProject(e) {
    const id = e.currentTarget.dataset.id
    
    wx.showLoading({
      title: '准备下载...'
    })

    setTimeout(() => {
      wx.hideLoading()
      wx.showModal({
        title: '下载项目',
        content: '项目已保存到"我设计的"列表中，您可以进行编辑和实施记录。',
        showCancel: false,
        confirmText: '我知道了'
      })
    }, 1000)

    // TODO: 调用云函数下载项目文件
  },

  // 阻止事件冒泡
  preventBubble() {
    // 空函数，用于阻止事件冒泡
  }
})

