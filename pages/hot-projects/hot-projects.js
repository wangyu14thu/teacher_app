// pages/hot-projects/hot-projects.js
Page({
  data: {
    sortType: 'hot', // likes, favorites, hot
    allProjects: [],
    hotProjects: []
  },

  onLoad(options) {
    this.loadAllProjects()
    this.sortProjects()
  },

  // 加载所有项目（示例数据，实际应从云函数获取）
  loadAllProjects() {
    const projects = [
      { id: 1, title: '《我的时间我做主》', subject: '综合', grade: 1, gradeName: '1年级', price: 10, likes: 45, favorites: 23, comments: 12 },
      { id: 17, title: '《见证非遗：探寻北京中轴线》', subject: '综合', grade: 5, gradeName: '5年级', price: 10, likes: 103, favorites: 55, comments: 29 },
      { id: 27, title: '《梦想起航站 校园初体验》', subject: '综合', grade: 6, gradeName: '6年级', price: 10, likes: 97, favorites: 51, comments: 27 },
      { id: 16, title: '《我是小小胡同守护者》', subject: '综合', grade: 5, gradeName: '5年级', price: 10, likes: 95, favorites: 50, comments: 26 },
      { id: 9, title: '《小车冲冲冲》', subject: '科学', grade: 4, gradeName: '4年级', price: 10, likes: 92, favorites: 48, comments: 25 },
      { id: 34, title: '《守护地球》', subject: '综合', grade: 6, gradeName: '6年级', price: 10, likes: 91, favorites: 46, comments: 24 },
      { id: 5, title: '《传承非遗文化——面塑》', subject: '艺术', grade: 3, gradeName: '3年级', price: 10, likes: 89, favorites: 45, comments: 23 },
      { id: 22, title: '《飞跃世界》', subject: '综合', grade: 5, gradeName: '5年级', price: 10, likes: 88, favorites: 44, comments: 23 },
      { id: 28, title: '《世界文学宝库的"鉴宝人"》', subject: '语文', grade: 6, gradeName: '6年级', price: 10, likes: 86, favorites: 43, comments: 23 },
      { id: 13, title: '《景泰蓝元素扮靓美好校园》', subject: '艺术', grade: 4, gradeName: '4年级', price: 10, likes: 83, favorites: 42, comments: 22 },
      { id: 26, title: '《课间游戏嘉年华》', subject: '综合', grade: 5, gradeName: '5年级', price: 10, likes: 81, favorites: 41, comments: 22 },
      { id: 32, title: '《潮白河我守护》', subject: '科学', grade: 6, gradeName: '6年级', price: 10, likes: 79, favorites: 40, comments: 21 },
      { id: 18, title: '《Festivals Around the Corner》', subject: '英语', grade: 5, gradeName: '5年级', price: 10, likes: 78, favorites: 39, comments: 21 },
      { id: 6, title: '《游历童话王国 创编童话故事》', subject: '语文', grade: 3, gradeName: '3年级', price: 10, likes: 76, favorites: 38, comments: 20 },
      { id: 23, title: '《热辣滚烫体质健康》', subject: '体育', grade: 5, gradeName: '5年级', price: 10, likes: 74, favorites: 37, comments: 20 },
    ]

    // 计算热度分数（点赞*2 + 收藏*3 + 评论*5）
    projects.forEach(p => {
      p.hotScore = p.likes * 2 + p.favorites * 3 + p.comments * 5
    })

    this.setData({
      allProjects: projects
    })
  },

  // 改变排序方式
  changeSortType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      sortType: type
    })
    this.sortProjects()
  },

  // 排序项目
  sortProjects() {
    const { sortType, allProjects } = this.data
    let sorted = [...allProjects]

    switch (sortType) {
      case 'likes':
        sorted.sort((a, b) => b.likes - a.likes)
        break
      case 'favorites':
        sorted.sort((a, b) => b.favorites - a.favorites)
        break
      case 'hot':
        sorted.sort((a, b) => b.hotScore - a.hotScore)
        break
    }

    this.setData({
      hotProjects: sorted
    })
  },

  // 查看项目详情
  viewProject(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/project-detail/project-detail?id=${id}`
    })
  }
})

