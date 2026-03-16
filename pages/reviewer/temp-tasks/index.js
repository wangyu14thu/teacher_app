// pages/reviewer/temp-tasks/index.js

Page({
  data: {
    tempTasks: []
  },

  onLoad() {
    this.loadTempTasks();
  },

  onShow() {
    this.loadTempTasks();
  },

  async loadTempTasks() {
    // TODO: 从云端或本地加载暂存任务
    const tempTasks = [
      {
        id: 'proj_001',
        type: 'project',
        title: '智慧校园改造计划',
        savedTime: '2小时前'
      },
      {
        id: 'proj_002',
        type: 'project',
        title: '小小规划师',
        savedTime: '1天前'
      },
      {
        id: 'school_001',
        type: 'school',
        title: '实验小学',
        savedTime: '3小时前'
      }
    ];
    
    this.setData({ tempTasks });
  },

  continueReview(e) {
    const { id, type } = e.currentTarget.dataset;
    
    if (type === 'project') {
      wx.navigateTo({
        url: `/pages/reviewer/project-detail/index?id=${id}`
      });
    } else {
      wx.navigateTo({
        url: `/pages/reviewer/school-detail/index?id=${id}`
      });
    }
  },

  deleteTask(e) {
    const { id } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '删除暂存',
      content: '确定要删除这个暂存任务吗？',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          // TODO: 调用云函数删除
          const tempTasks = this.data.tempTasks.filter(item => item.id !== id);
          this.setData({ tempTasks });
          
          wx.showToast({
            title: '已删除',
            icon: 'success'
          });
        }
      }
    });
  },

  preventBubble() {
    return false;
  }
});

