# 审核员系统数据库设计文档

## 📋 数据库集合清单

| 集合名称 | 说明 | 用途 |
|---------|------|------|
| `reviewers` | 审核员账号表 | 存储审核员基本信息和权限 |
| `reviewer_logs` | 审核员操作日志 | 记录登录、退出、转交等操作 |
| `projects_pending` | 待审核项目表 | 存储待审核的项目申请 |
| `schools_pending` | 待审核学校表 | 存储待审核的学校申请 |
| `review_records` | 审核记录表 | 存储所有审核历史记录 |
| `temp_tasks` | 暂存任务表 | 存储审核员暂存的任务 |
| `system_messages` | 系统消息表 | 存储发送给教师的通知消息 |
| `schools` | 学校信息表 | 存储已通过审核的学校 |

---

## 1️⃣ reviewers - 审核员账号表

### 字段说明

```javascript
{
  _id: String,                    // 文档ID（自动生成）
  account: String,                // 登录账号（唯一）
  password: String,               // 密码（实际应加密）
  name: String,                   // 姓名
  role: String,                   // 角色：reviewer | admin
  permissions: Array<String>,     // 权限列表
  department: String,             // 部门
  gradeLevel: Array<String>,      // 擅长学段 ['1-2年级', '3-4年级']
  status: String,                 // 状态：active | inactive
  loginFailures: Number,          // 登录失败次数
  currentToken: String,           // 当前有效Token
  lastLoginTime: Date,            // 最后登录时间
  lastLoginOpenid: String,        // 最后登录的openid
  createdAt: Date,                // 创建时间
  createdBy: String              // 创建人
}
```

### 索引

- `account`（唯一索引）
- `status`
- `lastLoginTime`

### 示例数据

```json
{
  "_id": "reviewer001",
  "account": "reviewer",
  "password": "123456",
  "name": "审核员张三",
  "role": "reviewer",
  "permissions": ["review_projects", "review_schools", "manage_users"],
  "department": "内容审核部",
  "gradeLevel": ["1-2年级", "3-4年级"],
  "status": "active",
  "loginFailures": 0,
  "currentToken": "",
  "lastLoginTime": null,
  "lastLoginOpenid": "",
  "createdAt": "2026-01-31T00:00:00.000Z",
  "createdBy": "system"
}
```

---

## 2️⃣ projects_pending - 待审核项目表

### 字段说明

```javascript
{
  _id: String,                    // 文档ID
  projectName: String,            // 项目名称
  grade: String,                  // 年级
  subject: String,                // 学科
  hours: Number,                  // 课时
  teacherId: String,              // 提交教师ID
  teacherName: String,            // 教师姓名
  type: String,                   // 类型：publish | evaluate
  
  // 项目内容
  overview: String,               // 项目概述
  realWorld: String,              // 依据现实世界
  curriculum: String,             // 依据课标教材
  studentLevel: String,           // 依据学生实际
  crossConcept: String,           // 跨学科概念
  drivingQuestion: String,        // 驱动性问题
  subQuestions: Array<String>,    // 子问题链
  finalProduct: String,           // 最终成果
  presentForm: String,            // 展示形式
  objectives: String,             // 项目目标
  
  // 审核相关
  status: String,                 // pending | approved | rejected
  assignedTo: String,             // 分配给的审核员ID
  submitTime: Date,               // 提交时间
  reviewerId: String,             // 审核人ID
  reviewerName: String,           // 审核人姓名
  reviewTime: Date,               // 审核时间
  opinions: Object,               // 审核意见
  internalNote: String,           // 内部备注
  
  // 转交记录
  transferredFrom: String,        // 转交自
  transferredTime: Date,          // 转交时间
  transferReason: String          // 转交原因
}
```

### 索引

- `status` + `assignedTo`
- `teacherId`
- `submitTime`

---

## 3️⃣ schools_pending - 待审核学校表

### 字段说明

```javascript
{
  _id: String,
  schoolName: String,             // 学校名称
  contactName: String,            // 联系人姓名
  position: String,               // 职位
  phone: String,                  // 联系电话
  schoolAddress: String,          // 学校地址
  schoolSize: String,             // 学校规模
  description: String,            // 申请说明
  
  // 审核相关
  status: String,                 // pending | approved | rejected
  assignedTo: String,             // 分配给的审核员ID
  submitTime: Date,               // 提交时间
  applicantId: String,            // 申请人用户ID
  
  reviewerId: String,             // 审核人ID
  reviewerName: String,           // 审核人姓名
  reviewTime: Date,               // 审核时间
  opinions: Object,               // 审核意见
  inviteCode: String              // 生成的邀请码（通过后）
}
```

### 索引

- `status` + `assignedTo`
- `applicantId`
- `submitTime`

---

## 4️⃣ review_records - 审核记录表

### 字段说明

```javascript
{
  _id: String,
  taskId: String,                 // 任务ID
  taskType: String,               // 任务类型：project | school
  taskName: String,               // 任务名称
  
  reviewerId: String,             // 审核员ID
  reviewerName: String,           // 审核员姓名
  decision: String,               // 审核决定：pass | reject
  
  opinions: {                     // 审核意见
    passComment: String,          // 通过评语（A类）
    rejectReason: String,         // 驳回原因（B类）
    suggestions: Array<String>,   // 优化建议（C类）
    customComment: String         // 自定义补充
  },
  
  internalNote: String,           // 内部备注
  reviewTime: Date,               // 审核时间
  reviewDuration: Number,         // 审核时长（秒）
  isBatchOperation: Boolean,      // 是否批量操作
  
  // AI学习数据
  aiMetrics: {
    timeOnOverview: Number,       // 在项目概述部分停留时间
    timeOnFramework: Number,      // 在项目框架部分停留时间
    clickCount: Number,           // 点击次数
    scrollDepth: Number           // 滚动深度
  }
}
```

### 索引

- `reviewerId` + `reviewTime`
- `taskId`
- `decision`

---

## 5️⃣ temp_tasks - 暂存任务表

### 字段说明

```javascript
{
  _id: String,
  taskId: String,                 // 任务ID
  taskType: String,               // 任务类型
  reviewerId: String,             // 审核员ID
  
  // 暂存的审核状态
  reviewDecision: String,
  selectedPassComment: String,
  selectedRejectReason: String,
  selectedSuggestions: Array<String>,
  customComment: String,
  internalNote: String,
  
  savedAt: Date                   // 暂存时间
}
```

### 索引

- `reviewerId` + `savedAt`

---

## 6️⃣ system_messages - 系统消息表

### 字段说明

```javascript
{
  _id: String,
  userId: String,                 // 接收用户ID
  title: String,                  // 消息标题
  content: String,                // 消息内容
  type: String,                   // 消息类型：project | school | system
  status: String,                 // 状态：unread | read
  
  actionButton: {                 // 操作按钮（可选）
    text: String,                 // 按钮文字
    action: String,               // 动作：copy | viewProject | viewSchool
    data: String                  // 动作数据
  },
  
  createdTime: Date,              // 创建时间
  readTime: Date                  // 阅读时间
}
```

### 索引

- `userId` + `status` + `createdTime`
- `type`

---

## 7️⃣ schools - 学校信息表

### 字段说明

```javascript
{
  _id: String,
  name: String,                   // 学校名称
  inviteCode: String,             // 邀请码（唯一）
  createdTime: Date,              // 创建时间
  status: String,                 // 状态：active | inactive
  
  // 统计信息
  memberCount: Number,            // 成员数量
  projectCount: Number,           // 项目数量
  
  // 资源配额
  downloadQuota: {
    total: Number,                // 总额度
    used: Number,                 // 已使用
    remaining: Number             // 剩余
  }
}
```

### 索引

- `inviteCode`（唯一索引）
- `status`

---

## 8️⃣ reviewer_logs - 审核员操作日志表

### 字段说明

```javascript
{
  _id: String,
  reviewerId: String,             // 审核员ID
  account: String,                // 账号
  action: String,                 // 操作：login | logout | transfer_task
  
  // 操作详情
  taskId: String,                 // 相关任务ID
  taskType: String,               // 任务类型
  targetReviewerId: String,       // 目标审核员（转交时）
  reason: String,                 // 原因
  
  openid: String,                 // openid
  timestamp: Date,                // 时间戳
  success: Boolean                // 是否成功
}
```

### 索引

- `reviewerId` + `timestamp`
- `action`

---

## 🔄 数据流转示例

### 1. 项目审核流程

```
教师提交项目
  ↓
创建 projects_pending 记录（status: pending）
  ↓
系统自动分配审核员（assignedTo）
  ↓
审核员查看并审核
  ↓
提交审核结果
  ↓
更新 projects_pending（status: approved/rejected）
+ 创建 review_records 记录
+ 创建 system_messages 通知教师
  ↓
完成
```

### 2. 学校审核流程

```
教师提交学校申请
  ↓
创建 schools_pending 记录
  ↓
分配给审核员
  ↓
审核员审核
  ↓
审核通过
  ↓
生成邀请码
+ 创建 schools 记录
+ 创建 system_messages（包含邀请码）
  ↓
完成
```

---

## 📊 统计查询示例

### 审核员个人统计

```javascript
// 总审核数
db.collection('review_records')
  .where({ reviewerId: 'xxx' })
  .count();

// 今日审核数
db.collection('review_records')
  .where({
    reviewerId: 'xxx',
    reviewTime: _.gte(todayStart)
  })
  .count();

// 通过率
const total = await db.collection('review_records')
  .where({ reviewerId: 'xxx' })
  .count();
  
const passCount = await db.collection('review_records')
  .where({ 
    reviewerId: 'xxx',
    decision: 'pass'
  })
  .count();

const passRate = (passCount / total) * 100;
```

---

## 🔐 安全性建议

1. **密码加密**：使用 bcrypt 等加密库加密存储密码
2. **Token机制**：定期刷新Token，设置过期时间
3. **权限控制**：所有云函数入口都需验证Token和权限
4. **操作日志**：记录所有敏感操作，便于追溯
5. **数据备份**：定期备份关键数据

---

## 📝 初始化脚本

### 创建审核员账号

```javascript
// 在云开发控制台 - 数据库中执行
db.collection('reviewers').add({
  data: {
    account: 'reviewer',
    password: '123456',  // 实际应加密
    name: '审核员张三',
    role: 'reviewer',
    permissions: ['review_projects', 'review_schools'],
    department: '内容审核部',
    gradeLevel: ['1-2年级', '3-4年级', '5-6年级'],
    status: 'active',
    loginFailures: 0,
    currentToken: '',
    lastLoginTime: null,
    lastLoginOpenid: '',
    createdAt: new Date(),
    createdBy: 'system'
  }
});
```

---

**文档版本**: v1.0  
**最后更新**: 2026-01-31  
**维护者**: 开发团队

