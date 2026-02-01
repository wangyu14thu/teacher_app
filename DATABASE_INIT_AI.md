# 数据库集合初始化指南

## 需要创建的集合

### 1. knowledge_base - 案例知识库

在云开发控制台创建 `knowledge_base` 集合。

**字段说明**：
```javascript
{
  caseId: String,              // 案例ID
  title: String,               // 项目标题
  grade: Number,               // 年级（1-6）
  subject: String,             // 学科
  fullContent: String,         // 完整案例内容
  keyPoints: Array,            // 关键点列表
  drivingQuestion: String,     // 驱动性问题示例
  interdisciplinaryConcept: String,  // 跨学科概念
  embedding: Array,            // 向量（后期优化）
  uploadTime: Date,            // 上传时间
  uploadBy: String             // 上传者openid
}
```

**权限设置**：
- 所有用户可读
- 仅管理员可写

### 2. chat_sessions - 对话会话

在云开发控制台创建 `chat_sessions` 集合。

**字段说明**：
```javascript
{
  sessionId: String,           // 会话ID（即_id）
  userId: String,              // 用户openid
  projectId: String,           // 关联的项目ID（可选）
  messages: Array,             // 消息列表
  context: Object,             // 上下文信息
  createdAt: Date,             // 创建时间
  updatedAt: Date              // 更新时间
}
```

**权限设置**：
- 仅创建者可读写

## 创建步骤

1. 登录**微信开发者工具**
2. 点击**云开发控制台**
3. 进入**数据库**
4. 点击**+** 创建集合
5. 输入集合名称：`knowledge_base`
6. 点击**确定**
7. 重复步骤4-6，创建 `chat_sessions`

## 权限配置

### knowledge_base 权限

```json
{
  "read": true,
  "write": "doc.uploadBy == auth.openid || auth.openid == 'ADMIN_OPENID'"
}
```

### chat_sessions 权限

```json
{
  "read": "doc.userId == auth.openid",
  "write": "doc.userId == auth.openid"
}
```

## 初始化示例数据（可选）

### 添加示例知识到 knowledge_base

在云开发控制台 → 数据库 → knowledge_base → 添加记录：

```json
{
  "caseId": "case001",
  "title": "校园测量工程",
  "grade": 2,
  "subject": "数学",
  "fullContent": "这是一个关于测量的PBL项目...",
  "keyPoints": ["测量工具使用", "数据记录", "团队协作"],
  "drivingQuestion": "作为小小工程师，我们如何测量校园中的各种物体，制作一份校园测量地图？",
  "interdisciplinaryConcept": "测量与数据",
  "uploadTime": "2026-02-01T00:00:00.000Z",
  "uploadBy": "system"
}
```

## 完成后测试

在云函数中测试数据库连接：

```javascript
// 测试knowledge_base
const kb = await db.collection('knowledge_base').get();
console.log('知识库记录数:', kb.data.length);

// 测试chat_sessions
const sessions = await db.collection('chat_sessions').get();
console.log('会话记录数:', sessions.data.length);
```

