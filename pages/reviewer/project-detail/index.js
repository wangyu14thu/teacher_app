// pages/reviewer/project-detail/index.js

/**
 * 项目审核详情页面
 * 核心功能：审核操作、意见选择、内部备注、转交、暂存
 */

Page({
  data: {
    projectId: '',
    projectData: {
      projectName: '',
      grade: '',
      subject: '',
      hours: '',
      teacherName: '',
      submitTime: '',
      urgent: false,
      type: '', // publish | evaluate
      overview: '',
      realWorld: '',
      curriculum: '',
      studentLevel: '',
      crossConcept: '',
      drivingQuestion: '',
      subQuestions: [],
      finalProduct: '',
      presentForm: '',
      objectives: ''
    },
    
    // 审核要点提示
    showTips: true,
    
    // 审核决定
    reviewDecision: '', // pass | reject
    
    // 审核意见选项
    passComments: [
      { id: 'P01', text: '设计优秀，结构完整，准予发布' },
      { id: 'P02', text: '驱动性问题设计出色，具有真实探究性' },
      { id: 'P03', text: '学科融合自然，体现了"真跨学科"理念' },
      { id: 'P04', text: '课标关联清晰，核心素养落实到位' },
      { id: 'P05', text: '项目成果具体，实施路径清晰，操作性强' }
    ],
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
    ],
    suggestions: [
      { id: 'C01', text: '建议进一步优化驱动性问题的表述，使其更开放' },
      { id: 'C02', text: '建议补充具体学科在本项目中的素养落脚点' },
      { id: 'C03', text: '建议调整课时分配，确保各阶段有充分探究时间' },
      { id: 'C04', text: '建议将成果形式具体化为可展示的形式' }
    ],
    
    // 选中的意见
    selectedPassComment: '',
    selectedRejectReason: '',
    selectedSuggestions: [],
    customComment: '',
    
    // 内部备注
    showNoteModal: false,
    internalNote: '',
    
    // 转交功能
    showTransferModal: false,
    transferTarget: '',
    transferReason: '',
    availableReviewers: [],
    
    // 提交状态
    canSubmit: false
  },

  onLoad(options) {
    const { id } = options;
    if (id) {
      this.setData({ projectId: id });
      this.loadProjectDetail(id);
      this.loadAvailableReviewers();
    }
    
    // 检查是否首次审核，显示提示
    const hasSeenTips = wx.getStorageSync('reviewer_seen_tips');
    if (hasSeenTips) {
      this.setData({ showTips: false });
    }
  },

  /**
   * 加载项目详情
   */
  async loadProjectDetail(id) {
    wx.showLoading({ title: '加载中...' });
    
    try {
      // TODO: 调用云函数获取项目详情
      // 模拟数据
      const projectData = {
        projectName: '智慧校园改造计划',
        grade: '5年级',
        subject: '综合',
        hours: '12',
        teacherName: '张老师',
        submitTime: '2026-01-31 10:30',
        urgent: true,
        type: 'publish',
        overview: '本项目旨在引导学生通过调研、设计、实践，优化校园环境，提升学生主人翁意识和创新能力。',
        realWorld: '校园环境直接影响学生学习体验，存在诸多可优化空间。',
        curriculum: '综合实践活动课程标准要求学生开展设计类、服务类活动，培养创新意识和实践能力。涉及科学（测量、数据分析）、美术（设计）、信息技术（建模）等学科核心知识。',
        studentLevel: '五年级学生已具备基本调研能力和设计思维基础，对校园环境有强烈改进愿望。',
        crossConcept: '系统与优化：通过系统思维分析校园环境各要素关系，运用优化策略改进现状。',
        drivingQuestion: '作为小小设计师，如何为全校师生设计一个更智慧、更舒适的校园环境方案？',
        subQuestions: [
          '如何了解大家对校园环境的真实需求？',
          '校园的哪些区域最需要改进？',
          '如何设计出既美观又实用的改造方案？',
          '怎样让更多人了解并支持我们的方案？'
        ],
        finalProduct: '形成一套完整的校园环境改造方案，包括需求调研报告、设计图纸、实施建议等。',
        presentForm: '方案展板、设计模型、路演答辩',
        objectives: '1. 通过实地调研和问卷访谈，掌握数据收集与分析方法（科学素养）；2. 运用设计思维，创作出兼顾美观与实用的改造方案（创新能力）；3. 以展板、模型、演讲等形式展示成果（表达能力）；4. 培养关注身边环境、主动改善现状的主人翁意识（责任担当）。'
      };
      
      this.setData({ projectData });
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
   * 加载可转交的审核员列表
   */
  async loadAvailableReviewers() {
    // TODO: 调用云函数获取审核员列表
    const reviewers = [
      { id: 'rev_002', name: '李审核员', department: '内容审核部', gradeLevel: '1-3年级' },
      { id: 'rev_003', name: '王审核员', department: '内容审核部', gradeLevel: '4-6年级' },
      { id: 'rev_004', name: '赵审核员', department: '内容审核部', gradeLevel: '全学段' }
    ];
    
    this.setData({ availableReviewers: reviewers });
  },

  /**
   * 关闭审核要点提示
   */
  closeTips() {
    this.setData({ showTips: false });
    wx.setStorageSync('reviewer_seen_tips', true);
  },

  /**
   * 选择审核决定
   */
  selectDecision(e) {
    const { decision } = e.currentTarget.dataset;
    this.setData({
      reviewDecision: decision,
      selectedPassComment: '',
      selectedRejectReason: '',
      selectedSuggestions: [],
      customComment: ''
    });
    this.checkCanSubmit();
  },

  /**
   * 驳回原因选择
   */
  onRejectReasonChange(e) {
    this.setData({
      selectedRejectReason: e.detail.value
    });
    this.checkCanSubmit();
  },

  /**
   * 通过评语选择
   */
  onPassCommentChange(e) {
    this.setData({
      selectedPassComment: e.detail.value
    });
    this.checkCanSubmit();
  },

  /**
   * 优化建议选择
   */
  onSuggestionsChange(e) {
    this.setData({
      selectedSuggestions: e.detail.value
    });
  },

  /**
   * 自定义意见输入
   */
  onCustomCommentInput(e) {
    this.setData({
      customComment: e.detail.value
    });
  },

  /**
   * 检查是否可以提交
   */
  checkCanSubmit() {
    const { reviewDecision, selectedRejectReason } = this.data;
    
    // 未选择审核决定
    if (!reviewDecision) {
      this.setData({ canSubmit: false });
      return;
    }
    
    // 驳回时必须选择原因
    if (reviewDecision === 'reject' && !selectedRejectReason) {
      this.setData({ canSubmit: false });
      return;
    }
    
    // 通过时无需必选
    this.setData({ canSubmit: true });
  },

  /**
   * 保存到暂存
   */
  async saveToTemp() {
    wx.showLoading({ title: '保存中...' });
    
    try {
      // TODO: 调用云函数保存暂存任务
      const tempData = {
        projectId: this.data.projectId,
        reviewDecision: this.data.reviewDecision,
        selectedPassComment: this.data.selectedPassComment,
        selectedRejectReason: this.data.selectedRejectReason,
        selectedSuggestions: this.data.selectedSuggestions,
        customComment: this.data.customComment,
        internalNote: this.data.internalNote,
        savedAt: new Date().toISOString()
      };
      
      // 模拟保存
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      wx.hideLoading();
      wx.showToast({
        title: '已暂存',
        icon: 'success'
      });
      
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '暂存失败',
        icon: 'none'
      });
    }
  },

  /**
   * 显示内部备注弹窗
   */
  showInternalNote() {
    this.setData({ showNoteModal: true });
  },

  /**
   * 关闭内部备注弹窗
   */
  closeNoteModal() {
    this.setData({ showNoteModal: false });
  },

  /**
   * 内部备注输入
   */
  onInternalNoteInput(e) {
    this.setData({
      internalNote: e.detail.value
    });
  },

  /**
   * 保存内部备注
   */
  saveInternalNote() {
    wx.showToast({
      title: '备注已保存',
      icon: 'success'
    });
    this.closeNoteModal();
  },

  /**
   * 显示转交弹窗
   */
  showTransferModal() {
    this.setData({ showTransferModal: true });
  },

  /**
   * 关闭转交弹窗
   */
  closeTransferModal() {
    this.setData({
      showTransferModal: false,
      transferTarget: '',
      transferReason: ''
    });
  },

  /**
   * 转交目标选择
   */
  onTransferTargetChange(e) {
    this.setData({
      transferTarget: e.detail.value
    });
  },

  /**
   * 转交原因输入
   */
  onTransferReasonInput(e) {
    this.setData({
      transferReason: e.detail.value
    });
  },

  /**
   * 确认转交
   */
  async confirmTransfer() {
    const { transferTarget, transferReason, projectId } = this.data;
    
    wx.showLoading({ title: '转交中...' });
    
    try {
      // TODO: 调用云函数转交任务
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      wx.hideLoading();
      wx.showToast({
        title: '转交成功',
        icon: 'success'
      });
      
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '转交失败',
        icon: 'none'
      });
    }
  },

  /**
   * 提交审核
   */
  async submitReview() {
    const {
      projectId,
      reviewDecision,
      selectedPassComment,
      selectedRejectReason,
      selectedSuggestions,
      customComment,
      internalNote
    } = this.data;
    
    // 二次确认
    const confirmText = reviewDecision === 'pass' 
      ? '确定通过该项目吗？' 
      : '确定驳回该项目吗？审核结果将立即通知提交教师。';
    
    wx.showModal({
      title: '确认提交',
      content: confirmText,
      confirmText: '确认提交',
      confirmColor: reviewDecision === 'pass' ? '#52c41a' : '#ff4d4f',
      success: async (res) => {
        if (res.confirm) {
          await this.doSubmitReview();
        }
      }
    });
  },

  /**
   * 执行提交审核
   */
  async doSubmitReview() {
    wx.showLoading({ title: '提交中...', mask: true });
    
    try {
      const reviewData = {
        projectId: this.data.projectId,
        decision: this.data.reviewDecision,
        opinions: {
          passComment: this.data.selectedPassComment,
          rejectReason: this.data.selectedRejectReason,
          suggestions: this.data.selectedSuggestions,
          customComment: this.data.customComment
        },
        internalNote: this.data.internalNote,
        reviewerId: wx.getStorageSync('reviewer_info').id,
        reviewTime: new Date().toISOString()
      };
      
      // TODO: 调用云函数提交审核
      // const result = await wx.cloud.callFunction({
      //   name: 'reviewer',
      //   data: {
      //     action: 'submitReview',
      //     reviewData
      //   }
      // });
      
      // 模拟提交
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      wx.hideLoading();
      
      // 显示成功提示
      const successMsg = this.data.reviewDecision === 'pass' 
        ? '项目已通过审核' 
        : '项目已驳回';
        
      wx.showModal({
        title: '提交成功',
        content: `${successMsg}，教师将通过系统消息收到通知。`,
        showCancel: false,
        confirmText: '返回任务列表',
        success: () => {
          wx.navigateBack();
        }
      });
      
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '提交失败',
        icon: 'none'
      });
      console.error('审核提交失败:', error);
    }
  },

  /**
   * 阻止冒泡
   */
  preventBubble() {
    return false;
  }
});

