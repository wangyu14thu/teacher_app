// pages/cases/cases.js
Page({
  data: {
    searchKeyword: '',
    selectedGrade: 0, // 默认选中1年级
    grades: [
      { id: 'grade1', name: '1年级' },
      { id: 'grade2', name: '2年级' },
      { id: 'grade3', name: '3年级' },
      { id: 'grade4', name: '4年级' },
      { id: 'grade5', name: '5年级' },
      { id: 'grade6', name: '6年级' }
    ],
    allProjects: [
      // 1年级
      { id: 1, title: '《我的时间我做主》', subject: '综合', grade: 1, gradeName: '1年级', price: 10, likes: 45, favorites: 23, comments: 12 },
      // 2年级
      { id: 2, title: '《校园测量工程》', subject: '数学', grade: 2, gradeName: '2年级', price: 10, likes: 67, favorites: 34, comments: 18 },
      { id: 3, title: '《我们的课间》', subject: '综合', grade: 2, gradeName: '2年级', price: 10, likes: 52, favorites: 28, comments: 15 },
      { id: 4, title: '《多功能墙壁》', subject: '综合', grade: 2, gradeName: '2年级', price: 10, likes: 38, favorites: 19, comments: 9 },
      // 3年级
      { id: 5, title: '《传承非遗文化——面塑》', subject: '艺术', grade: 3, gradeName: '3年级', price: 10, likes: 89, favorites: 45, comments: 23 },
      { id: 6, title: '《游历童话王国 创编童话故事》', subject: '语文', grade: 3, gradeName: '3年级', price: 10, likes: 76, favorites: 38, comments: 20 },
      { id: 7, title: '《寓言锦囊设计》', subject: '语文', grade: 3, gradeName: '3年级', price: 10, likes: 63, favorites: 31, comments: 17 },
      { id: 8, title: '《透过零食看健康生活》', subject: '科学', grade: 3, gradeName: '3年级', price: 10, likes: 54, favorites: 27, comments: 14 },
      // 4年级
      { id: 9, title: '《小车冲冲冲》', subject: '科学', grade: 4, gradeName: '4年级', price: 10, likes: 92, favorites: 48, comments: 25 },
      { id: 10, title: '《"神"话风云榜》', subject: '语文', grade: 4, gradeName: '4年级', price: 10, likes: 71, favorites: 36, comments: 19 },
      { id: 11, title: '《约在公益》', subject: '综合', grade: 4, gradeName: '4年级', price: 10, likes: 58, favorites: 29, comments: 16 },
      { id: 12, title: '《"碳"索小卫士》', subject: '科学', grade: 4, gradeName: '4年级', price: 10, likes: 47, favorites: 24, comments: 13 },
      { id: 13, title: '《景泰蓝元素扮靓美好校园》', subject: '艺术', grade: 4, gradeName: '4年级', price: 10, likes: 83, favorites: 42, comments: 22 },
      { id: 14, title: '《小小规划师——张镇大集》', subject: '综合', grade: 4, gradeName: '4年级', price: 10, likes: 65, favorites: 33, comments: 18 },
      { id: 15, title: '《传统文化博物馆——我们的端午文化长廊》', subject: '综合', grade: 4, gradeName: '4年级', price: 10, likes: 56, favorites: 28, comments: 15 },
      // 5年级
      { id: 16, title: '《我是小小胡同守护者》', subject: '综合', grade: 5, gradeName: '5年级', price: 10, likes: 95, favorites: 50, comments: 26 },
      { id: 17, title: '《见证非遗：探寻北京中轴线》', subject: '综合', grade: 5, gradeName: '5年级', price: 10, likes: 103, favorites: 55, comments: 29 },
      { id: 18, title: '《Festivals Around the Corner》', subject: '英语', grade: 5, gradeName: '5年级', price: 10, likes: 78, favorites: 39, comments: 21 },
      { id: 19, title: '《守护民间故事》', subject: '语文', grade: 5, gradeName: '5年级', price: 10, likes: 69, favorites: 35, comments: 18 },
      { id: 20, title: '《"活力课间"器材更新与共享计划》', subject: '综合', grade: 5, gradeName: '5年级', price: 10, likes: 61, favorites: 31, comments: 17 },
      { id: 21, title: '《解码爱国能量》', subject: '综合', grade: 5, gradeName: '5年级', price: 10, likes: 52, favorites: 26, comments: 14 },
      { id: 22, title: '《飞跃世界》', subject: '综合', grade: 5, gradeName: '5年级', price: 10, likes: 88, favorites: 44, comments: 23 },
      { id: 23, title: '《热辣滚烫体质健康》', subject: '体育', grade: 5, gradeName: '5年级', price: 10, likes: 74, favorites: 37, comments: 20 },
      { id: 24, title: '《节水小先锋在行动》', subject: '科学', grade: 5, gradeName: '5年级', price: 10, likes: 59, favorites: 30, comments: 16 },
      { id: 25, title: '《小胖墩"瘦身计》', subject: '体育', grade: 5, gradeName: '5年级', price: 10, likes: 66, favorites: 33, comments: 18 },
      { id: 26, title: '《课间游戏嘉年华》', subject: '综合', grade: 5, gradeName: '5年级', price: 10, likes: 81, favorites: 41, comments: 22 },
      // 6年级
      { id: 27, title: '《梦想起航站 校园初体验》', subject: '综合', grade: 6, gradeName: '6年级', price: 10, likes: 97, favorites: 51, comments: 27 },
      { id: 28, title: '《世界文学宝库的"鉴宝人"》', subject: '语文', grade: 6, gradeName: '6年级', price: 10, likes: 86, favorites: 43, comments: 23 },
      { id: 29, title: '《校园手绘师》', subject: '艺术', grade: 6, gradeName: '6年级', price: 10, likes: 72, favorites: 36, comments: 19 },
      { id: 30, title: '《消失的斑马线》', subject: '综合', grade: 6, gradeName: '6年级', price: 10, likes: 64, favorites: 32, comments: 17 },
      { id: 31, title: '《穿在身上的"班级名片"》', subject: '综合', grade: 6, gradeName: '6年级', price: 10, likes: 55, favorites: 28, comments: 15 },
      { id: 32, title: '《潮白河我守护》', subject: '科学', grade: 6, gradeName: '6年级', price: 10, likes: 79, favorites: 40, comments: 21 },
      { id: 33, title: '《我为"校园生物"代言》', subject: '科学', grade: 6, gradeName: '6年级', price: 10, likes: 68, favorites: 34, comments: 18 },
      { id: 34, title: '《守护地球》', subject: '综合', grade: 6, gradeName: '6年级', price: 10, likes: 91, favorites: 46, comments: 24 },
      { id: 35, title: '《我们的小中河》', subject: '科学', grade: 6, gradeName: '6年级', price: 10, likes: 60, favorites: 30, comments: 16 },
      { id: 36, title: '《"遗失的美好"——设计校园失物招领处》', subject: '综合', grade: 6, gradeName: '6年级', price: 10, likes: 73, favorites: 37, comments: 20 }
    ],
    currentProjects: []
  },

  onLoad(options) {
    // 检查是否有搜索参数
    if (options.action === 'search') {
      // 聚焦搜索框
    }
    
    // 默认显示1年级项目
    this.filterProjects()
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
  },

  // 清空搜索
  clearSearch() {
    this.setData({
      searchKeyword: ''
    })
    this.filterProjects()
  },

  // 执行搜索
  doSearch() {
    this.filterProjects()
  },

  // 选择年级
  selectGrade(e) {
    const index = e.currentTarget.dataset.index
    this.setData({
      selectedGrade: index
    })
    this.filterProjects()
  },

  // 过滤项目
  filterProjects() {
    const { searchKeyword, selectedGrade, allProjects } = this.data
    let filtered = allProjects

    // 按年级过滤
    filtered = filtered.filter(p => p.grade === selectedGrade + 1)

    // 按关键词过滤
    if (searchKeyword.trim()) {
      filtered = filtered.filter(p => 
        p.title.includes(searchKeyword) || 
        p.subject.includes(searchKeyword)
      )
    }

    this.setData({
      currentProjects: filtered
    })
  },

  // 查看项目详情
  viewProject(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/project-detail/project-detail?id=${id}`
    })
  },

  // 跳转到热门推荐
  goToHotProjects() {
    wx.navigateTo({
      url: '/pages/hot-projects/hot-projects'
    })
  }
})
