// pages/admin-dashboard/admin-dashboard.js
Page({
  data: {
    schoolName: '翠微小学',
    adminName: '张老师',
    stats: {
      memberCount: 15,
      activeCount: 12,
      projectCount: 47,
      remainingQuota: 142
    },
    currentTab: 'members',
    
    // 成员列表
    members: [
      { id: 1, name: '李老师', subject: '数学', joinTime: '2024-01-10', active: true },
      { id: 2, name: '王老师', subject: '语文', joinTime: '2024-01-12', active: true },
      { id: 3, name: '赵老师', subject: '英语', joinTime: '2024-01-15', active: false },
      { id: 4, name: '刘老师', subject: '科学', joinTime: '2024-01-18', active: true }
    ],
    
    // 校本项目
    schoolProjects: [
      { id: 1, title: '《智慧校园改造计划》', author: '张老师', uploadTime: '2天前', isTop: true },
      { id: 2, title: '《环保小卫士在行动》', author: '李老师', uploadTime: '5天前', isTop: false },
      { id: 3, title: '《传统文化探秘》', author: '王老师', uploadTime: '1周前', isTop: false }
    ],
    
    // 购买记录
    purchaseHistory: [
      { id: 1, packageName: '基础包', purchaseTime: '2024-01-15', amount: 299 },
      { id: 2, packageName: '扩容包', purchaseTime: '2024-01-01', amount: 150 }
    ],
    
    // 资源消耗排行
    resourceRanking: [
      { id: 1, name: '李老师', downloadCount: 25 },
      { id: 2, name: '王老师', downloadCount: 18 },
      { id: 3, name: '赵老师', downloadCount: 15 },
      { id: 4, name: '刘老师', downloadCount: 12 }
    ]
  },

  onLoad(options) {
    this.loadDashboardData();
  },

  // 加载管理后台数据
  loadDashboardData() {
    wx.showLoading({ title: '加载中...' });
    
    // TODO: 从云函数获取数据
    setTimeout(() => {
      wx.hideLoading();
    }, 500);
  },

  // 切换Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      currentTab: tab
    });
  },

  // ===== 成员管理 =====
  
  // 移除成员
  removeMember(e) {
    const id = e.currentTarget.dataset.id;
    const member = this.data.members.find(m => m.id === id);
    
    wx.showModal({
      title: '确认移除',
      content: `确定要将"${member.name}"移出本校团队吗？该操作不会删除其个人账号和数据。`,
      confirmText: '确认移除',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          this.doRemoveMember(id);
        }
      }
    });
  },

  doRemoveMember(id) {
    wx.showLoading({ title: '处理中...' });
    
    // TODO: 调用云函数移除成员
    setTimeout(() => {
      const members = this.data.members.filter(m => m.id !== id);
      this.setData({
        members,
        'stats.memberCount': this.data.stats.memberCount - 1
      });
      wx.hideLoading();
      wx.showToast({
        title: '移除成功',
        icon: 'success'
      });
    }, 500);
  },

  // ===== 校本项目库 =====
  
  // 置顶项目
  topProject(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showLoading({ title: '处理中...' });
    
    // TODO: 调用云函数置顶项目
    setTimeout(() => {
      const schoolProjects = this.data.schoolProjects.map(p => {
        if (p.id === id) {
          return { ...p, isTop: true };
        }
        return p;
      });
      this.setData({
        schoolProjects
      });
      wx.hideLoading();
      wx.showToast({
        title: '置顶成功',
        icon: 'success'
      });
    }, 500);
  },

  // 取消置顶
  untopProject(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showLoading({ title: '处理中...' });
    
    // TODO: 调用云函数取消置顶
    setTimeout(() => {
      const schoolProjects = this.data.schoolProjects.map(p => {
        if (p.id === id) {
          return { ...p, isTop: false };
        }
        return p;
      });
      this.setData({
        schoolProjects
      });
      wx.hideLoading();
      wx.showToast({
        title: '已取消置顶',
        icon: 'success'
      });
    }, 500);
  },

  // 分享项目
  shareProject(e) {
    const id = e.currentTarget.dataset.id;
    const project = this.data.schoolProjects.find(p => p.id === id);
    
    wx.showModal({
      title: '分享到微信群',
      content: `即将分享项目"${project.title}"到学校微信群`,
      confirmText: '确认分享',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '分享功能开发中',
            icon: 'none'
          });
          // TODO: 实现分享功能
        }
      }
    });
  },

  // 设为私密
  setPrivate(e) {
    const id = e.currentTarget.dataset.id;
    const project = this.data.schoolProjects.find(p => p.id === id);
    
    wx.showModal({
      title: '设为私密',
      content: `设置后，项目"${project.title}"将仅对创建者可见。确认操作吗？`,
      confirmText: '确认',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' });
          
          // TODO: 调用云函数设置私密
          setTimeout(() => {
            wx.hideLoading();
            wx.showToast({
              title: '已设为私密',
              icon: 'success'
            });
          }, 500);
        }
      }
    });
  },

  // ===== 资源与采购 =====
  
  // 查看使用明细
  viewUsageDetail() {
    wx.showModal({
      title: '使用明细',
      content: '功能开发中，将展示详细的下载额度使用记录',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  // 购买资源包
  buyPackage(e) {
    const type = e.currentTarget.dataset.type;
    const packageInfo = type === 'basic' 
      ? { name: '基础包', quota: 300, price: 299 }
      : { name: '扩容包', quota: 100, price: 150 };
    
    wx.showModal({
      title: '购买资源包',
      content: `确认购买${packageInfo.name}（${packageInfo.quota}次下载额度）？\n价格：¥${packageInfo.price}`,
      confirmText: '确认支付',
      success: (res) => {
        if (res.confirm) {
          this.doPurchase(packageInfo);
        }
      }
    });
  },

  doPurchase(packageInfo) {
    wx.showLoading({ title: '支付中...' });
    
    // TODO: 调用微信支付
    setTimeout(() => {
      wx.hideLoading();
      wx.showModal({
        title: '购买成功',
        content: `已成功购买${packageInfo.name}，${packageInfo.quota}次下载额度已到账`,
        showCancel: false,
        success: () => {
          // 更新统计数据
          this.setData({
            'stats.remainingQuota': this.data.stats.remainingQuota + packageInfo.quota
          });
        }
      });
    }, 1500);
  },

  // ===== 设置与联系 =====
  
  // 重置邀请码
  resetInviteCode() {
    wx.showModal({
      title: '重置邀请码',
      content: '重置后，原邀请码将失效，新邀请码将立即生成。确认操作吗？',
      confirmText: '确认重置',
      confirmColor: '#fa8c16',
      success: (res) => {
        if (res.confirm) {
          this.doResetInviteCode();
        }
      }
    });
  },

  doResetInviteCode() {
    wx.showLoading({ title: '生成中...' });
    
    // TODO: 调用云函数生成新邀请码
    setTimeout(() => {
      const newCode = this.generateInviteCode();
      wx.hideLoading();
      wx.showModal({
        title: '重置成功',
        content: `新邀请码：${newCode}\n\n请将新邀请码分享给本校同事`,
        showCancel: false,
        confirmText: '复制邀请码',
        success: (res) => {
          if (res.confirm) {
            wx.setClipboardData({
              data: newCode,
              success: () => {
                wx.showToast({
                  title: '已复制',
                  icon: 'success'
                });
              }
            });
          }
        }
      });
    }, 1000);
  },

  // 生成邀请码（示例）
  generateInviteCode() {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  },

  // 联系客服
  contactService() {
    wx.showModal({
      title: '联系我们',
      content: '定制校本化方案咨询\n\n电话：010-62846510\n手机：13681397661',
      showCancel: false,
      confirmText: '我知道了'
    });
  }
});

