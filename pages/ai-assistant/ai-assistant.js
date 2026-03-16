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
    isAiTyping: false,
    // 使用统计
    todayUsed: 0,
    dailyLimit: 30,
    remainingQuota: 30
  },

  onLoad(options) {
    // 加载本地缓存的聊天记录
    this.loadChatHistory();
    // 加载系统消息
    this.loadSystemMessages();
    // 加载使用统计
    this.loadUsageStats();
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
  async loadSystemMessages() {
    try {
      wx.showLoading({ title: '加载中...' });
      
      // 从云数据库获取系统消息（按当前用户的 openid）
      const db = wx.cloud.database();
      
      // 调用云函数获取当前用户的 openid
      const res = await wx.cloud.callFunction({
        name: 'reviewer',
        data: {
          action: 'getUserMessages'
        }
      });

      console.log('云函数返回:', res);

      if (!res.result || !res.result.success) {
        throw new Error('获取消息失败');
      }

      const messages = (res.result.data || []).map((msg, index) => {
        return {
          id: msg._id || index,
          title: msg.title || '系统通知',
          preview: this.getMessagePreview(msg.content),
          time: this.formatMessageTime(msg.createdTime),
          read: msg.status === 'read',
          type: msg.type || 'system',
          inviteCode: msg.inviteCode || '',
          actionText: this.getActionText(msg.type),
          fullContent: msg.content || '',
          _id: msg._id // 保存原始ID用于标记已读
        };
      });
      
      console.log('格式化后的消息:', messages);
      
      const unreadCount = messages.filter(m => !m.read).length;
      
      this.setData({
        messages,
        unreadCount
      });
      
      wx.hideLoading();
      
    } catch (error) {
      console.error('加载系统消息失败:', error);
      wx.hideLoading();
      
      // 如果加载失败，使用空数组
      this.setData({
        messages: [],
        unreadCount: 0
      });
      
      wx.showToast({
        title: '加载消息失败',
        icon: 'none'
      });
    }
  },

  // 获取消息预览文本（前30个字符）
  getMessagePreview(content) {
    if (!content) return '';
    return content.length > 30 ? content.substring(0, 30) + '...' : content;
  },

  // 格式化消息时间
  formatMessageTime(date) {
    if (!date) return '';
    
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    
    // 小于1小时
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return minutes <= 1 ? '刚刚' : `${minutes}分钟前`;
    }
    
    // 小于24小时
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}小时前`;
    }
    
    // 小于7天
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days}天前`;
    }
    
    // 超过7天，显示具体日期
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    
    return `${month}月${day}日 ${hour}:${minute}`;
  },

  // 根据消息类型获取操作按钮文字
  getActionText(type) {
    const actionTexts = {
      'school_approved': '复制邀请码',
      'school_rejected': '',
      'project_approved': '',
      'project_rejected': '查看反馈',
      'evaluation': '查看反馈详情',
      'system': ''
    };
    return actionTexts[type] || '';
  },

  // 更新未读数
  updateUnreadCount() {
    const unreadCount = this.data.messages.filter(m => !m.read).length;
    this.setData({
      unreadCount
    });
  },

  // 查看消息
  async viewMessage(e) {
    const { id } = e.currentTarget.dataset;
    const { messages } = this.data;
    
    const message = messages.find(m => m.id === id);
    if (!message) return;
    
    // 跳转到消息详情页
    wx.navigateTo({
      url: `/pages/message-detail/message-detail?id=${message._id || id}`
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
  async sendMessage() {
    const { inputText, chatHistory, remainingQuota } = this.data;
    
    if (!inputText || !inputText.trim()) {
      wx.showToast({
        title: '请输入内容',
        icon: 'none'
      });
      return;
    }

    // 检查剩余次数
    if (remainingQuota <= 0) {
      wx.showModal({
        title: '提问次数已用完',
        content: '您今天的提问次数已用完（30次），明天再来吧！\n\n💡提示：合理规划问题可以更高效地使用AI助手。',
        showCancel: false
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
    
    // 调用云函数
    try {
      const res = await wx.cloud.callFunction({
        name: 'ai-assistant',
        data: {
          action: 'chat',
          message: userMessage.content,
          sessionId: this.data.sessionId || undefined
        }
      });

      console.log('AI返回:', res);

      if (!res.result || !res.result.success) {
        // 处理限额超出错误
        if (res.result?.code === 'QUOTA_EXCEEDED') {
          wx.showModal({
            title: '提问次数已用完',
            content: res.result.message,
            showCancel: false
          });
          this.setData({
            isAiTyping: false,
            remainingQuota: 0
          });
          return;
        }
        
        throw new Error(res.result?.message || '请求失败');
      }

      // 更新剩余次数
      if (res.result.data.remainingQuota !== undefined) {
        this.setData({
          remainingQuota: res.result.data.remainingQuota
        });
      }

      this.receiveAIResponse(res.result.data);
    } catch (error) {
      console.error('AI调用失败:', error);
      wx.showToast({
        title: '发送失败，请重试',
        icon: 'none'
      });
      
      // 移除用户消息
      chatHistory.pop();
      this.setData({
        chatHistory,
        isAiTyping: false
      });
      wx.setStorageSync('chatHistory', chatHistory);
    }
  },

  // 接收AI回复
  receiveAIResponse(userInput) {
    const { chatHistory } = this.data;
    
    // 调用云函数获取AI回复
    this.callAIAssistant(userInput);
  },

  // 调用AI助手云函数
  async callAIAssistant(message) {
    try {
      const { currentSessionId, chatHistory } = this.data;
      
      // 获取项目上下文
      const projectContext = wx.getStorageSync('currentProject') || null;
      
      const result = await wx.cloud.callFunction({
        name: 'ai-assistant',
        data: {
          action: 'chat',
          message: message,
          sessionId: currentSessionId,
          projectContext: projectContext
        }
      });

      console.log('AI助手响应:', result);

      if (result.result && result.result.success) {
        const data = result.result.data;
        
        // 保存会话ID
        if (data.sessionId && !currentSessionId) {
          this.setData({ currentSessionId: data.sessionId });
        }

        // 添加AI消息
        const aiMessage = {
          id: Date.now(),
          sender: 'ai',
          content: data.message,
          time: this.formatTime(new Date()),
          toolCalls: data.toolCalls || [],
          suggestions: data.suggestions || []
        };
        
        chatHistory.push(aiMessage);
        
        this.setData({
          chatHistory,
          isAiTyping: false,
          scrollToId: `msg-${aiMessage.id}`
        });
        
        // 保存到本地
        wx.setStorageSync('chatHistory', chatHistory);
      } else {
        throw new Error(result.result?.message || 'AI回复失败');
      }

    } catch (error) {
      console.error('AI助手调用失败:', error);
      
      // 降级到本地响应
      const aiMessage = {
        id: Date.now(),
        sender: 'ai',
        content: '抱歉，AI服务暂时不可用。请稍后再试。',
        time: this.formatTime(new Date())
      };
      
      const { chatHistory } = this.data;
      chatHistory.push(aiMessage);
      
      this.setData({
        chatHistory,
        isAiTyping: false,
        scrollToId: `msg-${aiMessage.id}`
      });
    }
  },

  // 格式化时间
  formatTime(date) {
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${hour}:${minute}`;
  },

  // 处理建议按钮点击
  handleSuggestion(e) {
    const { suggestion } = e.currentTarget.dataset;
    
    if (!suggestion) return;

    switch (suggestion.action) {
      case 'search_more':
        this.setData({ inputText: '搜索更多案例' });
        this.sendMessage();
        break;
      
      case 'apply_to_project':
        this.applyToProject(suggestion);
        break;
      
      case 'regenerate':
        this.setData({ inputText: '重新生成' });
        this.sendMessage();
        break;
      
      case 'start_design':
        wx.navigateTo({
          url: '/pages/project-design/project-design'
        });
        break;
      
      case 'view_case':
        if (suggestion.caseId) {
          wx.navigateTo({
            url: `/pages/case-detail/case-detail?id=${suggestion.caseId}`
          });
        }
        break;
      
      default:
        if (suggestion.text) {
          this.setData({ inputText: suggestion.text });
          this.sendMessage();
        }
    }
  },

  // 应用到项目
  applyToProject(suggestion) {
    wx.showModal({
      title: '应用到项目',
      content: '是否将AI生成的内容应用到项目设计中？',
      success: (res) => {
        if (res.confirm) {
          // 保存到本地，项目设计页面会读取
          wx.setStorageSync('aiSuggestion', suggestion);
          
          wx.showToast({
            title: '已保存建议',
            icon: 'success'
          });
          
          setTimeout(() => {
            wx.navigateTo({
              url: '/pages/project-design/project-design?fromAI=1'
            });
          }, 1500);
        }
      }
    });
  },

  // 清除会话
  async clearChat() {
    wx.showModal({
      title: '清除对话',
      content: '确定要清除当前对话记录吗？',
      success: async (res) => {
        if (res.confirm) {
          const { currentSessionId } = this.data;
          
          // 调用云函数清除会话
          if (currentSessionId) {
            await wx.cloud.callFunction({
              name: 'ai-assistant',
              data: {
                action: 'clearSession',
                sessionId: currentSessionId
              }
            });
          }
          
          // 清除本地数据
          this.setData({
            chatHistory: [],
            currentSessionId: null
          });
          wx.removeStorageSync('chatHistory');
          
          wx.showToast({
            title: '已清除',
            icon: 'success'
          });
        }
      }
    });
  },

  // 加载使用统计
  async loadUsageStats() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'ai-assistant',
        data: {
          action: 'getUsageStats'
        }
      });

      if (res.result && res.result.success) {
        this.setData({
          todayUsed: res.result.data.todayUsed,
          dailyLimit: res.result.data.dailyLimit,
          remainingQuota: res.result.data.remaining
        });
      }
    } catch (error) {
      console.error('加载使用统计失败:', error);
      // 失败时使用默认值
      this.setData({
        todayUsed: 0,
        dailyLimit: 30,
        remainingQuota: 30
      });
    }
  }
});
