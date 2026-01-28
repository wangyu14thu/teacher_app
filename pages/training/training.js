// pages/training/training.js
Page({
  data: {
    courseInfo: {
      title: '博研达项目式学习研修营',
      subtitle: '实用性、实操性、创生性、科学性',
      designTraining: [
        { session: '第一讲', title: '《确立项目主题设计策略》' },
        { session: '第二讲', title: '《项目启动阶段设计策略》' },
        { session: '第三讲', title: '《项目实施阶段设计策略》' },
        { session: '第四讲', title: '《项目后期和结束阶段设计策略》' },
        { session: '第五讲', title: '《项目展演》' }
      ],
      implementationGuidance: [
        { session: '第一次', title: '《项目启动课堂实施指导》' },
        { session: '第二次', title: '《项目探究课堂实施指导》' },
        { session: '第三次', title: '《项目展示课堂实施指导》' }
      ]
    },
    contactInfo: {
      phone: '010-62846510',
      mobile: '13681397661'
    }
  },

  onLoad() {
    // 页面加载
  },

  // 联系我们
  contactUs() {
    wx.showModal({
      title: '联系我们',
      content: `若有需要请联系我们！\n\n电话：${this.data.contactInfo.phone}\n手机：${this.data.contactInfo.mobile}`,
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 拨打电话
  makeCall(e) {
    const phone = e.currentTarget.dataset.phone
    wx.makePhoneCall({
      phoneNumber: phone
    })
  }
})

