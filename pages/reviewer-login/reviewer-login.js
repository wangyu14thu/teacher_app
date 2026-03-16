// pages/reviewer-login/reviewer-login.js

/**
 * 审核员登录页面
 * 特性：
 * 1. 完全独立的登录系统，与教师端隔离
 * 2. 双令牌机制：reviewer_token 与 user_token 分离
 * 3. 通过专属二维码访问，普通教师无法发现
 */

Page({
  data: {
    account: '',
    password: '',
    accountError: '',
    passwordError: '',
    globalError: '',
    isLoading: false,
    autoFocus: true
  },

  onLoad(options) {
    // 检查是否已有审核员登录态
    this.checkReviewerLoginStatus();
  },

  onShow() {
    // 清空错误信息
    this.setData({
      accountError: '',
      passwordError: '',
      globalError: ''
    });
  },

  /**
   * 检查审核员登录态
   * 如果已登录，直接跳转到审核工作台
   */
  checkReviewerLoginStatus() {
    const reviewerToken = wx.getStorageSync('reviewer_token');
    const reviewerInfo = wx.getStorageSync('reviewer_info');
    
    if (reviewerToken && reviewerInfo) {
      // 已有登录态，直接跳转
      wx.reLaunch({
        url: '/pages/reviewer/home/index'
      });
    }
  },

  /**
   * 账号输入
   */
  onAccountInput(e) {
    this.setData({
      account: e.detail.value,
      accountError: '',
      globalError: ''
    });
  },

  /**
   * 密码输入
   */
  onPasswordInput(e) {
    this.setData({
      password: e.detail.value,
      passwordError: '',
      globalError: ''
    });
  },

  /**
   * 表单验证
   */
  validateForm() {
    const { account, password } = this.data;
    let hasError = false;

    if (!account || !account.trim()) {
      this.setData({
        accountError: '请输入账号'
      });
      hasError = true;
    }

    if (!password || !password.trim()) {
      this.setData({
        passwordError: '请输入密码'
      });
      hasError = true;
    }

    return !hasError;
  },

  /**
   * 处理登录
   */
  async handleLogin() {
    // 验证表单
    if (!this.validateForm()) {
      return;
    }

    // 防止重复提交
    if (this.data.isLoading) {
      return;
    }

    this.setData({
      isLoading: true,
      globalError: ''
    });

    try {
      // 调用登录接口
      await this.loginRequest();
    } catch (error) {
      console.error('登录失败:', error);
      this.setData({
        globalError: error.message || '登录失败，请稍后重试',
        isLoading: false
      });
    }
  },

  /**
   * 登录请求
   * 调用审核员专属云函数
   */
  async loginRequest() {
    const { account, password } = this.data;

    try {
      // 调用真实云函数
      const result = await this.realLoginAPI(account, password);
      
      if (result.success) {
        // 登录成功，处理令牌和用户信息
        await this.handleLoginSuccess(result.data);
      } else {
        // 登录失败
        throw new Error(result.message || '账号或密码错误');
      }
    } catch (error) {
      if (error.errMsg && error.errMsg.includes('cloud')) {
        throw new Error('网络连接失败，请重试');
      } else {
        throw error;
      }
    }
  },

  /**
   * 真实的云函数登录
   */
  async realLoginAPI(account, password) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'reviewer',
        data: {
          action: 'login',
          account: account,
          password: password
        }
      });
      
      return res.result;
    } catch (error) {
      console.error('云函数调用失败:', error);
      throw new Error('网络连接失败，请重试');
    }
  },

  /**
   * 处理登录成功
   * 1. 清理教师端登录态（如果存在）
   * 2. 存储审核员令牌和用户信息
   * 3. 跳转到审核工作台
   */
  async handleLoginSuccess(data) {
    const { token, userInfo } = data;

    try {
      // 步骤1：清理教师端登录态，确保状态隔离
      wx.removeStorageSync('user_token');
      wx.removeStorageSync('teacherInfo');
      
      // 步骤2：存储审核员令牌和用户信息
      wx.setStorageSync('reviewer_token', token);
      wx.setStorageSync('reviewer_info', userInfo);

      // 步骤3：显示成功提示
      wx.showToast({
        title: '登录成功',
        icon: 'success',
        duration: 1500
      });

      // 步骤4：延迟跳转，让用户看到成功提示
      setTimeout(() => {
        // 使用 reLaunch 清空页面栈，防止返回
        wx.reLaunch({
          url: '/pages/reviewer/home/index'
        });
      }, 1500);

    } catch (error) {
      console.error('登录态存储失败:', error);
      this.setData({
        globalError: '登录状态保存失败，请重试',
        isLoading: false
      });
    }
  },

  /**
   * 页面卸载时的清理
   */
  onUnload() {
    // 清空敏感数据
    this.setData({
      password: ''
    });
  }
});

