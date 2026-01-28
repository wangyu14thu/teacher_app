// pages/cases/cases.js
Page({
  data: {
    grades: [
      {
        id: 'grade1',
        name: '1年级',
        icon: '1️⃣',
        color: '#667eea',
        cases: [
          { id: 1, title: '《我的时间我做主》', subject: '综合', difficulty: '基础' }
        ]
      },
      {
        id: 'grade2',
        name: '2年级',
        icon: '2️⃣',
        color: '#f093fb',
        cases: [
          { id: 2, title: '《校园测量工程》', subject: '数学', difficulty: '基础' },
          { id: 3, title: '《我们的课间》', subject: '综合', difficulty: '基础' },
          { id: 4, title: '《多功能墙壁》', subject: '综合', difficulty: '进阶' }
        ]
      },
      {
        id: 'grade3',
        name: '3年级',
        icon: '3️⃣',
        color: '#4facfe',
        cases: [
          { id: 5, title: '《传承非遗文化——面塑》', subject: '艺术', difficulty: '基础' },
          { id: 6, title: '《游历童话王国 创编童话故事》', subject: '语文', difficulty: '基础' },
          { id: 7, title: '《寓言锦囊设计》', subject: '语文', difficulty: '进阶' },
          { id: 8, title: '《透过零食看健康生活》', subject: '科学', difficulty: '进阶' }
        ]
      },
      {
        id: 'grade4',
        name: '4年级',
        icon: '4️⃣',
        color: '#43e97b',
        cases: [
          { id: 9, title: '《小车冲冲冲》', subject: '科学', difficulty: '进阶' },
          { id: 10, title: '《"神"话风云榜》', subject: '语文', difficulty: '基础' },
          { id: 11, title: '《约在公益》', subject: '综合', difficulty: '进阶' },
          { id: 12, title: '《"碳"索小卫士》', subject: '科学', difficulty: '进阶' },
          { id: 13, title: '《景泰蓝元素扮靓美好校园》', subject: '艺术', difficulty: '高级' },
          { id: 14, title: '《小小规划师——张镇大集》', subject: '综合', difficulty: '高级' },
          { id: 15, title: '《传统文化博物馆——我们的端午文化长廊》', subject: '综合', difficulty: '进阶' }
        ]
      },
      {
        id: 'grade5',
        name: '5年级',
        icon: '5️⃣',
        color: '#fa709a',
        cases: [
          { id: 16, title: '《我是小小胡同守护者》', subject: '综合', difficulty: '进阶' },
          { id: 17, title: '《见证非遗：探寻北京中轴线》', subject: '综合', difficulty: '高级' },
          { id: 18, title: '《Festivals Around the Corner》', subject: '英语', difficulty: '进阶' },
          { id: 19, title: '《守护民间故事》', subject: '语文', difficulty: '基础' },
          { id: 20, title: '《"活力课间"器材更新与共享计划》', subject: '综合', difficulty: '进阶' },
          { id: 21, title: '《解码爱国能量》', subject: '综合', difficulty: '进阶' },
          { id: 22, title: '《飞跃世界》', subject: '综合', difficulty: '高级' },
          { id: 23, title: '《热辣滚烫体质健康》', subject: '体育', difficulty: '基础' },
          { id: 24, title: '《节水小先锋在行动》', subject: '科学', difficulty: '基础' },
          { id: 25, title: '《小胖墩"瘦身计》', subject: '体育', difficulty: '进阶' },
          { id: 26, title: '《课间游戏嘉年华》', subject: '综合', difficulty: '基础' }
        ]
      },
      {
        id: 'grade6',
        name: '6年级',
        icon: '6️⃣',
        color: '#fe5196',
        cases: [
          { id: 27, title: '《梦想起航站 校园初体验》', subject: '综合', difficulty: '基础' },
          { id: 28, title: '《世界文学宝库的"鉴宝人"》', subject: '语文', difficulty: '高级' },
          { id: 29, title: '《校园手绘师》', subject: '艺术', difficulty: '进阶' },
          { id: 30, title: '《消失的斑马线》', subject: '综合', difficulty: '进阶' },
          { id: 31, title: '《穿在身上的"班级名片"》', subject: '综合', difficulty: '基础' },
          { id: 32, title: '《潮白河我守护》', subject: '科学', difficulty: '进阶' },
          { id: 33, title: '《我为"校园生物"代言》', subject: '科学', difficulty: '进阶' },
          { id: 34, title: '《守护地球》', subject: '综合', difficulty: '高级' },
          { id: 35, title: '《我们的小中河》', subject: '科学', difficulty: '进阶' },
          { id: 36, title: '《"遗失的美好"——设计校园失物招领处》', subject: '综合', difficulty: '进阶' }
        ]
      }
    ]
  },

  onLoad() {
    // 页面加载
  },

  // 查看年级案例
  viewGrade(e) {
    const gradeId = e.currentTarget.dataset.id
    const grade = this.data.grades.find(g => g.id === gradeId)
    
    wx.navigateTo({
      url: `/pages/case-detail/case-detail?grade=${encodeURIComponent(JSON.stringify(grade))}`
    })
  }
})

