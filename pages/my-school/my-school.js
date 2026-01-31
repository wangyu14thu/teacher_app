// pages/my-school/my-school.js
Page({
  data: {
    hasSchool: false,
    schoolInfo: {
      name: '',
      memberCount: 0,
      totalQuota: 100,
      remainingQuota: 0,
      inviteCode: '',
      adminName: '',
      schoolAddress: '',
      schoolSize: '',
      createdTime: '',
      isAdmin: false // 是否是管理员
    },
    members: [], // 学校成员列表
    showJoinModal: false,
    inviteCodeInput: ''
  },

  onLoad(options) {
    this.loadSchoolInfo();
  },

  onShow() {
    // 每次显示时刷新数据
    this.loadSchoolInfo();
  },

  // 加载学校信息
  async loadSchoolInfo() {
    wx.showLoading({ title: '加载中...' });
    
    try {
      // 调用云函数获取当前用户创建/加入的学校
      const result = await wx.cloud.callFunction({
        name: 'school-application',
        data: {
          action: 'getMySchool'
        }
      });

      console.log('获取学校信息结果:', result);

      wx.hideLoading();

      if (result.result && result.result.success && result.result.data) {
        const school = result.result.data;
        const teacherInfo = wx.getStorageSync('teacherInfo') || {};
        
        // 判断是否是管理员
        const isAdmin = school.adminOpenid === teacherInfo.openid || 
                       school.adminId === teacherInfo.userId;
        
        this.setData({
          hasSchool: true,
          schoolInfo: {
            name: school.schoolName || '',
            memberCount: school.memberCount || 1,
            totalQuota: school.downloadQuota || 100,
            remainingQuota: school.downloadQuota - (school.usedQuota || 0),
            inviteCode: school.inviteCode || '',
            adminName: school.adminName || '',
            schoolAddress: school.schoolAddress || '',
            schoolSize: school.schoolSize || '',
            createdTime: this.formatTime(school.createdTime),
            isAdmin: isAdmin
          }
        });

        // 加载学校成员列表
        this.loadSchoolMembers();
      } else {
        // 没有学校信息
        this.setData({
          hasSchool: false
        });
      }
      
    } catch (error) {
      console.error('加载学校信息失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      
      this.setData({
        hasSchool: false
      });
    }
  },

  // 格式化时间
  formatTime(date) {
    if (!date) return '';
    
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  },

  // 复制邀请码
  copyInviteCode() {
    const { inviteCode } = this.data.schoolInfo;
    if (!inviteCode) {
      wx.showToast({
        title: '邀请码不存在',
        icon: 'none'
      });
      return;
    }

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

  // 前往项目库
  goToCases() {
    wx.navigateTo({
      url: '/pages/cases/cases'
    });
  },

  // 显示加入学校弹窗
  showJoinSchool() {
    this.setData({
      showJoinModal: true,
      inviteCodeInput: ''
    });
  },

  // 关闭加入学校弹窗
  closeJoinModal() {
    this.setData({
      showJoinModal: false,
      inviteCodeInput: ''
    });
  },

  // 输入邀请码
  onInviteCodeInput(e) {
    this.setData({
      inviteCodeInput: e.detail.value.toUpperCase() // 转大写
    });
  },

  // 确认加入学校
  async confirmJoinSchool() {
    const { inviteCodeInput } = this.data;

    if (!inviteCodeInput || inviteCodeInput.trim() === '') {
      wx.showToast({
        title: '请输入邀请码',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '验证中...', mask: true });

    try {
      // 调用云函数验证邀请码并加入学校
      const result = await wx.cloud.callFunction({
        name: 'school-application',
        data: {
          action: 'joinSchoolByCode',
          inviteCode: inviteCodeInput.trim()
        }
      });

      console.log('加入学校结果:', result);

      wx.hideLoading();

      if (result.result && result.result.success) {
        this.closeJoinModal();
        wx.showToast({
          title: '加入成功！',
          icon: 'success',
          duration: 2000
        });

        // 重新加载学校信息
        setTimeout(() => {
          this.loadSchoolInfo();
        }, 2000);
      } else {
        wx.showModal({
          title: '加入失败',
          content: result.result?.message || '邀请码无效或已失效',
          showCancel: false
        });
      }

    } catch (error) {
      console.error('加入学校失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '加入失败',
        icon: 'none'
      });
    }
  },

  // 加载学校成员列表
  async loadSchoolMembers() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'school-application',
        data: {
          action: 'getSchoolMembers'
        }
      });

      console.log('成员列表:', result);

      if (result.result && result.result.success) {
        this.setData({
          members: result.result.data || []
        });
      }

    } catch (error) {
      console.error('加载成员列表失败:', error);
    }
  }
});

