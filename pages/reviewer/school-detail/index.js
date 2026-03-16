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
    
    try {
      // 从云数据库获取真实数据
      const db = wx.cloud.database();
      const result = await db.collection('schools_pending')
        .doc(id)
        .get();
      
      if (result.data) {
        const data = result.data;
        
        // 格式化时间
        const submitTime = this.formatTime(data.submitTime);
        
        // 格式化电话号码（隐藏中间4位）
        const phone = data.contactPhone ? 
          data.contactPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : 
          '';
        
        const schoolData = {
          schoolName: data.schoolName || '',
          contactName: data.contactName || '',
          position: data.position || '',
          phone: phone,
          schoolAddress: data.schoolAddress || '',
          schoolSize: data.schoolSize || '',
          submitTime: submitTime,
          description: data.description || '',
          status: data.status || 'pending'
        };
        
        console.log('加载学校详情成功:', schoolData);
        this.setData({ schoolData });
      } else {
        throw new Error('未找到学校申请信息');
      }
      
      wx.hideLoading();
      
    } catch (error) {
      console.error('加载学校详情失败:', error);
      wx.hideLoading();
      wx.showModal({
        title: '加载失败',
        content: '无法获取学校申请信息',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
    }
  },

  /**
   * 格式化时间
   */
  formatTime(date) {
    if (!date) return '';
    
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hour}:${minute}`;
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
      const { schoolId, reviewDecision, selectedRejectReason, schoolData } = this.data;
      const reviewerInfo = wx.getStorageSync('reviewer_info');
      
      if (!reviewerInfo) {
        throw new Error('审核员信息不存在');
      }

      console.log('提交审核:', {
        schoolId,
        decision: reviewDecision,
        reason: selectedRejectReason
      });

      // 调用云函数提交审核
      const result = await wx.cloud.callFunction({
        name: 'reviewer',
        data: {
          action: 'reviewSchool',
          token: wx.getStorageSync('reviewer_token'),
          schoolId: schoolId,
          decision: reviewDecision,
          rejectReason: selectedRejectReason,
          schoolName: schoolData.schoolName
        }
      });

      console.log('审核提交结果:', result);

      if (result.result && result.result.success) {
        wx.hideLoading();
        
        const successMsg = reviewDecision === 'pass' 
          ? `学校审核通过！\n\n邀请码：${result.result.inviteCode || '已生成'}\n\n已通过系统消息通知申请人` 
          : '学校申请已驳回，已通知申请人';
          
        wx.showModal({
          title: '提交成功',
          content: successMsg,
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
      } else {
        throw new Error(result.result?.message || '提交失败');
      }
      
    } catch (error) {
      console.error('提交审核失败:', error);
      wx.hideLoading();
      wx.showModal({
        title: '提交失败',
        content: error.message || '网络错误，请重试',
        showCancel: false
      });
    }
  }
});

