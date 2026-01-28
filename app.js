// app.js - PBL营（教师端）
App({
  onLaunch() {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        traceUser: true,
        env: 'cloud1-9gpi4pkt9a8bce92' // 云开发环境ID
      });
      console.log('云开发初始化完成');
    }

    // 检查用户登录状态
    this.checkLoginStatus();
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('teacherInfo');
    if (userInfo) {
      this.globalData.teacherInfo = userInfo;
      this.globalData.openid = userInfo.openid;
      this.globalData.points = userInfo.points || 0;
    }
  },

  // 全局数据
  globalData: {
    teacherInfo: null,
    openid: null,
    points: 0 // 积分
  }
});

