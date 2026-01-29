// pages/project-list/project-list.js
Page({
  data: {
    currentTab: 'designed',
    myDesignedProjects: [],
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
    ]
  },

  onLoad(options) {
    // 检查是否有指定tab参数
    if (options.tab) {
      this.setData({
        currentTab: options.tab
      });
    }
    
    this.loadMyProjects();
  },

  onShow() {
    // 页面显示时重新加载数据，确保保存后能看到最新的项目
    this.loadMyProjects();
  },

  // 加载我的项目
  loadMyProjects() {
    wx.showLoading({ title: '加载中...' });
    
    // 从本地存储加载项目数据
    const myDesignedProjects = wx.getStorageSync('myDesignedProjects') || [];
    
    this.setData({
      myDesignedProjects
    });
    
    setTimeout(() => {
      wx.hideLoading();
    }, 300);
  },

  // 切换Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      currentTab: tab
    });
  },

  // 查看我设计的项目
  viewMyProject(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/project-view/project-view?id=${id}`
    });
  },

  // 查看购买的项目
  viewPurchasedProject(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/project-detail/project-detail?id=${id}`
    });
  },

  // 下载项目
  downloadProject(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showLoading({ title: '准备下载...' });

    // TODO: 调用云函数下载项目文件
    setTimeout(() => {
      wx.hideLoading();
      wx.showModal({
        title: '下载成功',
        content: '项目已保存到"我设计的"列表中，您可以进行编辑和实施记录。',
        showCancel: false,
        confirmText: '我知道了'
      });
    }, 1000);
  },

  // 删除项目
  deleteProject(e) {
    const id = e.currentTarget.dataset.id;
    const project = this.data.myDesignedProjects.find(p => p.id === id);
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除项目"${project.title}"吗？删除后无法恢复。`,
      confirmText: '删除',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          
          // 从本地存储删除
          const myDesignedProjects = this.data.myDesignedProjects.filter(p => p.id !== id);
          wx.setStorageSync('myDesignedProjects', myDesignedProjects);
          
          setTimeout(() => {
            this.setData({
              myDesignedProjects
            });
            wx.hideLoading();
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
          }, 300);
        }
      }
    });
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  }
});

