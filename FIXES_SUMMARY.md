# 🔧 问题修复总结

## 修复的2个问题

### 📬 问题1：用户收不到系统消息

**问题原因**：
- `ai-assistant.js` 中的查询条件错误
- 直接从数据库查询时无法获取当前用户的 `openid`
- 数据库查询条件 `userId: db.command.exists(true)` 会获取所有消息，而非当前用户的消息

**解决方案**：
1. 修改查询逻辑为调用云函数获取消息
2. 在 `reviewer` 云函数中添加 `getUserMessages` 功能
3. 云函数通过 `wxContext.OPENID` 获取当前用户的 openid
4. 按 `userId: openid` 过滤消息

**修改文件**：
- `pages/ai-assistant/ai-assistant.js` - 修改 `loadSystemMessages()` 函数
- `cloudfunctions/reviewer/index.js` - 添加 `getUserMessages()` 函数

**实现逻辑**：
```javascript
// 教师端
const res = await wx.cloud.callFunction({
  name: 'reviewer',
  data: {
    action: 'getUserMessages'
  }
});

// 云函数
async function getUserMessages(event, openid) {
  const result = await db.collection('system_messages')
    .where({
      userId: openid  // 使用云函数获取的 openid
    })
    .orderBy('createdTime', 'desc')
    .limit(50)
    .get();
    
  return {
    success: true,
    data: result.data
  };
}
```

---

### 🏫 问题2："我的学校"显示写死的数据

**问题原因**：
- `my-school.js` 中使用硬编码的模拟数据
- 没有从数据库读取真实的学校信息

**解决方案**：
1. 修改 `my-school.js` 调用云函数获取学校信息
2. 在 `school-application` 云函数中添加 `getMySchool` 功能
3. 根据用户的 openid 查询 `schools` 集合
4. 显示真实的学校名称、成员数、邀请码等信息
5. 如果没有学校，显示空状态

**修改文件**：
- `pages/my-school/my-school.js` - 完全重写 `loadSchoolInfo()` 函数
- `pages/my-school/my-school.wxml` - 添加条件渲染和邀请码显示
- `pages/my-school/my-school.wxss` - 添加新样式
- `cloudfunctions/school-application/index.js` - 添加 `getMySchool()` 函数

**实现逻辑**：
```javascript
// 教师端
const result = await wx.cloud.callFunction({
  name: 'school-application',
  data: {
    action: 'getMySchool'
  }
});

if (result.result.success && result.result.data) {
  // 显示学校信息
  this.setData({
    hasSchool: true,
    schoolInfo: result.result.data
  });
} else {
  // 显示空状态
  this.setData({
    hasSchool: false
  });
}

// 云函数
async function getMySchool(event, openid) {
  // 查找用户是管理员的学校
  const schools = await db.collection('schools')
    .where({
      adminOpenid: openid,
      status: 'active'
    })
    .limit(1)
    .get();
    
  return {
    success: true,
    data: schools.data[0] || null
  };
}
```

**新增功能**：
- ✅ 显示真实学校名称
- ✅ 显示成员数量
- ✅ 显示下载额度
- ✅ **显示邀请码**（带复制按钮）
- ✅ 如果没有学校，显示提示信息

---

## 🚀 需要部署的云函数

### 1. `reviewer` 云函数（重要！）

**右键点击** `cloudfunctions/reviewer` → **"上传并部署：云端安装依赖"**

**新增功能**：
- `getUserMessages` - 获取当前用户的系统消息

### 2. `school-application` 云函数（重要！）

**右键点击** `cloudfunctions/school-application` → **"上传并部署：云端安装依赖"**

**新增功能**：
- `getMySchool` - 获取当前用户创建/加入的学校

---

## ✅ 测试步骤

### 测试系统消息

1. **审核员端**：
   - 登录审核员小程序
   - 找到待审核学校
   - 点击"通过"
   - 提交审核

2. **检查数据库**：
   - 打开云开发控制台
   - 进入数据库 → `system_messages` 集合
   - 确认有新消息记录
   - 检查 `userId` 字段是否是正确的 openid

3. **教师端**：
   - 进入"消息与助手"
   - 点击"系统消息"选项卡
   - **应该能看到审核通过的消息**
   - 点击消息，查看详情
   - **应该能看到邀请码**

### 测试"我的学校"

1. **审核员端**：
   - 审核学校通过（如上）

2. **教师端**：
   - 进入"我的" → "我的学校"
   - **应该能看到真实的学校信息**：
     - 学校名称
     - 成员数量：1
     - 下载额度：100次
     - **邀请码**（可复制）
   - 点击"复制"按钮
   - **邀请码应该被复制到剪贴板**

3. **如果没有学校**：
   - 应该显示"您还没有加入学校"提示

---

## 🐛 可能的问题

### 问题：消息还是为空

**排查步骤**：
1. 检查云函数是否部署成功
2. 查看小程序控制台日志：
   ```
   云函数返回: {result: ...}
   ```
3. 查看云开发控制台 → 云函数 → reviewer → 日志
4. 确认 `system_messages` 集合中确实有数据
5. 确认消息的 `userId` 字段值正确

### 问题："我的学校"显示空状态

**可能原因**：
1. 学校审核还未通过（状态是 `pending`）
2. `schools` 集合中没有记录
3. 云函数部署失败

**解决方法**：
1. 重新提交学校申请并审核通过
2. 检查云开发控制台 → 数据库 → `schools` 集合
3. 确认有记录且 `status` 为 `active`
4. 确认 `adminOpenid` 与当前用户的 openid 一致

---

## 📝 数据流图

### 系统消息流程

```
审核员审核学校
  ↓
reviewer.reviewSchool()
  ↓
写入 system_messages 集合
  {
    userId: "教师的openid",
    type: "school_approved",
    title: "学校团队创建成功",
    content: "...邀请码...",
    inviteCode: "X7B9F2",
    status: "unread",
    createdTime: Date
  }
  ↓
教师端加载消息
  ↓
调用 reviewer.getUserMessages()
  ↓
按 userId = openid 查询
  ↓
返回消息列表
  ↓
显示在"消息与助手"页面
```

### 我的学校流程

```
审核员审核学校通过
  ↓
reviewer.reviewSchool()
  ↓
写入 schools 集合
  {
    schoolName: "XX小学",
    adminOpenid: "教师的openid",
    inviteCode: "X7B9F2",
    memberCount: 1,
    downloadQuota: 100,
    status: "active",
    ...
  }
  ↓
教师端进入"我的学校"
  ↓
调用 school-application.getMySchool()
  ↓
按 adminOpenid = openid 查询
  ↓
返回学校信息
  ↓
显示在"我的学校"页面
```

---

## 🎯 下一步优化建议

### 1. 消息推送通知
- 接入微信模板消息
- 审核通过后发送通知
- 点击通知直接打开消息详情

### 2. 学校成员管理
- 实现邀请码加入功能
- 创建 `school_members` 集合
- 显示成员列表
- 权限管理（管理员/普通成员）

### 3. 下载额度管理
- 记录每次下载消耗
- 显示使用明细
- 购买额度包功能

### 4. 消息已读优化
- 显示未读数量徽章
- 消息分类（审核结果、系统通知等）
- 消息删除功能

---

## ✅ 已完成功能清单

✅ 系统消息从数据库读取（按用户 openid）  
✅ 消息点击标记已读  
✅ "我的学校"显示真实数据  
✅ 显示学校邀请码（可复制）  
✅ 没有学校时显示空状态  
✅ 学校审核通过自动创建正式记录  
✅ 审核通过自动发送系统消息

---

## 📦 需要的数据库集合

已创建：
1. ✅ `system_messages` - 系统消息
2. ✅ `schools` - 正式学校记录
3. ✅ `schools_pending` - 学校申请（待审核）
4. ✅ `reviewers` - 审核员
5. ✅ `projects_pending` - 项目申请（待审核）
6. ✅ `application_logs` - 申请日志

未来需要（可选）：
7. `school_members` - 学校成员表
8. `download_logs` - 下载记录
9. `notification_logs` - 通知发送记录

