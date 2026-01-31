// pages/reviewer/home/index.js

/**
 * 审核员工作台首页 - 任务看板
 */

Page({
  data: {
    reviewerInfo: {
      name: '审核员',
      department: '内容审核部',
      gradeLevel: ['1-2年级', '3-4年级'] // 审核员擅长的学段
    },
    // 统计数据
    todayPending: 0,
    weekCompleted: 0,
    projectCount: 0,
    schoolCount: 0,
    tempCount: 0,
    
    // 当前选项卡
    currentTab: 'project', // project | school
    
    // 筛选条件
    gradeOptions: ['全部年级', '1年级', '2年级', '3年级', '4年级', '5年级', '6年级'],
    gradeIndex: null,
    subjectOptions: ['全部学科', '语文', '数学', '英语', '科学', '道德与法治', '综合'],
    subjectIndex: null,
    
    // 任务列表
    projects: [],
    schools: [],
    filteredProjects: [],
    
    // 批量操作
    batchMode: false,
    selectedTasks: [],
    showBatchRejectModal: false,
    batchRejectReason: '',
    
    // 驳回原因选项（B类）
    rejectReasons: [
      { id: 'B01', text: '项目书结构不完整，缺少关键模块' },
      { id: 'B02', text: '驱动性问题封闭或过于简单，无法驱动深度探究' },
      { id: 'B03', text: '学科结合生硬，仅为知识堆砌，缺乏真融合' },
      { id: 'B04', text: '未明确列出所涉及的课程标准或核心知识点' },
      { id: 'B05', text: '项目目标与活动、成果关联度弱' },
      { id: 'B06', text: '最终成果描述模糊，不可展示或评估' },
      { id: 'B07', text: '课时安排严重不合理，无法保证实施' },
      { id: 'B08', text: '所需资源存在安全隐患或获取困难' },
      { id: 'B09', text: '项目设计与平台现有案例高度相似，涉嫌抄袭' },
      { id: 'B10', text: '项目主题或内容存在不当之处' }
    ]
  },

  onLoad(options) {
    // 检查登录态
    if (!this.checkLoginStatus()) {
      return;
    }
    
    // 加载审核员信息
    this.loadReviewerInfo();
  },

  onShow() {
    // 每次显示时刷新数据
    this.refreshData();
  },

  /**
   * 检查审核员登录态
   */
  checkLoginStatus() {
    const reviewerToken = wx.getStorageSync('reviewer_token');
    const reviewerInfo = wx.getStorageSync('reviewer_info');
    
    if (!reviewerToken || !reviewerInfo) {
      wx.reLaunch({
        url: '/pages/reviewer-login/reviewer-login'
      });
      return false;
    }
    
    return true;
  },

  /**
   * 加载审核员信息
   */
  loadReviewerInfo() {
    const reviewerInfo = wx.getStorageSync('reviewer_info');
    if (reviewerInfo) {
      this.setData({
        reviewerInfo
      });
    }
  },

  /**
   * 刷新所有数据
   */
  async refreshData() {
    wx.showLoading({ title: '加载中...' });
    
    try {
      // 并行请求所有数据
      await Promise.all([
        this.loadStatistics(),
        this.loadPendingProjects(),
        this.loadPendingSchools(),
        this.loadTempCount()
      ]);
      
      wx.hideLoading();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 加载统计数据
   */
  async loadStatistics() {
    // TODO: 调用云函数获取统计数据
    // 模拟数据
    const stats = {
      todayPending: 15,
      weekCompleted: 42
    };
    
    this.setData(stats);
  },

  /**
   * 加载待审核项目
   */
  async loadPendingProjects() {
    // TODO: 调用云函数获取待审核项目列表
    // 这里使用模拟数据
    const projects = [
      {
        id: 'proj_001',
        projectName: '智慧校园改造计划',
        grade: '5年级',
        subject: '综合',
        teacherName: '张老师',
        type: 'publish', // publish=发布项目, evaluate=申请评估
        submitTime: '2小时前',
        urgent: true,
        waitingHours: 26
      },
      {
        id: 'proj_002',
        projectName: '小小规划师',
        grade: '4年级',
        subject: '数学',
        teacherName: '李老师',
        type: 'evaluate',
        submitTime: '5小时前',
        urgent: false,
        waitingHours: 5
      },
      {
        id: 'proj_003',
        projectName: '我的时间我做主',
        grade: '1年级',
        subject: '综合',
        teacherName: '王老师',
        type: 'publish',
        submitTime: '1天前',
        urgent: true,
        waitingHours: 30
      }
    ];
    
    this.setData({
      projects,
      filteredProjects: projects,
      projectCount: projects.length
    });
  },

  /**
   * 加载待审核学校
   */
  async loadPendingSchools() {
    // TODO: 调用云函数获取待审核学校列表
    const schools = [
      {
        id: 'school_001',
        schoolName: '翠微小学',
        contactName: '张主任',
        position: '教务主任',
        schoolAddress: '北京市海淀区',
        submitTime: '3小时前'
      },
      {
        id: 'school_002',
        schoolName: '实验小学',
        contactName: '李校长',
        position: '副校长',
        schoolAddress: '北京市朝阳区',
        submitTime: '1天前'
      }
    ];
    
    this.setData({
      schools,
      schoolCount: schools.length
    });
  },

  /**
   * 加载暂存任务数量
   */
  async loadTempCount() {
    // TODO: 从数据库或本地存储获取
    this.setData({
      tempCount: 3
    });
  },

  /**
   * 切换选项卡
   */
  switchTab(e) {
    const { tab } = e.currentTarget.dataset;
    this.setData({
      currentTab: tab,
      batchMode: false,
      selectedTasks: [],
      gradeIndex: null,
      subjectIndex: null
    });
    
    if (tab === 'project') {
      this.applyFilters();
    }
  },

  /**
   * 年级筛选变化
   */
  onGradeChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      gradeIndex: index === 0 ? null : index
    });
    this.applyFilters();
  },

  /**
   * 学科筛选变化
   */
  onSubjectChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      subjectIndex: index === 0 ? null : index
    });
    this.applyFilters();
  },

  /**
   * 应用筛选条件
   */
  applyFilters() {
    const { projects, gradeIndex, subjectIndex, gradeOptions, subjectOptions } = this.data;
    
    let filtered = projects;
    
    // 按年级筛选
    if (gradeIndex !== null) {
      const selectedGrade = gradeOptions[gradeIndex];
      filtered = filtered.filter(item => item.grade === selectedGrade);
    }
    
    // 按学科筛选
    if (subjectIndex !== null) {
      const selectedSubject = subjectOptions[subjectIndex];
      filtered = filtered.filter(item => item.subject === selectedSubject);
    }
    
    this.setData({
      filteredProjects: filtered
    });
  },

  /**
   * 切换批量模式
   */
  toggleBatchMode() {
    this.setData({
      batchMode: !this.data.batchMode,
      selectedTasks: []
    });
  },

  /**
   * 任务选择
   */
  onTaskSelect(e) {
    const { value } = e.detail;
    const { selectedTasks } = this.data;
    const index = selectedTasks.indexOf(value);
    
    if (index > -1) {
      selectedTasks.splice(index, 1);
    } else {
      selectedTasks.push(value);
    }
    
    this.setData({
      selectedTasks
    });
  },

  /**
   * 取消批量选择
   */
  cancelBatchSelect() {
    this.setData({
      batchMode: false,
      selectedTasks: []
    });
  },

  /**
   * 显示批量驳回弹窗
   */
  showBatchRejectModal() {
    this.setData({
      showBatchRejectModal: true,
      batchRejectReason: ''
    });
  },

  /**
   * 关闭批量驳回弹窗
   */
  closeBatchRejectModal() {
    this.setData({
      showBatchRejectModal: false,
      batchRejectReason: ''
    });
  },

  /**
   * 批量驳回原因选择
   */
  onBatchRejectReasonChange(e) {
    this.setData({
      batchRejectReason: e.detail.value
    });
  },

  /**
   * 确认批量驳回
   */
  async confirmBatchReject() {
    const { selectedTasks, batchRejectReason } = this.data;
    
    if (!batchRejectReason) {
      wx.showToast({
        title: '请选择驳回原因',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({ title: '处理中...' });
    
    try {
      // TODO: 调用云函数批量驳回
      // await this.batchRejectProjects(selectedTasks, batchRejectReason);
      
      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      wx.hideLoading();
      wx.showToast({
        title: `已驳回 ${selectedTasks.length} 项`,
        icon: 'success'
      });
      
      this.closeBatchRejectModal();
      this.setData({
        batchMode: false,
        selectedTasks: []
      });
      
      // 刷新列表
      this.refreshData();
      
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },

  /**
   * 查看任务详情
   */
  viewTaskDetail(e) {
    // 批量模式下不跳转
    if (this.data.batchMode) {
      return;
    }
    
    const { id, type } = e.currentTarget.dataset;
    
    if (type === 'project') {
      wx.navigateTo({
        url: `/pages/reviewer/project-detail/index?id=${id}`
      });
    } else if (type === 'school') {
      wx.navigateTo({
        url: `/pages/reviewer/school-detail/index?id=${id}`
      });
    }
  },

  /**
   * 导航到暂存任务
   */
  navigateToTempTasks() {
    wx.navigateTo({
      url: '/pages/reviewer/temp-tasks/index'
    });
  },

  /**
   * 导航到我的页面
   */
  navigateToProfile() {
    wx.navigateTo({
      url: '/pages/reviewer/profile/index'
    });
  },

  /**
   * 退出登录
   */
  handleLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出审核工作台吗？',
      confirmText: '确定退出',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          this.doLogout();
        }
      }
    });
  },

  /**
   * 执行退出登录
   */
  doLogout() {
    wx.showLoading({ title: '退出中...', mask: true });

    // 清除审核员登录态
    wx.removeStorageSync('reviewer_token');
    wx.removeStorageSync('reviewer_info');

    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '已退出登录',
        icon: 'success',
        duration: 1500
      });

      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/reviewer-login/reviewer-login'
        });
      }, 1500);
    }, 500);
  },

  /**
   * 阻止冒泡
   */
  preventBubble() {
    return false;
  }
});
