// pages/contact/contact.js
Page({
  data: {
    
  },

  onLoad(options) {
    
  },

  // 拨打电话
  callPhone(e) {
    const { phone } = e.currentTarget.dataset;
    wx.showModal({
      title: '拨打电话',
      content: `确定拨打 ${phone} 吗？`,
      confirmText: '拨打',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: phone,
            success: () => {
              console.log('拨打电话成功');
            },
            fail: (err) => {
              wx.showToast({
                title: '拨打失败',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },

  // 打开在线客服
  openCustomerService() {
    wx.showToast({
      title: '客服功能开发中',
      icon: 'none',
      duration: 2000
    });
    
    // TODO: 集成客服功能
    // 可以使用微信的 button open-type="contact" 
    // 或者跳转到消息页面联系客服
  },

  // 打开常见问题
  openFaq(e) {
    const { type } = e.currentTarget.dataset;
    let content = '';
    
    switch(type) {
      case 'account':
        content = '1. 首次使用请先注册账号\n2. 填写昵称、年级、学科等信息\n3. 使用手机号登录\n4. 可在"我的"页面修改个人信息';
        break;
      case 'project':
        content = '1. 进入"首页"-"我的项目"-"设计项目"\n2. 填写项目基本信息\n3. 可使用AI助手生成相关内容\n4. 点击"保存"或"发布项目"\n5. 发布的项目需要审核通过';
        break;
      case 'points':
        content = '获得积分：\n• 发布项目并通过审核\n• 参与平台活动\n\n使用积分：\n• 购买项目资源\n• 兑换会员服务\n• 兑换平台礼品\n\n查看积分：\n在"我的"-"我的积分"中查看';
        break;
      case 'school':
        content = '1. 进入"我的"-"创建学校团队"\n2. 填写学校基本信息和联系人信息\n3. 提交申请\n4. 等待审核（24小时内）\n5. 审核通过后获得学校邀请码\n6. 分享邀请码给同事加入团队';
        break;
    }
    
    wx.showModal({
      title: '帮助说明',
      content: content,
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  // 提交反馈
  submitFeedback() {
    wx.showModal({
      title: '提交反馈',
      content: '感谢您的反馈！请通过客服电话或在线客服提交您的建议，我们会认真对待每一条反馈。',
      showCancel: false,
      confirmText: '好的'
    });
    
    // TODO: 可以添加反馈表单页面
  }
});

