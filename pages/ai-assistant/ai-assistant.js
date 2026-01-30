// pages/ai-assistant/ai-assistant.js
Page({
  data: {
    currentTab: 'messages',
    unreadCount: 2,
    messages: [
      {
        id: 1,
        title: '学校团队创建成功',
        preview: '恭喜！您申请的"翠微小学"团队已创建成功',
        time: '2小时前',
        read: false,
        type: 'invite_code',
        inviteCode: 'X7B9F2',
        actionText: '',
        fullContent: '恭喜！您申请的"翠微小学"团队已创建成功。学校邀请码为：X7B9F2。请将该码分享给本校同事，邀请他们加入。'
      },
      {
        id: 2,
        title: '您的项目收到专家反馈',
        preview: '您的项目《智慧校园改造计划》已完成评估',
        time: '昨天 15:30',
        read: false,
        type: 'evaluation',
        actionText: '查看反馈详情',
        fullContent: '您的项目《智慧校园改造计划》评估已完成。专家建议：1. 跨学科概念可以更加明确... 2. 子问题链建议增加实践环节...'
      },
      {
        id: 3,
        title: '项目审核通过',
        preview: '恭喜！您的项目已通过审核，奖励您5积分！',
        time: '1月28日',
        read: true,
        type: 'approval',
        actionText: '',
        fullContent: '恭喜！您的项目《小小规划师》已通过审核，奖励您5积分！项目已发布到平台项目库。'
      }
    ],
    chatHistory: [],
    inputText: '',
    scrollToId: '',
    isAiTyping: false
  },

  onLoad(options) {
    // 加载本地缓存的聊天记录
    this.loadChatHistory();
    // 加载系统消息
    this.loadSystemMessages();
  },

  onShow() {
    // 刷新未读消息数
    this.updateUnreadCount();
  },

  // 切换标签
  switchTab(e) {
    const { tab } = e.currentTarget.dataset;
    this.setData({
      currentTab: tab
    });
  },

  // 加载聊天记录
  loadChatHistory() {
    const history = wx.getStorageSync('chatHistory') || [];
    this.setData({
      chatHistory: history
    });
    
    // 滚动到最新消息
    if (history.length > 0) {
      this.setData({
        scrollToId: `msg-${history[history.length - 1].id}`
      });
    }
  },

  // 加载系统消息
  loadSystemMessages() {
    // TODO: 从云端加载系统消息
    // 这里使用模拟数据
    const messages = wx.getStorageSync('systemMessages') || this.data.messages;
    const unreadCount = messages.filter(m => !m.read).length;
    
    this.setData({
      messages,
      unreadCount
    });
  },

  // 更新未读数
  updateUnreadCount() {
    const unreadCount = this.data.messages.filter(m => !m.read).length;
    this.setData({
      unreadCount
    });
  },

  // 查看消息
  viewMessage(e) {
    const { id } = e.currentTarget.dataset;
    const { messages } = this.data;
    
    const message = messages.find(m => m.id === id);
    if (!message) return;
    
    // 标记为已读
    message.read = true;
    this.setData({
      messages
    });
    wx.setStorageSync('systemMessages', messages);
    this.updateUnreadCount();
    
    // 显示完整内容
    wx.showModal({
      title: message.title,
      content: message.fullContent,
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  // 复制邀请码
  copyCode(e) {
    e.stopPropagation();
    const { code } = e.currentTarget.dataset;
    
    wx.setClipboardData({
      data: code,
      success: () => {
        wx.showToast({
          title: '邀请码已复制',
          icon: 'success'
        });
      }
    });
  },

  // 消息操作
  handleMessageAction(e) {
    e.stopPropagation();
    const { id } = e.currentTarget.dataset;
    const message = this.data.messages.find(m => m.id === id);
    
    if (message.type === 'evaluation') {
      // 跳转到项目编辑页
      wx.navigateTo({
        url: '/pages/project-design/project-design'
      });
    }
  },

  // 输入变化
  onInputChange(e) {
    this.setData({
      inputText: e.detail.value
    });
  },

  // 发送消息
  sendMessage() {
    const { inputText, chatHistory } = this.data;
    
    if (!inputText || !inputText.trim()) {
      wx.showToast({
        title: '请输入内容',
        icon: 'none'
      });
      return;
    }

    // 添加用户消息
    const userMessage = {
      id: Date.now(),
      sender: 'user',
      content: inputText.trim(),
      time: this.formatTime(new Date())
    };
    
    chatHistory.push(userMessage);
    
    this.setData({
      chatHistory,
      inputText: '',
      isAiTyping: true,
      scrollToId: `msg-${userMessage.id}`
    });
    
    // 保存到本地
    wx.setStorageSync('chatHistory', chatHistory);
    
    // 模拟AI回复
    setTimeout(() => {
      this.receiveAIResponse(inputText);
    }, 1500);
  },

  // 接收AI回复
  receiveAIResponse(userInput) {
    const { chatHistory } = this.data;
    
    // TODO: 调用AI接口获取真实回复
    // 这里使用模拟回复
    let aiResponse = '您好！我是您的AI助手。';
    
    if (userInput.includes('项目') || userInput.includes('设计')) {
      aiResponse = '关于项目设计，我建议您从以下几个方面入手：\n\n1. 明确项目主题和现实背景\n2. 确定跨学科概念\n3. 设计驱动性问题\n4. 规划子问题链\n\n您想了解哪个方面的具体内容呢？';
    } else if (userInput.includes('跨学科')) {
      aiResponse = '跨学科概念是项目式学习的核心。一个好的跨学科概念应该：\n\n• 能够贯穿多个学科\n• 具有较强的抽象性\n• 与学生生活相关\n• 有助于深度理解\n\n例如："结构与功能"、"因果关系"、"系统与要素"等。';
    } else if (userInput.includes('驱动性问题')) {
      aiResponse = '驱动性问题通常采用以下格式：\n\n"作为[角色]，如何为[受众]解决[问题]或设计[产品]，达到[效果]或实现[目的]？"\n\n例如："作为小小规划师，我们如何为学校设计一套智慧校园改造方案，让校园环境更美好、更智能、更适合学习？"';
    }
    
    const aiMessage = {
      id: Date.now(),
      sender: 'ai',
      content: aiResponse,
      time: this.formatTime(new Date())
    };
    
    chatHistory.push(aiMessage);
    
    this.setData({
      chatHistory,
      isAiTyping: false,
      scrollToId: `msg-${aiMessage.id}`
    });
    
    // 保存到本地
    wx.setStorageSync('chatHistory', chatHistory);
  },

  // 格式化时间
  formatTime(date) {
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${hour}:${minute}`;
  }
});
