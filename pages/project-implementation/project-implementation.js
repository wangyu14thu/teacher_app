// pages/project-implementation/project-implementation.js
Page({
  data: {
    projectId: '',
    projectName: '',
    launchProcess: [],
    launchOutcome: [],
    inquiryPhases: [
      {
        question: '',
        process: [],
        outcome: []
      }
    ],
    presentationProcess: []
  },

  onLoad(options) {
    if (options.projectId) {
      this.setData({
        projectId: options.projectId
      });
      this.loadProjectInfo(options.projectId);
    }
    
    if (options.projectName) {
      this.setData({
        projectName: decodeURIComponent(options.projectName)
      });
    }
  },

  // 加载项目信息
  loadProjectInfo(projectId) {
    wx.showLoading({ title: '加载中...' });
    
    // TODO: 从云数据库加载项目信息和已有的实施记录
    setTimeout(() => {
      wx.hideLoading();
    }, 500);
  },

  // 选择图片 - 启动/展示阶段
  chooseImage(e) {
    const { type } = e.currentTarget.dataset;
    const currentImages = this.data[type];
    const count = 9 - currentImages.length;

    wx.chooseImage({
      count,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        wx.showLoading({ title: '上传中...' });
        
        // TODO: 上传到云存储
        // 这里模拟上传，实际应该上传到云存储后获取URL
        setTimeout(() => {
          const newImages = [...currentImages, ...res.tempFilePaths];
          this.setData({
            [type]: newImages
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

  // 选择图片 - 探究阶段
  chooseInquiryImage(e) {
    const { phaseIndex, type } = e.currentTarget.dataset;
    const currentImages = this.data.inquiryPhases[phaseIndex][type];
    const count = 9 - currentImages.length;

    wx.chooseImage({
      count,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        wx.showLoading({ title: '上传中...' });
        
        // TODO: 上传到云存储
        setTimeout(() => {
          const inquiryPhases = this.data.inquiryPhases;
          inquiryPhases[phaseIndex][type] = [...currentImages, ...res.tempFilePaths];
          this.setData({
            inquiryPhases
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

  // 删除图片 - 启动/展示阶段
  deleteImage(e) {
    const { type, index } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张图片吗？',
      success: (res) => {
        if (res.confirm) {
          const images = this.data[type];
          images.splice(index, 1);
          this.setData({
            [type]: images
          });
          wx.showToast({
            title: '已删除',
            icon: 'success'
          });
        }
      }
    });
  },

  // 删除图片 - 探究阶段
  deleteInquiryImage(e) {
    const { phaseIndex, type, imgIndex } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张图片吗？',
      success: (res) => {
        if (res.confirm) {
          const inquiryPhases = this.data.inquiryPhases;
          inquiryPhases[phaseIndex][type].splice(imgIndex, 1);
          this.setData({
            inquiryPhases
          });
          wx.showToast({
            title: '已删除',
            icon: 'success'
          });
        }
      }
    });
  },

  // 输入子问题
  onQuestionInput(e) {
    const { index } = e.currentTarget.dataset;
    const { value } = e.detail;
    const inquiryPhases = this.data.inquiryPhases;
    inquiryPhases[index].question = value;
    this.setData({
      inquiryPhases
    });
  },

  // 添加探究阶段
  addInquiryPhase() {
    const inquiryPhases = this.data.inquiryPhases;
    inquiryPhases.push({
      question: '',
      process: [],
      outcome: []
    });
    this.setData({
      inquiryPhases
    });
    wx.showToast({
      title: '已添加子问题',
      icon: 'success'
    });
  },

  // 删除探究阶段
  deleteInquiryPhase(e) {
    const { index } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个子问题及其所有照片吗？',
      success: (res) => {
        if (res.confirm) {
          const inquiryPhases = this.data.inquiryPhases;
          inquiryPhases.splice(index, 1);
          this.setData({
            inquiryPhases
          });
          wx.showToast({
            title: '已删除',
            icon: 'success'
          });
        }
      }
    });
  },

  // 保存实施记录
  saveImplementation() {
    // 验证是否有内容
    if (!this.validateContent()) {
      return;
    }

    wx.showLoading({ title: '保存中...' });
    
    // TODO: 保存到云数据库
    const data = {
      projectId: this.data.projectId,
      projectName: this.data.projectName,
      launchProcess: this.data.launchProcess,
      launchOutcome: this.data.launchOutcome,
      inquiryPhases: this.data.inquiryPhases,
      presentationProcess: this.data.presentationProcess,
      updateTime: new Date().getTime()
    };

    setTimeout(() => {
      wx.hideLoading();
      wx.showModal({
        title: '保存成功',
        content: '实施记录已保存',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
    }, 1000);
  },

  // 预览实施记录
  previewImplementation() {
    wx.showToast({
      title: '预览功能开发中',
      icon: 'none'
    });
  },

  // 验证内容
  validateContent() {
    const hasLaunchContent = this.data.launchProcess.length > 0 || this.data.launchOutcome.length > 0;
    const hasInquiryContent = this.data.inquiryPhases.some(phase => 
      phase.process.length > 0 || phase.outcome.length > 0
    );
    const hasPresentationContent = this.data.presentationProcess.length > 0;

    if (!hasLaunchContent && !hasInquiryContent && !hasPresentationContent) {
      wx.showToast({
        title: '请至少上传一张照片',
        icon: 'none'
      });
      return false;
    }

    return true;
  }
});

