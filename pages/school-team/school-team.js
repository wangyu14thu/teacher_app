// pages/school-team/school-team.js
Page({
  data: {
    formData: {
      schoolName: '',
      schoolAddress: '',
      contactName: '',
      contactPhone: '',
      position: '',
      description: ''
    },
    schoolSizeOptions: ['50人以下', '50-200人', '200-500人', '500-1000人', '1000人以上'],
    schoolSizeIndex: null,
    licenseImages: []
  },

  onLoad(options) {
    // 检查是否已有待审核的申请
    this.checkExistingApplication();
  },

  // 检查现有申请
  checkExistingApplication() {
    // TODO: 从云数据库检查
  },

  // 输入变化
  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  // 选择学校规模
  onSchoolSizeChange(e) {
    this.setData({
      schoolSizeIndex: parseInt(e.detail.value)
    });
  },

  // 选择图片
  chooseImage() {
    const count = 3 - this.data.licenseImages.length;
    
    wx.chooseImage({
      count,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        wx.showLoading({ title: '上传中...' });
        
        // TODO: 上传到云存储
        setTimeout(() => {
          const newImages = [...this.data.licenseImages, ...res.tempFilePaths];
          this.setData({
            licenseImages: newImages
          });
          wx.hideLoading();
          wx.showToast({
            title: '上传成功',
            icon: 'success'
          });
        }, 1000);
      }
    });
  },

  // 预览图片
  previewImage(e) {
    const { index } = e.currentTarget.dataset;
    wx.previewImage({
      urls: this.data.licenseImages,
      current: this.data.licenseImages[index]
    });
  },

  // 删除图片
  deleteImage(e) {
    const { index } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张图片吗？',
      success: (res) => {
        if (res.confirm) {
          const licenseImages = this.data.licenseImages;
          licenseImages.splice(index, 1);
          this.setData({
            licenseImages
          });
        }
      }
    });
  },

  // 提交申请
  submitApplication() {
    // 验证表单
    if (!this.validateForm()) {
      return;
    }

    wx.showModal({
      title: '确认提交',
      content: '请确认申请信息无误，提交后无法修改',
      confirmText: '确认提交',
      success: (res) => {
        if (res.confirm) {
          this.doSubmit();
        }
      }
    });
  },

  // 执行提交
  doSubmit() {
    wx.showLoading({ title: '提交中...' });

    const applicationData = {
      ...this.data.formData,
      schoolSize: this.data.schoolSizeIndex !== null ? this.data.schoolSizeOptions[this.data.schoolSizeIndex] : '',
      licenseImages: this.data.licenseImages,
      submitTime: new Date().getTime()
    };

    // TODO: 调用云函数提交申请
    setTimeout(() => {
      wx.hideLoading();
      wx.showModal({
        title: '提交成功',
        content: '您的申请已提交，我们将在24小时内完成审核。审核通过后，系统将自动生成学校专属邀请码并通过系统消息发送给您。',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
    }, 1500);
  },

  // 表单验证
  validateForm() {
    const { formData, licenseImages } = this.data;

    if (!formData.schoolName) {
      wx.showToast({
        title: '请输入学校名称',
        icon: 'none'
      });
      return false;
    }

    if (!formData.schoolAddress) {
      wx.showToast({
        title: '请输入学校地址',
        icon: 'none'
      });
      return false;
    }

    if (!formData.contactName) {
      wx.showToast({
        title: '请输入联系人姓名',
        icon: 'none'
      });
      return false;
    }

    if (!formData.contactPhone) {
      wx.showToast({
        title: '请输入联系电话',
        icon: 'none'
      });
      return false;
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(formData.contactPhone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return false;
    }

    if (!formData.position) {
      wx.showToast({
        title: '请输入职务',
        icon: 'none'
      });
      return false;
    }

    if (licenseImages.length === 0) {
      wx.showToast({
        title: '请上传营业执照或办学许可证',
        icon: 'none'
      });
      return false;
    }

    return true;
  }
});

