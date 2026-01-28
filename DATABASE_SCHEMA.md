# PBL营（教师端）- 数据库结构

## 需要在云开发控制台创建的数据库集合

### 1. teachers - 教师信息表
```json
{
  "_id": "记录ID（自动生成）",
  "openid": "用户OpenID",
  "nickname": "昵称",
  "grade": "任教年级",
  "subject": "任教学科",
  "region": "地区",
  "phone": "手机号",
  "points": 0,
  "registerTime": "注册时间戳",
  "createTime": "服务器时间"
}
```
**权限设置**：仅创建者可读写

---

### 2. works - 教师作品表
```json
{
  "_id": "记录ID（自动生成）",
  "openid": "教师OpenID",
  "title": "项目标题",
  "grade": "适用年级",
  "subject": "学科",
  "description": "项目描述",
  "files": ["文件URL数组"],
  "status": "审核状态：pending/approved/rejected",
  "points": "审核通过后获得的积分",
  "createTime": "服务器时间"
}
```
**权限设置**：仅创建者可读写

---

### 3. purchases - 购买记录表
```json
{
  "_id": "记录ID（自动生成）",
  "openid": "教师OpenID",
  "type": "资料类型：theory/case/tool",
  "itemId": "资料ID",
  "itemTitle": "资料标题",
  "points": "消耗积分",
  "createTime": "服务器时间"
}
```
**权限设置**：仅创建者可读写

---

### 4. materials - 资料库表（可选，用于云端管理资料）
```json
{
  "_id": "记录ID（自动生成）",
  "type": "资料类型：theory/case/tool",
  "category": "分类",
  "title": "标题",
  "subtitle": "副标题",
  "description": "描述",
  "fileUrl": "文件URL",
  "points": "所需积分",
  "createTime": "服务器时间"
}
```
**权限设置**：所有用户可读，仅管理员可写

---

## 创建步骤

1. 打开微信开发者工具
2. 点击"云开发"按钮
3. 进入"数据库"标签
4. 点击"添加集合"
5. 依次创建以下集合：
   - ✅ `teachers` - 教师信息
   - ✅ `works` - 教师作品
   - ✅ `purchases` - 购买记录
   - ✅ `materials` - 资料库（可选）

---

## 云函数部署

需要部署以下云函数：

1. **login** - 获取用户OpenID
   - 目录：`cloudfunctions/login/`
   - 操作：右键 → 上传并部署：云端安装依赖

2. **teacher** - 教师相关操作
   - 目录：`cloudfunctions/teacher/`
   - 操作：右键 → 上传并部署：云端安装依赖

---

## 注意事项

1. 所有集合创建后建议设置权限为"仅创建者可读写"
2. 云函数需要"上传并部署：云端安装依赖"才能正常使用
3. 确保`app.js`中的环境ID已正确配置
4. 首次使用需要在云开发控制台开通云开发服务

