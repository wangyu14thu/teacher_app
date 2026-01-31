// pages/school-team/school-team.js
Page({
  data: {
    currentStep: 1,
    showTip: false,
    formData: {
      schoolName: '',
      schoolAddress: '',
      contactName: '',
      contactPhone: '',
      position: '',
      description: ''
    },
    schoolSizeOptions: ['100人以下', '100-500人', '500-1000人', '1000-2000人', '2000人以上'],
    schoolSizeIndex: null,
    licenseImages: [],
    canProceed: false,
    canSubmit: false
  },

  onLoad(options) {
    this.checkStep1Validation();
  },

  // 输入框变化
  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    this.setData({
      [`formData.${field}`]: value
    });
    
    // 实时验证
    if (this.data.currentStep === 1) {
      this.checkStep1Validation();
    }
  },

  // 学校规模选择
  onSchoolSizeChange(e) {
    this.setData({
      schoolSizeIndex: parseInt(e.detail.value)
    });
    if (this.data.currentStep === 1) {
      this.checkStep1Validation();
    }
  },


  // 切换提示显示
  toggleTip() {
    this.setData({
      showTip: !this.data.showTip
    });
  },

  // 验证步骤1
  checkStep1Validation() {
    const { schoolName, schoolAddress, contactName, contactPhone, position } = this.data.formData;
    const phoneReg = /^1[3-9]\d{9}$/;
    
    const canProceed = 
      schoolName.trim() !== '' &&
      schoolAddress.trim() !== '' &&
      contactName.trim() !== '' &&
      phoneReg.test(contactPhone) &&
      position.trim() !== '';
    
    this.setData({ canProceed });
  },


  // 下一步
  nextStep() {
    if (!this.data.canProceed) {
      this.showValidationError();
      return;
    }

    const nextStep = this.data.currentStep + 1;
    this.setData({
      currentStep: nextStep,
      canSubmit: true  // 进入步骤2即可提交
    });

    // 滚动到顶部
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 300
    });
  },

  // 上一步
  prevStep() {
    const prevStep = this.data.currentStep - 1;
    this.setData({
      currentStep: prevStep
    });

    // 滚动到顶部
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 300
    });

    // 验证上一步
    if (prevStep === 1) {
      this.checkStep1Validation();
    }
  },

  // 跳转到指定步骤
  goToStep(e) {
    const { step } = e.currentTarget.dataset;
    this.setData({
      currentStep: parseInt(step)
    });

    // 滚动到顶部
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 300
    });

    // 验证目标步骤
    if (step === 1) {
      this.checkStep1Validation();
    }
  },

  // 显示验证错误
  showValidationError() {
    const { schoolName, schoolAddress, contactName, contactPhone, position } = this.data.formData;
    let errorMsg = '';

    if (!schoolName.trim()) {
      errorMsg = '请填写学校名称';
    } else if (!schoolAddress.trim()) {
      errorMsg = '请填写学校地址';
    } else if (!contactName.trim()) {
      errorMsg = '请填写您的姓名';
    } else if (!/^1[3-9]\d{9}$/.test(contactPhone)) {
      errorMsg = '请填写正确的手机号码';
    } else if (!position.trim()) {
      errorMsg = '请填写您的职务';
    }

    if (errorMsg) {
      wx.showToast({
        title: errorMsg,
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 提交申请
  submitApplication() {
    if (!this.data.canSubmit) {
      wx.showToast({
        title: '请完善所有必填信息',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '确认提交',
      content: '请确认所填信息准确无误，提交后将进入审核流程',
      confirmText: '确认提交',
      cancelText: '再检查一下',
      success: (res) => {
        if (res.confirm) {
          this.doSubmit();
        }
      }
    });
  },

  // 执行提交
  async doSubmit() {
    const { formData, schoolSizeIndex, schoolSizeOptions } = this.data;
    
    wx.showLoading({
      title: '提交中...',
      mask: true
    });

    try {
      // 获取教师信息
      const teacherInfo = wx.getStorageSync('teacherInfo') || {};
      
      // 准备提交数据
      const schoolData = {
        schoolName: formData.schoolName,
        schoolAddress: formData.schoolAddress,
        schoolSize: schoolSizeIndex !== null ? schoolSizeOptions[schoolSizeIndex] : '',
        contactName: formData.contactName,
        contactPhone: formData.contactPhone,
        position: formData.position,
        description: formData.description,
        teacherInfo: teacherInfo
      };

      // 调用云函数提交申请
      const result = await wx.cloud.callFunction({
        name: 'school-application',
        data: {
          action: 'submitApplication',
          schoolData: schoolData
        }
      });

      wx.hideLoading();

      if (result.result.success) {
        wx.showModal({
          title: '申请已提交！',
          content: `我们已收到您创建"${formData.schoolName}"团队的申请，将在24小时内完成审核。\n\n审核结果将通过"系统消息"通知您，请留意。\n\n审核通过后，系统将自动生成学校专属邀请码并发送给您。`,
          showCancel: false,
          confirmText: '我知道了',
          success: () => {
            // 返回上一页
            wx.navigateBack();
          }
        });
      } else {
        wx.showModal({
          title: '提交失败',
          content: result.result.message || '提交失败，请稍后重试',
          showCancel: false
        });
      }

    } catch (error) {
      wx.hideLoading();
      console.error('提交申请错误:', error);
      
      wx.showModal({
        title: '提交失败',
        content: '网络错误，请检查网络连接后重试',
        showCancel: false
      });
    }
  }
});
