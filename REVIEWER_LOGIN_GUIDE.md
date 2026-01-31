# 审核员专属登录入口 - 技术文档

## 📋 概述

本文档说明审核员登录系统的实现细节、使用方法和后续开发指南。

---

## 🎯 核心特性

### 1. **完全隐藏的入口**
- ✅ 不在 tabBar 中显示
- ✅ 不在教师端任何界面中出现入口
- ✅ 只能通过专属二维码或链接访问
- ✅ 页面路径位于 `app.json` 底部，不影响普通用户首次加载

### 2. **双令牌系统（核心安全机制）**
- ✅ 审核员令牌：`reviewer_token`
- ✅ 审核员信息：`reviewer_info`
- ✅ 教师端令牌：`user_token`
- ✅ 教师端信息：`teacherInfo`
- ✅ 两套令牌完全独立，互不干扰

### 3. **状态隔离**
- ✅ 审核员登录时自动清理教师端登录态
- ✅ 使用 `wx.reLaunch` 跳转，不留返回历史
- ✅ 退出登录清除审核员令牌

---

## 📁 文件结构

```
pages/
├── reviewer-login/                 # 审核员登录页
│   ├── reviewer-login.wxml        # 页面结构
│   ├── reviewer-login.wxss        # 深色系专业风格
│   ├── reviewer-login.js          # 登录逻辑 + 双令牌
│   └── reviewer-login.json        # 自定义导航栏
│
└── reviewer/
    └── home/                       # 审核员工作台首页
        ├── index.wxml             # 工作台布局
        ├── index.wxss             # 内部系统风格
        ├── index.js               # 工作台逻辑
        └── index.json             # 页面配置
```

---

## 🔐 登录流程

### 用户操作流程
```
1. 扫描审核员专属二维码
   ↓
2. 打开审核员登录页
   ↓
3. 输入工号和密码
   ↓
4. 点击"进入审核工作台"
   ↓
5. 验证通过 → 跳转工作台
   验证失败 → 显示错误提示
```

### 技术流程
```javascript
1. checkReviewerLoginStatus()  // 检查是否已登录
   ↓
2. validateForm()              // 表单验证
   ↓
3. loginRequest()              // 调用登录API
   ↓
4. handleLoginSuccess()        // 处理登录成功
   ├─ 清理教师端登录态
   ├─ 存储审核员令牌
   └─ 跳转工作台
```

---

## 🔧 开发测试账号

为了方便测试，代码中内置了模拟登录账号：

```javascript
账号：reviewer
密码：123456
```

**⚠️ 注意：正式上线前必须删除模拟登录代码！**

---

## 🚀 接入真实后端API

### 方法1：使用云函数

在 `pages/reviewer-login/reviewer-login.js` 中，取消注释 `realLoginAPI` 方法：

```javascript
// 1. 在 cloudfunctions/ 目录创建 reviewer 云函数
// 2. 实现登录逻辑
// 3. 在登录页面调用

async realLoginAPI(account, password) {
  const res = await wx.cloud.callFunction({
    name: 'reviewer',
    data: {
      action: 'login',
      account: account,
      password: password
    }
  });
  
  return res.result;
}
```

### 方法2：使用HTTP请求

```javascript
async realLoginAPI(account, password) {
  const res = await wx.request({
    url: 'https://your-api.com/api/reviewer/auth/login',
    method: 'POST',
    data: {
      account,
      password
    }
  });
  
  if (res.statusCode === 200) {
    return {
      success: true,
      data: res.data
    };
  } else {
    return {
      success: false,
      message: res.data.message || '登录失败'
    };
  }
}
```

### API返回格式要求

```javascript
// 成功返回
{
  success: true,
  data: {
    token: 'reviewer_token_xxxx',
    userInfo: {
      id: 'reviewer_001',
      account: 'reviewer',
      name: '审核员张三',
      role: 'reviewer',
      permissions: ['review_projects', 'review_schools'],
      department: '内容审核部'
    }
  }
}

// 失败返回
{
  success: false,
  message: '账号或密码错误'
}
```

---

## 📱 生成审核员专属二维码

### 方法1：使用开发者工具生成

1. 打开微信开发者工具
2. 点击顶部菜单"工具" → "生成小程序码"
3. 页面路径填写：`pages/reviewer-login/reviewer-login`
4. 下载二维码分发给审核员

### 方法2：使用云函数动态生成

```javascript
// 云函数示例
const cloud = require('wx-server-sdk');
cloud.init();

exports.main = async (event, context) => {
  const result = await cloud.openapi.wxacode.getUnlimited({
    scene: 'reviewer',
    page: 'pages/reviewer-login/reviewer-login',
    width: 280
  });
  
  return result;
};
```

---

## 🛡️ 安全建议

### 1. **接口安全**
- ✅ 使用 HTTPS 加密传输
- ✅ 密码需加密后传输（不能明文）
- ✅ 实现 Token 过期机制
- ✅ 限制登录失败次数（防暴力破解）

### 2. **令牌管理**
```javascript
// 推荐：设置Token过期时间
const tokenExpireTime = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7天
wx.setStorageSync('reviewer_token_expire', tokenExpireTime);

// 每次请求前检查
if (Date.now() > wx.getStorageSync('reviewer_token_expire')) {
  // Token过期，跳转登录
}
```

### 3. **权限控制**
```javascript
// 在每个审核员页面的 onLoad 中添加权限检查
checkPermission(requiredPermission) {
  const reviewerInfo = wx.getStorageSync('reviewer_info');
  if (!reviewerInfo || !reviewerInfo.permissions) {
    return false;
  }
  return reviewerInfo.permissions.includes(requiredPermission);
}
```

---

## 🔄 后续开发指南

### 需要开发的审核员功能页面

1. **项目审核页面** (`pages/reviewer/project-review/`)
   - 待审核项目列表
   - 项目详情查看
   - 审核通过/驳回
   - 评估报告填写

2. **学校审核页面** (`pages/reviewer/school-review/`)
   - 学校团队申请列表
   - 学校信息审核
   - 邀请码生成

3. **用户管理页面** (`pages/reviewer/user-manage/`)
   - 教师账号管理
   - 权限设置
   - 账号封禁/解封

4. **数据报表页面** (`pages/reviewer/reports/`)
   - 审核统计
   - 用户数据
   - 平台运营数据

### 开发时注意事项

1. **页面路径**：所有审核员页面都放在 `pages/reviewer/` 目录下
2. **页面配置**：使用统一的深色系导航栏
3. **跳转方式**：审核员页面间使用 `wx.navigateTo`，退出时使用 `wx.reLaunch`
4. **状态检查**：每个页面 `onLoad` 时检查审核员登录态

---

## 🧪 测试清单

- [ ] 扫码进入审核员登录页
- [ ] 输入错误账号/密码，显示错误提示
- [ ] 输入正确账号密码，成功登录并跳转
- [ ] 登录成功后刷新小程序，仍保持登录态
- [ ] 点击退出登录，清除登录态
- [ ] 审核员登录后，教师端登录态被清除
- [ ] 普通教师无法通过任何常规路径访问审核员页面

---

## 📞 技术支持

如有问题，请联系开发团队：
- 技术文档：本文件
- 代码位置：`pages/reviewer-login/` 和 `pages/reviewer/home/`

---

**✅ 审核员登录系统已开发完成！**

后续只需：
1. 接入真实后端API
2. 生成专属二维码
3. 开发具体审核功能页面

