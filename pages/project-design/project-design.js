// pages/project-design/project-design.js
Page({
  data: {
    formData: {
      projectName: '',
      subjects: '',
      grade: '',
      hours: '',
      overview: '',
      basisWorld: '',
      basisCurriculum: '',
      basisStudents: '',
      interdisciplinaryConcept: '',
      drivingQuestion: '',
      subQuestions: '',
      finalOutcome: '',
      presentationForm: '',
      launchGoals: '',
      launchHours: '',
      launchActivity: '',
      launchOutcome: '',
      launchEvaluation: '',
      projectGoals: ''
    },
    inquiryPhases: [
      {
        question: '',
        goals: '',
        hours: '',
        activity: '',
        outcome: '',
        evaluation: ''
      }
    ],
    showStandardModal: false,
    agreed: false,
    actionType: '' // 'evaluate' 或 'publish'
  },

  onLoad(options) {
    // 如果是编辑模式，加载项目数据
    if (options.projectId) {
      this.loadProjectData(options.projectId);
    }
  },

  // 加载项目数据
  loadProjectData(projectId) {
    // TODO: 从云数据库加载项目数据
    wx.showLoading({ title: '加载中...' });
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '数据加载功能开发中',
        icon: 'none'
      });
    }, 500);
  },

  // 一键导入 - 从"我的项目"中选择
  importProject() {
    wx.showLoading({ title: '加载项目...' });
    
    // 获取我的项目列表
    const myProjects = wx.getStorageSync('myDesignedProjects') || [];
    const purchasedProjects = wx.getStorageSync('myPurchasedProjects') || [];
    const allMyProjects = [...myProjects, ...purchasedProjects];
    
    wx.hideLoading();
    
    if (allMyProjects.length === 0) {
      wx.showModal({
        title: '提示',
        content: '您还没有已保存或购买的项目，无法导入。您可以先去项目案例中购买项目，或保存一个项目后再导入。',
        showCancel: false
      });
      return;
    }
    
    // 准备选项列表
    const projectTitles = allMyProjects.map(p => p.title || p.projectName);
    
    wx.showActionSheet({
      itemList: projectTitles,
      success: (res) => {
        const selectedProject = allMyProjects[res.tapIndex];
        this.fillProjectData(selectedProject);
        wx.showToast({
          title: '导入成功',
          icon: 'success'
        });
      }
    });
  },
  
  // 填充项目数据
  fillProjectData(project) {
    const formData = {
      projectName: project.title || project.projectName || '',
      subjects: project.subject || project.subjects || '',
      grade: project.grade || '',
      hours: project.hours || '',
      overview: project.overview || '',
      basisWorld: project.basisWorld || '',
      basisCurriculum: project.basisCurriculum || '',
      basisStudents: project.basisStudents || '',
      interdisciplinaryConcept: project.interdisciplinaryConcept || '',
      drivingQuestion: project.drivingQuestion || '',
      subQuestions: project.subQuestions || '',
      finalOutcome: project.finalOutcome || '',
      presentationForm: project.presentationForm || '',
      launchGoal: project.launchGoal || '',
      launchHours: project.launchHours || '',
      launchActivity: project.launchActivity || '',
      launchOutcome: project.launchOutcome || '',
      launchEvaluation: project.launchEvaluation || '',
      projectGoals: project.projectGoals || ''
    };
    
    // 探究阶段数据
    const inquiryPhases = project.inquiryPhases || [];
    
    this.setData({
      formData,
      inquiryPhases
    });
  },

  // 基本信息输入
  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  // 探究阶段输入
  onInquiryInputChange(e) {
    const { index, field } = e.currentTarget.dataset;
    const { value } = e.detail;
    const inquiryPhases = this.data.inquiryPhases;
    inquiryPhases[index][field] = value;
    this.setData({
      inquiryPhases
    });
  },

  // 添加探究阶段
  addInquiry() {
    const inquiryPhases = this.data.inquiryPhases;
    inquiryPhases.push({
      question: '',
      goals: '',
      hours: '',
      activity: '',
      outcome: '',
      evaluation: ''
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
  deleteInquiry(e) {
    const { index } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个子问题吗？',
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

  // AI生成内容
  generateContent(e) {
    const { type, index } = e.currentTarget.dataset;
    
    wx.showLoading({ title: 'AI生成中...' });
    
    // TODO: 调用AI接口生成内容
    setTimeout(() => {
      wx.hideLoading();
      
      // 模拟生成的内容
      let generatedContent = '';
      
      switch(type) {
        case 'interdisciplinaryConcept':
          generatedContent = '【AI生成示例】结构与功能：物体的结构决定其功能，通过理解和设计结构可以优化功能表现。';
          this.setData({
            'formData.interdisciplinaryConcept': generatedContent
          });
          break;
        case 'drivingQuestion':
          generatedContent = '【AI生成示例】作为小小工程师，我们如何为班级同学设计一款既安全又有趣的课间游戏器材，让大家在课间10分钟内既能放松身心又能锻炼身体？';
          this.setData({
            'formData.drivingQuestion': generatedContent
          });
          break;
        case 'subQuestions':
          generatedContent = '【AI生成示例】\n子问题1：同学们课间最喜欢什么活动？\n子问题2：什么样的游戏既安全又有趣？\n子问题3：如何设计游戏规则？\n子问题4：需要准备哪些材料？';
          this.setData({
            'formData.subQuestions': generatedContent
          });
          break;
        case 'launchPhase':
          this.setData({
            'formData.launchGoals': '【AI生成示例】1. 了解项目背景和目标\n2. 激发学生参与兴趣\n3. 初步形成问题意识',
            'formData.launchActivity': '【AI生成示例】观看视频、小组讨论、头脑风暴',
            'formData.launchOutcome': '【AI生成示例】形成初步的项目研究方向',
            'formData.launchEvaluation': '【AI生成示例】观察学生参与度和讨论质量'
          });
          break;
        case 'inquiryPhase':
          const inquiryPhases = this.data.inquiryPhases;
          inquiryPhases[index] = {
            ...inquiryPhases[index],
            goals: '【AI生成示例】掌握调查方法，学会数据收集与分析',
            activity: '【AI生成示例】设计调查问卷，开展实地调查，统计分析数据',
            outcome: '【AI生成示例】完成调查报告和数据分析图表',
            evaluation: '【AI生成示例】评估问卷设计的合理性和数据分析的准确性'
          };
          this.setData({
            inquiryPhases
          });
          break;
        case 'projectGoals':
          generatedContent = '【AI生成示例】\n1. 探究任务：通过实地调查和数据分析，了解同学们的课间需求\n2. 知识运用：统计学、人体工学、材料科学\n3. 成果产出：设计方案、原型模型、使用说明书\n4. 素养培育：创新思维、团队协作、问题解决能力';
          this.setData({
            'formData.projectGoals': generatedContent
          });
          break;
      }
      
      wx.showToast({
        title: '生成成功',
        icon: 'success'
      });
    }, 1500);
  },

  // 保存项目
  saveProject() {
    // 验证必填项
    if (!this.validateForm()) {
      return;
    }

    wx.showLoading({ title: '保存中...' });
    
    // 保存到本地存储
    const projectData = {
      id: Date.now(), // 使用时间戳作为ID
      title: this.data.formData.projectName,
      grade: this.data.formData.grade,
      subject: this.data.formData.subjects,
      status: 'draft',
      statusText: '草稿',
      updateTime: '刚刚',
      ...this.data.formData,
      inquiryPhases: this.data.inquiryPhases,
      createTime: new Date().getTime()
    };

    // 获取现有项目列表
    let myProjects = wx.getStorageSync('myDesignedProjects') || [];
    myProjects.unshift(projectData); // 添加到列表开头
    
    // 保存到本地存储
    wx.setStorageSync('myDesignedProjects', myProjects);
    
    setTimeout(() => {
      wx.hideLoading();
      wx.showModal({
        title: '保存成功',
        content: '项目已保存到"我的项目"',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
    }, 500);
  },

  // 申请专家评估
  applyEvaluation() {
    // 验证必填项
    if (!this.validateForm()) {
      return;
    }

    this.setData({
      showStandardModal: true,
      actionType: 'evaluate',
      agreed: false
    });
  },

  // 发布项目
  publishProject() {
    // 验证必填项
    if (!this.validateForm()) {
      return;
    }

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
  async confirmAction() {
    if (!this.data.agreed) {
      return;
    }

    const actionType = this.data.actionType;
    this.closeStandardModal();

    wx.showLoading({ title: '提交中...', mask: true });

    try {
      // 获取教师信息
      const teacherInfo = wx.getStorageSync('teacherInfo') || {};
      
      // 准备项目数据
      const projectData = {
        // 基本信息
        projectName: this.data.formData.projectName,
        subjects: this.data.formData.subjects,
        grade: this.data.formData.grade,
        classHours: this.data.formData.classHours,
        projectOverview: this.data.formData.projectOverview,
        
        // 立项依据
        realWorldBasis: this.data.formData.realWorldBasis,
        curriculumBasis: this.data.formData.curriculumBasis,
        studentBasis: this.data.formData.studentBasis,
        
        // 跨学科概念与项目框架
        interdisciplinaryConcept: this.data.formData.interdisciplinaryConcept,
        drivingQuestion: this.data.formData.drivingQuestion,
        subQuestions: this.data.formData.subQuestions,
        finalProduct: this.data.formData.finalProduct,
        presentationForm: this.data.formData.presentationForm,
        
        // 项目启动
        launchGoals: this.data.formData.launchGoals,
        launchHours: this.data.formData.launchHours,
        launchActivity: this.data.formData.launchActivity,
        launchOutcome: this.data.formData.launchOutcome,
        launchAssessment: this.data.formData.launchAssessment,
        
        // 项目探究阶段
        inquiryPhases: this.data.inquiryPhases,
        
        // 项目目标
        projectGoals: this.data.formData.projectGoals,
        
        // 教师信息
        teacherInfo: teacherInfo,
        
        // 提交类型
        submitType: actionType, // 'evaluate' 或 'publish'
        
        // 时间戳
        createTime: new Date()
      };

      console.log('准备提交项目:', projectData);

      // 调用云函数提交项目
      const result = await wx.cloud.callFunction({
        name: 'school-application',
        data: {
          action: 'submitProject',
          projectData: projectData
        }
      });

      console.log('项目提交结果:', result);

      wx.hideLoading();

      if (result.result && result.result.success) {
        // 同时保存到本地（用于"我的项目"显示）
        const localProject = {
          id: result.result.data.projectId,
          title: projectData.projectName,
          grade: projectData.grade,
          subject: projectData.subjects,
          status: actionType === 'evaluate' ? 'evaluating' : 'reviewing',
          statusText: actionType === 'evaluate' ? '评估中' : '审核中',
          updateTime: '刚刚',
          ...projectData,
          _id: result.result.data.projectId
        };

        let myProjects = wx.getStorageSync('myDesignedProjects') || [];
        myProjects.unshift(localProject);
        wx.setStorageSync('myDesignedProjects', myProjects);

        // 显示成功提示
        if (actionType === 'evaluate') {
          wx.showModal({
            title: '提交成功',
            content: '您的项目已提交给专家团队，我们将在 24小时内 通过"系统消息"为您发送详细的评估报告，请耐心等待，您可在"我的项目"中查看评估状态。',
            showCancel: false,
            confirmText: '我知道了',
            success: () => {
              wx.navigateBack();
            }
          });
        } else {
          wx.showModal({
            title: '感谢您的发布！',
            content: '您的项目已提交给审核团队，我们将在 24小时内 通过"系统消息"公布审核结果，请耐心等待，您可在"我的项目"中查看审核状态。',
            showCancel: false,
            confirmText: '我知道了',
            success: () => {
              wx.navigateBack();
            }
          });
        }
      } else {
        throw new Error(result.result?.message || '提交失败');
      }

    } catch (error) {
      console.error('提交项目失败:', error);
      wx.hideLoading();
      wx.showModal({
        title: '提交失败',
        content: error.message || '网络错误，请稍后重试',
        showCancel: false
      });
    }
  },
            wx.navigateBack();
          }
        });
      }
    }, 1500);
  },

  // 表单验证
  validateForm() {
    const { formData } = this.data;
    
    if (!formData.projectName) {
      wx.showToast({
        title: '请输入项目名称',
        icon: 'none'
      });
      return false;
    }
    
    if (!formData.grade) {
      wx.showToast({
        title: '请输入年级',
        icon: 'none'
      });
      return false;
    }
    
    if (!formData.overview) {
      wx.showToast({
        title: '请输入项目概述',
        icon: 'none'
      });
      return false;
    }
    
    return true;
  }
});

