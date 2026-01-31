// pages/reviewer/school-detail/index.js

Page({
  data: {
    schoolId: '',
    schoolData: {},
    reviewDecision: '',
    selectedRejectReason: '',
    rejectReasons: [
      { id: 'S_REJECT01', text: '上传的证件不清晰、无效或与学校名称不符' },
      { id: 'S_REJECT02', text: '未提供有效的办学资质证明' },
      { id: 'S_REJECT03', text: '申请人身份可能不具备有效组织校本团队的权限' },
      { id: 'S_REJECT04', text: '申请信息过于简略，无法判断其真实性与计划可行性' },
      { id: 'S_REJECT05', text: '信息存疑，根据风控规则不予通过' }
    ],
    canSubmit: false
  },

  onLoad(options) {
    const { id } = options;
    if (id) {
      this.setData({ schoolId: id });
      this.loadSchoolDetail(id);
    }
  },

  async loadSchoolDetail(id) {
    wx.showLoading({ title: '加载中...' });
    
    // 模拟数据
    const schoolData = {
      schoolName: '翠微小学',
      contactName: '张主任',
      position: '教务主任',
      phone: '138****8888',
      schoolAddress: '北京市海淀区翠微路10号',
      schoolSize: '1000-2000人',
      submitTime: '2026-01-31 10:00',
      description: '我校是一所公办小学，拥有30个教学班，目前正在推进项目式学习改革，希望通过平台为教师提供更好的资源支持。'
    };
    
    this.setData({ schoolData });
    wx.hideLoading();
  },

  selectDecision(e) {
    const { decision } = e.currentTarget.dataset;
    this.setData({
      reviewDecision: decision,
      selectedRejectReason: ''
    });
    this.checkCanSubmit();
  },

  onRejectReasonChange(e) {
    this.setData({
      selectedRejectReason: e.detail.value
    });
    this.checkCanSubmit();
  },

  checkCanSubmit() {
    const { reviewDecision, selectedRejectReason } = this.data;
    
    if (!reviewDecision) {
      this.setData({ canSubmit: false });
      return;
    }
    
    if (reviewDecision === 'reject' && !selectedRejectReason) {
      this.setData({ canSubmit: false });
      return;
    }
    
    this.setData({ canSubmit: true });
  },

  async submitReview() {
    const confirmText = this.data.reviewDecision === 'pass' 
      ? '通过后系统将自动生成邀请码并通知申请人' 
      : '驳回后将通知申请人，并说明原因';
    
    wx.showModal({
      title: '确认提交',
      content: confirmText,
      success: async (res) => {
        if (res.confirm) {
          await this.doSubmitReview();
        }
      }
    });
  },

  async doSubmitReview() {
    wx.showLoading({ title: '提交中...', mask: true });
    
    try {
      // TODO: 调用云函数提交审核
      // 如果通过，云函数会生成邀请码
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      wx.hideLoading();
      
      const successMsg = this.data.reviewDecision === 'pass' 
        ? '学校审核通过，邀请码已生成并通知申请人' 
        : '学校申请已驳回';
        
      wx.showModal({
        title: '提交成功',
        content: successMsg,
        showCancel: false,
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
    }
  }
});

