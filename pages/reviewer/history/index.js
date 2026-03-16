// pages/reviewer/history/index.js

Page({
  data: {
    typeOptions: ['全部类型', '项目审核', '学校审核'],
    typeIndex: 0,
    resultOptions: ['全部结果', '已通过', '已驳回'],
    resultIndex: 0,
    historyList: [],
    allHistory: []
  },

  onLoad() {
    this.loadHistory();
  },

  async loadHistory() {
    wx.showLoading({ title: '加载中...' });
    
    // TODO: 调用云函数获取审核历史
    const historyList = [
      {
        id: 'h001',
        type: 'project',
        title: '智慧校园改造计划',
        result: 'pass',
        reviewTime: '2026-01-31 15:30',
        opinion: '设计优秀，结构完整，准予发布'
      },
      {
        id: 'h002',
        type: 'project',
        title: '小小规划师',
        result: 'reject',
        reviewTime: '2026-01-31 14:20',
        opinion: '驱动性问题封闭或过于简单，无法驱动深度探究'
      },
      {
        id: 'h003',
        type: 'school',
        title: '翠微小学',
        result: 'pass',
        reviewTime: '2026-01-31 11:10',
        opinion: '信息核实无误，学校团队创建成功'
      }
    ];
    
    this.setData({ 
      allHistory: historyList,
      historyList
    });
    
    wx.hideLoading();
  },

  onTypeChange(e) {
    this.setData({ typeIndex: parseInt(e.detail.value) });
    this.applyFilters();
  },

  onResultChange(e) {
    this.setData({ resultIndex: parseInt(e.detail.value) });
    this.applyFilters();
  },

  applyFilters() {
    const { allHistory, typeIndex, resultIndex, typeOptions, resultOptions } = this.data;
    let filtered = allHistory;
    
    // 按类型筛选
    if (typeIndex > 0) {
      const typeMap = { 1: 'project', 2: 'school' };
      filtered = filtered.filter(item => item.type === typeMap[typeIndex]);
    }
    
    // 按结果筛选
    if (resultIndex > 0) {
      const resultMap = { 1: 'pass', 2: 'reject' };
      filtered = filtered.filter(item => item.result === resultMap[resultIndex]);
    }
    
    this.setData({ historyList: filtered });
  }
});

