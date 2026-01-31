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
      createdTime: ''
    }
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
            createdTime: this.formatTime(school.createdTime)
          }
        });
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
  }
});

