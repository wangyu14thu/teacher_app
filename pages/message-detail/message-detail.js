// pages/message-detail/message-detail.js
Page({
  data: {
    messageId: '',
    message: {}
  },

  onLoad(options) {
    const { id } = options;
    if (id) {
      this.setData({ messageId: id });
      this.loadMessageDetail(id);
    }
  },

  /**
   * 加载消息详情
   */
  async loadMessageDetail(id) {
    try {
      wx.showLoading({ title: '加载中...' });

      // 调用云函数获取消息详情
      const result = await wx.cloud.callFunction({
        name: 'reviewer',
        data: {
          action: 'getMessageDetail',
          messageId: id
        }
      });

      console.log('消息详情:', result);

      if (result.result && result.result.success && result.result.data) {
        const msg = result.result.data;
        
        this.setData({
          message: {
            title: msg.title || '系统通知',
            fullContent: msg.content || '',
            time: this.formatTime(msg.createdTime),
            inviteCode: msg.inviteCode || '',
            type: msg.type || 'system',
            _id: msg._id
          }
        });

        // 自动标记为已读
        this.markAsRead(id);
      } else {
        throw new Error('消息不存在');
      }

      wx.hideLoading();

    } catch (error) {
      console.error('加载消息失败:', error);
      wx.hideLoading();
      wx.showModal({
        title: '加载失败',
        content: '无法加载消息详情',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
    }
  },

  /**
   * 标记消息为已读
   */
  async markAsRead(messageId) {
    try {
      const db = wx.cloud.database();
      await db.collection('system_messages')
        .doc(messageId)
        .update({
          data: {
            status: 'read'
          }
        });
      console.log('消息已标记为已读');
    } catch (error) {
      console.error('标记已读失败:', error);
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

  /**
   * 复制邀请码
   */
  copyInviteCode() {
    const { inviteCode } = this.data.message;
    if (!inviteCode) return;

    wx.setClipboardData({
      data: inviteCode,
      success: () => {
        wx.showToast({
          title: '邀请码已复制',
          icon: 'success'
        });
      }
    });
  },

  /**
   * 删除消息
   */
  deleteMessage() {
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这条消息吗？',
      confirmText: '删除',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (res.confirm) {
          await this.doDeleteMessage();
        }
      }
    });
  },

  /**
   * 执行删除
   */
  async doDeleteMessage() {
    wx.showLoading({ title: '删除中...', mask: true });

    try {
      const db = wx.cloud.database();
      await db.collection('system_messages')
        .doc(this.data.messageId)
        .remove();

      wx.hideLoading();
      wx.showToast({
        title: '删除成功',
        icon: 'success',
        duration: 1500
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

    } catch (error) {
      console.error('删除消息失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    }
  }
});

