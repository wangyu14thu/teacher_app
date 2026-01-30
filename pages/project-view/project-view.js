// pages/project-view/project-view.js
Page({
  data: {
    projectId: '',
    projectData: {
      projectName: '智慧校园改造计划',
      subjects: '综合',
      grade: '5年级',
      hours: '10',
      overview: '本项目基于学生对校园环境的观察和思考，通过调查、设计、实践等环节，引导学生运用科学、数学、美术等多学科知识，为校园环境改造提出创新方案。',
      basisWorld: '学生每天在校园中学习生活，对校园环境有着直接的感受和需求。通过改造计划，可以培养学生的主人翁意识和创新能力。',
      basisCurriculum: '本项目融合了科学课程中的环境保护、数学课程中的测量与计算、美术课程中的设计与审美等核心知识，培养学生的综合素养。',
      basisStudents: '五年级学生已具备基本的观察、调查、设计能力，能够在教师引导下开展跨学科项目学习。',
      interdisciplinaryConcept: '结构与功能：校园环境的结构布局应服务于师生的学习生活功能需求。',
      drivingQuestion: '作为小小规划师，我们如何为学校设计一套智慧校园改造方案，让校园环境更美好、更智能、更适合学习？',
      subQuestions: '子问题1：校园现状有哪些问题？\n子问题2：我们需要什么样的校园环境？\n子问题3：如何设计改造方案？\n子问题4：方案如何落地实施？',
      finalOutcome: '智慧校园改造方案（含设计图、预算表、实施计划）',
      presentationForm: '方案展示会、设计图展览、视频演示',
      projectGoals: '1. 探究任务：通过实地调查和数据分析，发现校园环境问题并提出改造方案\n2. 知识运用：空间规划、数据统计、设计思维、环保理念\n3. 成果产出：改造方案、设计图纸、预算清单、实施计划\n4. 素养培育：创新思维、团队协作、问题解决能力、审美情趣'
    },
    showStandardModal: false,
    showExportModal: false,
    agreed: false,
    actionType: '' // 'evaluate' 或 'publish'
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        projectId: options.id
      });
      this.loadProjectData(options.id);
    }
  },

  // 加载项目数据
  loadProjectData(projectId) {
    wx.showLoading({ title: '加载中...' });
    
    // 从本地存储加载项目数据
    const myProjects = wx.getStorageSync('myDesignedProjects') || [];
    const project = myProjects.find(p => p.id == projectId);
    
    if (project) {
      this.setData({
        projectData: {
          projectName: project.title,
          subjects: project.subject,
          grade: project.grade,
          hours: project.hours || '10',
          overview: project.overview || '本项目基于学生对校园环境的观察和思考...',
          basisWorld: project.basisWorld || '学生每天在校园中学习生活...',
          basisCurriculum: project.basisCurriculum || '本项目融合了科学课程...',
          basisStudents: project.basisStudents || '学生已具备基本的观察能力...',
          interdisciplinaryConcept: project.interdisciplinaryConcept || '',
          drivingQuestion: project.drivingQuestion || '',
          subQuestions: project.subQuestions || '',
          finalOutcome: project.finalOutcome || '',
          presentationForm: project.presentationForm || '',
          projectGoals: project.projectGoals || ''
        }
      });
    }
    
    setTimeout(() => {
      wx.hideLoading();
    }, 500);
  },

  // 下载项目
  downloadProject() {
    wx.showLoading({ title: '准备下载...' });

    // 更新项目状态为已下载
    this.updateProjectStatus('downloaded', '草稿');

    // TODO: 生成项目文档并下载
    setTimeout(() => {
      wx.hideLoading();
      wx.showModal({
        title: '下载成功',
        content: '项目文档已保存到本地相册',
        showCancel: false,
        confirmText: '我知道了'
      });
    }, 1500);
  },

  // 更新项目状态
  updateProjectStatus(status, statusText) {
    const projectId = this.data.projectId;
    let myProjects = wx.getStorageSync('myDesignedProjects') || [];
    
    const index = myProjects.findIndex(p => p.id == projectId);
    if (index !== -1) {
      myProjects[index].status = status;
      myProjects[index].statusText = statusText;
      myProjects[index].updateTime = '刚刚';
      wx.setStorageSync('myDesignedProjects', myProjects);
    }
  },

  // 申请专家评估
  applyEvaluation() {
    this.setData({
      showStandardModal: true,
      actionType: 'evaluate',
      agreed: false
    });
  },

  // 发布项目
  publishProject() {
    this.setData({
      showStandardModal: true,
      actionType: 'publish',
      agreed: false
    });
  },

  // 关闭弹窗
  closeStandardModal() {
    this.setData({
      showStandardModal: false,
      agreed: false
    });
  },

  // 分享项目
  shareProject() {
    const projectData = this.data.projectData;
    
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
    
    wx.showModal({
      title: '分享提示',
      content: '请点击右上角"..."按钮，选择"转发"或"分享到朋友圈"',
      showCancel: false
    });
  },

  // 显示导出选项
  showExportOptions() {
    this.setData({
      showExportModal: true
    });
  },

  // 关闭导出弹窗
  closeExportModal() {
    this.setData({
      showExportModal: false
    });
  },

  // 导出为Word
  exportAsWord() {
    wx.showLoading({ title: '正在生成Word文档...' });
    
    // TODO: 调用API生成Word文档
    setTimeout(() => {
      wx.hideLoading();
      this.closeExportModal();
      wx.showModal({
        title: '导出成功',
        content: 'Word文档已保存到您的手机相册，您可以在相册中查看和分享。',
        showCancel: false
      });
    }, 2000);
  },

  // 导出为PDF
  exportAsPDF() {
    wx.showLoading({ title: '正在生成PDF文档...' });
    
    // TODO: 调用API生成PDF文档
    setTimeout(() => {
      wx.hideLoading();
      this.closeExportModal();
      wx.showModal({
        title: '导出成功',
        content: 'PDF文档已保存到您的手机相册，您可以在相册中查看和分享。',
        showCancel: false
      });
    }, 2000);
  },

  // 阻止冒泡
  preventClose() {
    // 阻止点击弹窗内容关闭
  },

  // 勾选协议
  onAgreeChange(e) {
    this.setData({
      agreed: e.detail.value.length > 0
    });
  },

  // 确认操作
  confirmAction() {
    if (!this.data.agreed) {
      return;
    }

    const actionType = this.data.actionType;
    this.closeStandardModal();

    wx.showLoading({ title: '提交中...' });

    // 更新项目状态
    if (actionType === 'evaluate') {
      this.updateProjectStatus('evaluating', '评估中');
    } else {
      this.updateProjectStatus('reviewing', '审核中');
    }

    setTimeout(() => {
      wx.hideLoading();
      
      if (actionType === 'evaluate') {
        wx.showModal({
          title: '提交成功',
          content: '您的项目已提交给专家团队，我们将在 24小时内 通过"系统消息"为您发送详细的评估报告，请耐心等待，您可在"我的项目"中查看评估状态。',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
      } else {
        wx.showModal({
          title: '感谢您的发布！',
          content: '您的项目已提交给审核团队，我们将在 24小时内 通过"系统消息"公布审核结果，请耐心等待，您可在"我的项目"中查看审核状态。',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
      }
    }, 1500);
  }
});

