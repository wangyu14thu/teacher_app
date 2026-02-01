// pages/admin/knowledge-upload.js
Page({
  data: {
    grades: ['1年级', '2年级', '3年级', '4年级', '5年级', '6年级'],
    formData: {
      title: '',
      gradeIndex: 0,
      subject: '',
      drivingQuestion: '',
      interdisciplinaryConcept: '',
      content: '',
      keyPointsText: ''
    },
    knowledgeList: []
  },

  onLoad() {
    this.loadKnowledgeList();
  },

  // 表单输入
  onTitleInput(e) {
    this.setData({ 'formData.title': e.detail.value });
  },

  onGradeChange(e) {
    this.setData({ 'formData.gradeIndex': parseInt(e.detail.value) });
  },

  onSubjectInput(e) {
    this.setData({ 'formData.subject': e.detail.value });
  },

  onDrivingQuestionInput(e) {
    this.setData({ 'formData.drivingQuestion': e.detail.value });
  },

  onConceptInput(e) {
    this.setData({ 'formData.interdisciplinaryConcept': e.detail.value });
  },

  onContentInput(e) {
    this.setData({ 'formData.content': e.detail.value });
  },

  onKeyPointsInput(e) {
    this.setData({ 'formData.keyPointsText': e.detail.value });
  },

  // 提交知识
  async submitKnowledge() {
    const { formData, grades } = this.data;

    // 验证
    if (!formData.title || !formData.content) {
      wx.showToast({
        title: '请填写标题和内容',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '提交中...', mask: true });

    try {
      // 处理关键点
      const keyPoints = formData.keyPointsText 
        ? formData.keyPointsText.split(/[,，]/).map(k => k.trim()).filter(k => k)
        : [];

      // 调用云函数
      const result = await wx.cloud.callFunction({
        name: 'ai-assistant',
        data: {
          action: 'uploadKnowledge',
          caseData: {
            title: formData.title,
            grade: formData.gradeIndex + 1,
            subject: formData.subject || '综合',
            content: formData.content,
            drivingQuestion: formData.drivingQuestion,
            interdisciplinaryConcept: formData.interdisciplinaryConcept,
            keyPoints: keyPoints
          }
        }
      });

      wx.hideLoading();

      if (result.result && result.result.success) {
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        });

        // 清空表单
        this.setData({
          formData: {
            title: '',
            gradeIndex: 0,
            subject: '',
            drivingQuestion: '',
            interdisciplinaryConcept: '',
            content: '',
            keyPointsText: ''
          }
        });

        // 刷新列表
        this.loadKnowledgeList();
      } else {
        throw new Error(result.result?.message || '添加失败');
      }

    } catch (error) {
      console.error('提交知识失败:', error);
      wx.hideLoading();
      wx.showModal({
        title: '提交失败',
        content: error.message,
        showCancel: false
      });
    }
  },

  // 加载知识库列表
  async loadKnowledgeList() {
    wx.showLoading({ title: '加载中...' });

    try {
      const result = await wx.cloud.callFunction({
        name: 'ai-assistant',
        data: {
          action: 'getKnowledgeList'
        }
      });

      wx.hideLoading();

      if (result.result && result.result.success) {
        const list = result.result.data.map(item => ({
          ...item,
          uploadTime: this.formatTime(item.uploadTime)
        }));

        this.setData({ knowledgeList: list });
      }

    } catch (error) {
      console.error('加载知识库失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 删除知识
  async deleteKnowledge(e) {
    const { id } = e.currentTarget.dataset;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条知识吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });

          try {
            const db = wx.cloud.database();
            await db.collection('knowledge_base').doc(id).remove();

            wx.hideLoading();
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });

            this.loadKnowledgeList();

          } catch (error) {
            console.error('删除失败:', error);
            wx.hideLoading();
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 格式化时间
  formatTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }
});

