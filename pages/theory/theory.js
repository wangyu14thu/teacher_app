// pages/theory/theory.js
Page({
  data: {
    categories: [
      {
        id: 'pbl',
        name: 'PBL项目式学习',
        icon: '📘',
        color: '#667eea',
        materials: [
          { id: 1, title: '课件及讲义 1', type: 'pdf', points: 10, purchased: false },
          { id: 2, title: '课件及讲义 2', type: 'pdf', points: 10, purchased: false },
          { id: 3, title: '课件及讲义 3', type: 'pdf', points: 10, purchased: false },
          { id: 4, title: '课件及讲义 4', type: 'pdf', points: 10, purchased: false },
          { id: 5, title: '设计评价标准', type: 'doc', points: 15, purchased: false },
          { id: 6, title: '实施评价标准', type: 'doc', points: 15, purchased: false }
        ]
      },
      {
        id: 'interdisciplinary',
        name: '跨学科主题学习',
        icon: '📗',
        color: '#43e97b',
        materials: [
          { id: 7, title: '跨学科主题学习教材', type: 'pdf', points: 20, purchased: false }
        ]
      }
    ]
  },

  onLoad() {
    this.loadPurchaseStatus()
  },

  // 加载购买状态
  async loadPurchaseStatus() {
    // TODO: 从云端加载用户的购买记录
    // 暂时先用本地数据
  },

  // 查看分类详情
  viewCategory(e) {
    const categoryId = e.currentTarget.dataset.id
    const category = this.data.categories.find(c => c.id === categoryId)
    
    wx.navigateTo({
      url: `/pages/theory-detail/theory-detail?category=${encodeURIComponent(JSON.stringify(category))}`
    })
  }
})

