// pages/my-school/my-school.js
Page({
  data: {
    schoolInfo: {
      name: '翠微小学',
      memberCount: 45,
      totalQuota: 100,
      remainingQuota: 50
    },
    sortType: 'latest', // latest, likes, smart
    projects: [
      {
        id: 1,
        title: '《智慧校园改造计划》',
        grade: '5年级',
        subject: '综合',
        author: '张老师',
        likes: 28,
        comments: 12,
        uploadTime: '2天前',
        isHot: true,
        isNew: false
      },
      {
        id: 2,
        title: '《环保小卫士在行动》',
        grade: '4年级',
        subject: '科学',
        author: '李老师',
        likes: 35,
        comments: 18,
        uploadTime: '5天前',
        isHot: true,
        isNew: true
      },
      {
        id: 3,
        title: '《传统文化探秘》',
        grade: '6年级',
        subject: '语文',
        author: '王老师',
        likes: 22,
        comments: 9,
        uploadTime: '1周前',
        isHot: false,
        isNew: false
      }
    ]
  },

  onLoad(options) {
    this.loadSchoolInfo();
  },

  // 加载学校信息
  loadSchoolInfo() {
    wx.showLoading({ title: '加载中...' });
    
    // TODO: 从云函数获取学校信息和项目列表
    setTimeout(() => {
      wx.hideLoading();
    }, 500);
  },

  // 切换排序方式
  changeSortType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      sortType: type
    });
    
    // TODO: 根据排序类型重新加载项目列表
    this.loadProjectsBySort(type);
  },

  // 根据排序加载项目
  loadProjectsBySort(type) {
    wx.showLoading({ title: '加载中...' });
    
    let projects = [...this.data.projects];
    
    // 模拟不同排序
    switch(type) {
      case 'latest':
        // 按时间排序（已经是默认顺序）
        break;
      case 'likes':
        projects.sort((a, b) => b.likes - a.likes);
        break;
      case 'smart':
        // 智能推荐（综合考虑点赞、评论、新旧等）
        projects.sort((a, b) => {
          const scoreA = a.likes * 2 + a.comments * 3 + (a.isNew ? 50 : 0);
          const scoreB = b.likes * 2 + b.comments * 3 + (b.isNew ? 50 : 0);
          return scoreB - scoreA;
        });
        break;
    }
    
    setTimeout(() => {
      this.setData({
        projects
      });
      wx.hideLoading();
    }, 300);
  },

  // 查看项目
  viewProject(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/project-detail/project-detail?id=${id}`
    });
  },

  // 前往项目库
  goToCases() {
    wx.navigateTo({
      url: '/pages/cases/cases'
    });
  }
});

