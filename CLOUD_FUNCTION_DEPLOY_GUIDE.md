# 审核员云函数 - 部署和测试完整指南

## 📋 目录
1. [环境准备](#环境准备)
2. [云函数部署](#云函数部署)
3. [数据库初始化](#数据库初始化)
4. [前端配置](#前端配置)
5. [测试流程](#测试流程)
6. [常见问题](#常见问题)

---

## 1️⃣ 环境准备

### 检查云开发状态

1. **打开微信开发者工具**
2. **检查云开发是否开通**：
   - 点击顶部菜单"云开发"
   - 如果未开通，点击"开通云开发"
   - 选择一个环境（记住环境ID，后续会用到）

3. **确认环境ID**：
   - 进入云开发控制台
   - 查看"设置" → "环境名称/环境ID"
   - 示例：`cloud1-xxx`

---

## 2️⃣ 云函数部署

### 步骤1：安装云函数依赖

在终端中执行：

```bash
# 进入云函数目录
cd /home/wangyu/workspace/teacherapp/cloudfunctions/reviewer

# 安装依赖
npm install

# 如果速度慢，可以使用国内镜像
npm install --registry=https://registry.npmmirror.com
```

**预期结果**: 会在 `cloudfunctions/reviewer/` 目录下生成 `node_modules` 文件夹

### 步骤2：上传并部署云函数

**方法一：使用开发者工具（推荐）**

1. 在微信开发者工具左侧，找到"云函数"目录
2. 展开 `cloudfunctions` 目录
3. 右键点击 `reviewer` 文件夹
4. 选择"上传并部署：云端安装依赖"
5. 等待部署完成（大约1-2分钟）

**方法二：使用命令行**

```bash
# 在项目根目录执行
wx-cli cloud functions deploy reviewer
```

### 步骤3：验证部署

1. 在云开发控制台，点击"云函数"
2. 查看 `reviewer` 函数是否出现在列表中
3. 点击函数名称，查看详情
4. 状态应该显示为"部署成功"

---

## 3️⃣ 数据库初始化

### 步骤1：创建数据库集合

1. **打开云开发控制台** → **数据库**
2. **创建 reviewers 集合**：
   - 点击"添加集合"
   - 集合名称：`reviewers`
   - 点击"确定"

3. **创建 reviewer_logs 集合**：
   - 同上，集合名称：`reviewer_logs`

### 步骤2：添加测试审核员账号

在 `reviewers` 集合中点击"添加记录"，粘贴以下JSON：

```json
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
  "lastLoginTime": null,
  "lastLoginOpenid": "",
  "createdAt": new Date(),
  "createdBy": "system"
}
```

点击"确定"保存。

### 步骤3：配置数据库权限（重要！）

1. 在 `reviewers` 集合页面，点击"权限设置"
2. 选择"仅管理员可读写"
3. 点击"确定"

**⚠️ 为什么要这样设置？**
- 防止前端直接查询数据库，泄露审核员密码
- 所有操作必须通过云函数进行

### 步骤4：创建索引（可选，提升性能）

在 `reviewers` 集合中：
1. 点击"索引管理"
2. 点击"添加索引"
3. 填写以下内容：
   - 索引字段：`account`
   - 索引类型：`升序(asc)`
   - 勾选"唯一索引"
4. 点击"确定"

---

## 4️⃣ 前端配置

### 步骤1：初始化云开发

在 `app.js` 中确认已初始化云开发：

```javascript
// app.js
App({
  onLaunch: function () {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-xxx',  // 替换为您的环境ID
        traceUser: true
      });
    }
  }
});
```

### 步骤2：验证前端调用

前端代码已经更新，无需再修改。

确认 `pages/reviewer-login/reviewer-login.js` 中的代码：

```javascript
async realLoginAPI(account, password) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'reviewer',  // 云函数名称
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
}
```

---

## 5️⃣ 测试流程

### 完整测试步骤

#### 测试1：云函数测试（推荐先做）

1. **在云开发控制台测试**：
   - 打开云开发控制台 → 云函数
   - 点击 `reviewer` 函数
   - 点击"测试"标签页
   - 输入测试参数：
   ```json
   {
     "action": "login",
     "account": "reviewer",
     "password": "123456"
   }
   ```
   - 点击"测试"按钮
   - 查看返回结果

**预期结果**（成功）：
```json
{
  "success": true,
  "data": {
    "token": "reviewer_xxx_xxx_xxx",
    "userInfo": {
      "id": "审核员记录ID",
      "account": "reviewer",
      "name": "审核员张三",
      "role": "reviewer",
      "permissions": ["review_projects", "review_schools", "manage_users"],
      "department": "内容审核部"
    }
  }
}
```

**如果失败**，检查：
- 数据库中是否有测试账号
- 账号和密码是否匹配
- 云函数是否部署成功

#### 测试2：前端登录测试

1. **在开发者工具中编译项目**

2. **添加编译模式**：
   - 点击"编译"旁的下拉按钮
   - 选择"添加编译模式"
   - 模式名称：审核员登录
   - 启动页面：`pages/reviewer-login/reviewer-login`
   - 点击"确定"

3. **开始测试**：
   - 选择刚添加的编译模式，点击"编译"
   - 进入审核员登录页面
   - 输入账号：`reviewer`
   - 输入密码：`123456`
   - 点击"进入审核工作台"

**预期结果**：
- ✅ 按钮显示"登录中..."
- ✅ 1.5秒后显示"登录成功"
- ✅ 自动跳转到审核工作台首页
- ✅ 页面显示"欢迎回来，审核员张三"

#### 测试3：退出登录测试

1. 在审核工作台首页，点击右上角退出按钮
2. 确认退出
3. 应该跳转回登录页

#### 测试4：错误情况测试

**测试错误密码**：
- 账号：`reviewer`
- 密码：`wrongpassword`
- 预期：显示"密码错误"

**测试空账号**：
- 账号：留空
- 密码：`123456`
- 预期：显示"请输入账号"

---

## 6️⃣ 常见问题

### Q1: 云函数调用失败，提示"云函数未找到"

**原因**: 云函数未部署或部署失败

**解决方案**:
1. 检查云函数是否在云开发控制台中显示
2. 重新上传并部署云函数
3. 确认环境ID是否正确

### Q2: 登录一直转圈，没有响应

**原因**: 可能是网络问题或云函数报错

**解决方案**:
1. 打开调试器（Console）查看错误信息
2. 在云开发控制台查看云函数日志
3. 检查数据库连接是否正常

### Q3: 提示"数据库权限不足"

**原因**: 数据库权限设置问题

**解决方案**:
1. 数据库集合权限应该设置为"仅管理员可读写"
2. 云函数默认拥有管理员权限，不需要额外配置

### Q4: 登录成功但跳转后显示空白

**原因**: 工作台页面路径错误或未配置

**解决方案**:
1. 确认 `pages/reviewer/home/index` 页面存在
2. 确认 `app.json` 中已添加该页面路径
3. 重新编译项目

### Q5: 如何查看云函数运行日志？

1. 打开云开发控制台
2. 点击"云函数" → `reviewer`
3. 点击"日志"标签页
4. 可以看到所有调用记录和错误信息

### Q6: 测试完成后，如何禁用测试账号？

在数据库中修改测试账号：
```json
{
  "status": "inactive"  // 改为 inactive
}
```

或直接删除测试记录。

---

## 🎯 部署检查清单

部署前请确认以下步骤都已完成：

- [ ] 云开发已开通
- [ ] 云函数依赖已安装（node_modules 存在）
- [ ] 云函数已上传并部署成功
- [ ] `reviewers` 数据库集合已创建
- [ ] `reviewer_logs` 数据库集合已创建
- [ ] 测试审核员账号已添加
- [ ] 数据库权限已设置为"仅管理员可读写"
- [ ] 前端 app.js 中已初始化云开发
- [ ] 环境ID已正确配置
- [ ] 云函数测试通过
- [ ] 前端登录测试通过

---

## 🚀 下一步

部署完成后，您可以：

1. **添加更多审核员账号**
   - 在数据库中手动添加

2. **开发具体审核功能**
   - 项目审核页面
   - 学校审核页面
   - 用户管理页面

3. **增强安全性**
   - 使用 bcrypt 加密密码
   - 添加 Token 过期机制
   - 实现操作审计日志

4. **性能优化**
   - 添加数据库索引
   - 使用缓存减少查询

---

## 📞 技术支持

如遇到问题：
1. 查看云函数日志
2. 查看浏览器控制台
3. 参考 `DATABASE_INIT_REVIEWER.md`
4. 参考 `REVIEWER_LOGIN_GUIDE.md`

---

**✅ 完成以上步骤后，审核员登录系统即可正常使用！**

