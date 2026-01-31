# 审核员数据库初始化脚本

## 数据库集合说明

### 1. reviewers (审核员表)

**集合名称**: `reviewers`

**字段说明**:
```javascript
{
  _id: "auto_generated_id",          // 自动生成
  account: "reviewer001",             // 登录账号（唯一）
  password: "encrypted_password",     // 密码（生产环境必须加密）
  name: "张三",                       // 审核员姓名
  role: "reviewer",                   // 角色：reviewer/admin/super_admin
  permissions: [                      // 权限列表
    "review_projects",                // 审核项目
    "review_schools",                 // 审核学校
    "manage_users"                    // 管理用户
  ],
  department: "内容审核部",           // 所属部门
  status: "active",                   // 状态：active/inactive/locked
  lastLoginTime: Date,                // 最后登录时间
  lastLoginOpenid: "xxx",             // 最后登录的openid
  loginFailures: 0,                   // 登录失败次数
  lastFailureTime: Date,              // 最后失败时间
  currentToken: "reviewer_xxx",       // 当前有效token
  createdAt: Date,                    // 创建时间
  createdBy: "admin_id"               // 创建者ID
}
```

**创建方式**:
1. 在微信开发者工具中打开"云开发控制台"
2. 点击"数据库" → "添加集合"
3. 集合名称填写：`reviewers`
4. 点击"确定"

**添加测试数据**:
```javascript
// 在云开发控制台数据库中，点击 reviewers 集合的"添加记录"
{
  "account": "reviewer",
  "password": "123456",
  "name": "审核员张三",
  "role": "reviewer",
  "permissions": ["review_projects", "review_schools", "manage_users"],
  "department": "内容审核部",
  "status": "active",
  "loginFailures": 0,
  "createdAt": new Date(),
  "createdBy": "system"
}
```

---

### 2. reviewer_logs (审核员操作日志表)

**集合名称**: `reviewer_logs`

**字段说明**:
```javascript
{
  _id: "auto_generated_id",
  reviewerId: "reviewer_user_id",    // 审核员ID
  account: "reviewer001",            // 审核员账号
  action: "login",                   // 操作类型：login/logout/review/approve/reject
  targetType: "project",             // 目标类型：project/school/user
  targetId: "target_id",             // 目标ID
  details: {},                       // 操作详情
  openid: "user_openid",             // 用户openid
  timestamp: Date,                   // 操作时间
  success: true,                     // 是否成功
  errorMessage: ""                   // 错误信息（如有）
}
```

**创建方式**:
同上，集合名称填写：`reviewer_logs`

---

## 数据库索引配置

为了提高查询性能，需要为以下字段创建索引：

### reviewers 集合索引
```javascript
// 1. account 字段（唯一索引）
{
  "account": 1
}

// 2. status 字段
{
  "status": 1
}

// 3. 复合索引：account + status
{
  "account": 1,
  "status": 1
}
```

**创建方式**:
1. 在云开发控制台，进入 `reviewers` 集合
2. 点击"索引管理" → "添加索引"
3. 填写索引字段和类型
4. 勾选"唯一索引"（针对 account 字段）

### reviewer_logs 集合索引
```javascript
// 1. reviewerId 字段
{
  "reviewerId": 1
}

// 2. timestamp 字段（降序）
{
  "timestamp": -1
}

// 3. action 字段
{
  "action": 1
}
```

---

## 数据库权限配置

**重要**: 必须配置数据库权限，防止前端直接访问！

### 设置集合权限

1. 在云开发控制台，进入每个集合
2. 点击"权限设置"
3. 选择"仅创建者及管理员可读写"或"仅管理员可读写"

**推荐配置**:
- `reviewers`: **仅管理员可读写** （防止前端直接查询密码）
- `reviewer_logs`: **仅创建者及管理员可读写**

---

## 快速初始化命令（可选）

如果您的云开发环境支持数据库导入，可以使用以下JSON文件：

### reviewers.json
```json
[
  {
    "account": "reviewer",
    "password": "123456",
    "name": "审核员张三",
    "role": "reviewer",
    "permissions": ["review_projects", "review_schools", "manage_users"],
    "department": "内容审核部",
    "status": "active",
    "loginFailures": 0,
    "currentToken": "",
    "createdAt": {"$date": "2024-01-01T00:00:00.000Z"},
    "createdBy": "system"
  },
  {
    "account": "admin",
    "password": "admin123",
    "name": "超级管理员",
    "role": "super_admin",
    "permissions": ["review_projects", "review_schools", "manage_users", "manage_reviewers", "view_reports"],
    "department": "管理部",
    "status": "active",
    "loginFailures": 0,
    "currentToken": "",
    "createdAt": {"$date": "2024-01-01T00:00:00.000Z"},
    "createdBy": "system"
  }
]
```

---

## ⚠️ 安全提示

### 1. 密码加密（生产环境必做！）

**当前问题**: 数据库中密码是明文存储，极不安全！

**解决方案**: 使用 bcrypt 加密

在云函数中安装 bcrypt:
```bash
cd cloudfunctions/reviewer
npm install bcryptjs --save
```

修改云函数代码:
```javascript
const bcrypt = require('bcryptjs');

// 注册时加密密码
const hashedPassword = await bcrypt.hash(password, 10);

// 登录时验证
const isMatch = await bcrypt.compare(password, reviewer.password);
```

### 2. Token 过期时间

建议添加 Token 过期机制：
```javascript
// 在生成 token 时添加过期时间
const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7天

// 在数据库中存储
{
  currentToken: token,
  tokenExpiresAt: new Date(expiresAt)
}

// 验证时检查
if (new Date() > reviewer.tokenExpiresAt) {
  return { success: false, message: 'Token已过期' };
}
```

### 3. 登录失败限制

当前已实现：5次失败后锁定账号

解锁方式：管理员手动重置 `loginFailures` 为 0

---

## 测试步骤

1. ✅ 创建数据库集合
2. ✅ 添加测试数据
3. ✅ 配置索引
4. ✅ 设置权限
5. ✅ 部署云函数
6. ✅ 前端测试登录

---

## 常见问题

**Q: 如何添加新的审核员账号？**
A: 在云开发控制台的 `reviewers` 集合中手动添加记录

**Q: 忘记密码怎么办？**
A: 管理员在数据库中直接修改密码字段（记得加密）

**Q: 如何查看审核员操作日志？**
A: 查询 `reviewer_logs` 集合，可按 reviewerId 或 timestamp 筛选

**Q: Token 会过期吗？**
A: 当前版本不会自动过期，建议按上述方式添加过期机制

---

完成以上配置后，审核员登录系统即可正常使用！

