# 审核员小程序快速上手指南

## 🚀 5分钟快速开始

### 第1步：初始化数据库（必需）

在微信开发者工具的**云开发控制台 → 数据库**中，创建以下集合并添加测试数据：

#### 1.1 创建审核员账号

```javascript
// 在 reviewers 集合中添加
{
  "account": "reviewer",
  "password": "123456",
  "name": "审核员张三",
  "role": "reviewer",
  "permissions": ["review_projects", "review_schools"],
  "department": "内容审核部",
  "gradeLevel": ["1-2年级", "3-4年级", "5-6年级"],
  "status": "active",
  "loginFailures": 0,
  "currentToken": "",
  "lastLoginTime": null,
  "lastLoginOpenid": "",
  "createdAt": "2026-01-31T00:00:00.000Z",
  "createdBy": "system"
}
```

#### 1.2 创建测试项目数据

```javascript
// 在 projects_pending 集合中添加
{
  "projectName": "智慧校园改造计划",
  "grade": "5年级",
  "subject": "综合",
  "hours": 12,
  "teacherId": "teacher001",
  "teacherName": "李老师",
  "type": "publish",
  "overview": "本项目旨在引导学生通过调研、设计、实践，优化校园环境...",
  "realWorld": "校园环境直接影响学生学习体验...",
  "curriculum": "综合实践活动课程标准...",
  "studentLevel": "五年级学生已具备基本调研能力...",
  "crossConcept": "系统与优化",
  "drivingQuestion": "作为小小设计师，如何为全校师生设计一个更智慧、更舒适的校园环境方案？",
  "subQuestions": ["如何了解大家对校园环境的真实需求？", "校园的哪些区域最需要改进？"],
  "finalProduct": "形成一套完整的校园环境改造方案",
  "presentForm": "方案展板、设计模型、路演答辩",
  "objectives": "通过实地调研和问卷访谈，掌握数据收集与分析方法...",
  "status": "pending",
  "assignedTo": "",  // 留空，后续分配
  "submitTime": "2026-01-31T10:00:00.000Z"
}
```

---

### 第2步：部署云函数

```bash
# 在微信开发者工具中
# 右键点击 cloudfunctions/reviewer 文件夹
# 选择"上传并部署：云端安装依赖"
```

等待部署完成（约1-2分钟）。

---

### 第3步：生成审核员登录二维码

1. 在微信开发者工具中，点击**工具 → 生成小程序码**
2. 页面路径输入：`pages/reviewer-login/reviewer-login`
3. 生成二维码并保存
4. **重要**：此二维码专供审核员使用，不要公开

---

### 第4步：测试登录

1. 使用微信扫描生成的二维码
2. 进入审核员登录页面
3. 输入账号：`reviewer`
4. 输入密码：`123456`
5. 点击"进入审核工作台"
6. 成功进入任务看板页面

---

## 📱 功能测试清单

### ✅ 登录功能
- [ ] 使用正确账号密码可以登录
- [ ] 错误密码提示"密码错误"
- [ ] 登录后自动跳转到任务看板

### ✅ 任务看板
- [ ] 可以看到统计卡片（今日待审、本周已完成）
- [ ] 可以切换"待审核项目"和"待审核学校"选项卡
- [ ] 可以使用年级和学科筛选器
- [ ] 可以看到任务列表
- [ ] 点击任务可以进入详情页

### ✅ 项目审核
- [ ] 可以看到完整的项目信息
- [ ] 可以选择"通过"或"驳回"
- [ ] 驳回时必须选择原因
- [ ] 可以添加优化建议
- [ ] 可以写自定义补充说明
- [ ] 可以添加内部备注
- [ ] 可以转交给其他审核员
- [ ] 可以暂存任务
- [ ] 提交后有二次确认

### ✅ 学校审核
- [ ] 可以看到学校申请信息
- [ ] 可以选择通过或驳回
- [ ] 驳回时必须选择原因
- [ ] 提交成功

### ✅ 我的页面
- [ ] 可以看到个人信息
- [ ] 可以看到审核统计数据
- [ ] 可以进入审核历史
- [ ] 可以进入暂存任务
- [ ] 可以退出登录

### ✅ 批量操作
- [ ] 可以开启批量模式
- [ ] 可以选择多个任务
- [ ] 可以批量驳回
- [ ] 必须选择驳回原因

---

## 🔧 常见问题

### Q1: 登录后显示"Token无效"
**解决**：检查云函数是否部署成功，并确保数据库中有对应的审核员记录。

### Q2: 看不到任务列表
**解决**：确保 `projects_pending` 集合中有 `status: "pending"` 的记录。

### Q3: 提交审核后没有反应
**解决**：检查云函数日志，确认 `submitReview` 接口是否正常执行。

### Q4: 系统消息没有发送给教师
**解决**：目前需要集成教师端的消息系统，这部分需要后续开发。

### Q5: 邀请码没有生成
**解决**：检查云函数的 `generateSchoolInviteCode` 函数是否正常执行。

---

## 🎯 关键代码位置

### 修改审核意见模板
**文件**: `pages/reviewer/project-detail/index.js`
```javascript
// 第21-42行：审核意见选项
passComments: [...],  // A类
rejectReasons: [...], // B类
suggestions: [...]    // C类
```

### 修改紧急时间判断
**文件**: `cloudfunctions/reviewer/index.js`
```javascript
// isUrgent 函数
function isUrgent(submitTime) {
  const hoursDiff = (new Date() - new Date(submitTime)) / (1000 * 60 * 60);
  return hoursDiff > 24; // 改为你需要的小时数
}
```

### 修改邀请码长度
**文件**: `cloudfunctions/reviewer/index.js`
```javascript
// generateSchoolInviteCode 函数
const length = 6 + Math.floor(Math.random() * 3); // 6-8位
```

---

## 📊 数据流程图

```
【教师端】
   ↓ 提交项目
【云数据库】projects_pending (status: pending)
   ↓ 自动分配
【审核员】看到任务 → 审核 → 提交
   ↓
【云数据库】
  - projects_pending (status: approved/rejected)
  - review_records (新增记录)
  - system_messages (新增消息)
   ↓
【教师端】系统消息 → 收到通知
```

---

## 🚨 注意事项

### 安全性
1. **生产环境务必修改默认密码**
2. 审核员二维码不要泄露给普通用户
3. 定期更换Token过期时间
4. 密码需要加密存储（使用bcrypt）

### 性能优化
1. 大量任务时使用分页加载
2. 审核记录定期归档
3. 添加数据库索引

### 数据备份
1. 定期导出重要数据
2. 设置自动备份策略
3. 审核记录长期保存

---

## 📞 技术支持

如遇到问题，请检查：
1. 微信开发者工具控制台的错误信息
2. 云开发控制台的云函数日志
3. 数据库中的数据是否正确

详细文档：
- `DATABASE_DESIGN_REVIEWER.md` - 数据库设计
- `CLOUD_FUNCTION_DEPLOY_GUIDE.md` - 云函数部署
- `REVIEWER_COMPLETE_SUMMARY.md` - 功能总结

---

**祝您使用愉快！** 🎉

