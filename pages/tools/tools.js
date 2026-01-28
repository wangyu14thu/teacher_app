// pages/tools/tools.js
Page({
  data: {
    toolCategories: [
      {
        id: 'discussion',
        name: '讨论',
        icon: '💬',
        color: '#667eea',
        tools: [
          { id: 1, title: '"yes……and……"', subtitle: '团队有效讨论', points: 5 },
          { id: 2, title: '拼图法', subtitle: '团队有效讨论', points: 5 },
          { id: 3, title: '六顶思考帽', subtitle: '团队有效讨论', points: 5 },
          { id: 4, title: 'Think-Pair-Share', subtitle: '全班交流互动', points: 5 },
          { id: 5, title: '世界咖啡', subtitle: '全班交流互动', points: 5 },
          { id: 6, title: '鱼缸式讨论法', subtitle: '全班交流互动', points: 5 }
        ]
      },
      {
        id: 'outcome',
        name: '成果',
        icon: '🎯',
        color: '#f093fb',
        tools: [
          { id: 7, title: '三步成果概要', subtitle: '形成成果', points: 5 },
          { id: 8, title: '旋转木马', subtitle: '修订成果', points: 5 },
          { id: 9, title: '评委角色扮演法', subtitle: '修订成果', points: 5 },
          { id: 10, title: '常见成果分类表', subtitle: '教师用', points: 5 }
        ]
      },
      {
        id: 'management',
        name: '管理',
        icon: '📋',
        color: '#4facfe',
        tools: [
          { id: 11, title: '全脑优势模型', subtitle: '组建团队', points: 5 },
          { id: 12, title: '"好团队"画像', subtitle: '组建团队', points: 5 },
          { id: 13, title: '项目议会', subtitle: '团队项目管理', points: 5 },
          { id: 14, title: '个人/团队阶段汇报表', subtitle: '团队项目管理', points: 5 }
        ]
      },
      {
        id: 'evaluation',
        name: '评价',
        icon: '⭐',
        color: '#43e97b',
        tools: [
          { id: 15, title: '项目通行证', subtitle: '评估学生对本阶段所学内容的理解', points: 5 },
          { id: 16, title: '电梯游说', subtitle: '评估学生对本阶段所学内容的理解', points: 5 },
          { id: 17, title: '评价量规', subtitle: '正式评估支架', points: 5 }
        ]
      },
      {
        id: 'knowledge',
        name: '知识',
        icon: '📚',
        color: '#fa709a',
        tools: [
          { id: 18, title: '冷知识卡片', subtitle: '知识工具', points: 5 },
          { id: 19, title: '思维可视图', subtitle: '知识工具', points: 5 }
        ]
      }
    ]
  },

  onLoad() {
    // 页面加载
  },

  // 查看工具详情
  viewTool(e) {
    const categoryId = e.currentTarget.dataset.categoryId
    const toolId = e.currentTarget.dataset.toolId
    
    const category = this.data.toolCategories.find(c => c.id === categoryId)
    const tool = category.tools.find(t => t.id === toolId)
    
    wx.navigateTo({
      url: `/pages/tool-detail/tool-detail?tool=${encodeURIComponent(JSON.stringify(tool))}`
    })
  }
})

