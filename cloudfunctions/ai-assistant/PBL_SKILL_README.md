# PBL设计Skill - 小程序集成完成 ✅

## 🎉 已创建的文件

### 1. Skill核心模块
- ✅ `cloudfunctions/ai-assistant/pbl-skill.js` - 主Skill逻辑
- ✅ `cloudfunctions/ai-assistant/pbl-skill-helpers.js` - 辅助生成函数

### 2. 文档资源
- ✅ `.cursor/skills/pbl-design/INTEGRATION_GUIDE.md` - 完整集成指南
- ✅ `.cursor/skills/pbl-design/SKILL.md` - Skill设计文档
- ✅ `.cursor/skills/pbl-design/examples.md` - 5个完整案例
- ✅ `.cursor/skills/pbl-design/question_bank.md` - 68个驱动性问题
- ✅ `.cursor/skills/pbl-design/assessment_templates.md` - 8种评估模板

## 🚀 快速集成步骤

### 步骤1：复制文件到云函数

```bash
# 已经创建好的文件：
cloudfunctions/ai-assistant/
├── pbl-skill.js           # ✅ 已创建
└── pbl-skill-helpers.js   # ✅ 已创建
```

### 步骤2：修改主云函数

在 `cloudfunctions/ai-assistant/index.js` 中添加：

```javascript
// 1. 在文件开头导入
const { PBLDesignSkill } = require('./pbl-skill');

// 2. 在 handleChat 函数中添加Skill检测
const inPBLFlow = session.context?.pblState?.currentStep !== undefined;
const triggeredPBL = PBLDesignSkill.detectTrigger(message);

if (inPBLFlow || triggeredPBL) {
  const pblSkill = new PBLDesignSkill();
  const pblResponse = await pblSkill.process(
    message,
    session.context?.pblState
  );
  
  // 保存状态并返回
  await db.collection('chat_sessions').doc(session._id).update({
    data: { 'context.pblState': pblResponse.state }
  });
  
  return {
    success: true,
    data: {
      message: pblResponse.content,
      suggestions: pblResponse.suggestions,
      design: pblResponse.design,
      skillUsed: 'pbl-design'
    }
  };
}
```

### 步骤3：创建数据库集合

在云开发控制台创建：
- `pbl_cases` - 案例库
- `pbl_questions` - 问题库
- `pbl_generated_designs` - 生成的设计方案

### 步骤4：前端集成

在 `pages/ai-assistant/ai-assistant.js` 中已有的基础上添加：
- Skill状态显示
- 建议按钮处理
- 设计结果卡片

详见 `INTEGRATION_GUIDE.md` 第5步。

### 步骤5：测试

在小程序AI助手中输入：
```
"我想设计一个三年级的环保项目"
"帮我做个跨学科项目化学习方案"
"设计一个PBL项目"
```

## ✨ 功能特性

### 智能对话收集
- ✅ 自动提取项目信息（主题、年级、学科、时长）
- ✅ 渐进式询问缺失信息
- ✅ 提供快速模板选择
- ✅ 支持自然语言输入

### 完整方案生成
- ✅ 项目依据分析（真实世界+课标+学情）
- ✅ 驱动性问题设计（核心问题+子问题）
- ✅ 学习目标制定（知识+能力+素养）
- ✅ 分阶段活动设计（3-5个阶段）
- ✅ 多元评估方案
- ✅ 完整资源清单
- ✅ 项目时间线
- ✅ 差异化策略
- ✅ 实施建议

### 智能推荐
- ✅ 推荐相似案例
- ✅ 匹配驱动性问题库
- ✅ 提供学科融合建议

### 灵活扩展
- ✅ 支持方案优化
- ✅ 支持Word文档生成（可选）
- ✅ 支持保存到项目库

## 📊 数据准备

### 将markdown转为JSON

您需要将以下资源转为JSON格式并导入数据库：

1. **案例库** (examples.md → pbl_cases集合)
```javascript
{
  "_id": "case_001",
  "title": "校园垃圾分类大作战",
  "theme": "环保",
  "grade": 3,
  "subjects": ["科学", "数学", "美术", "语文"],
  "duration": "4周",
  // ... 完整案例数据
}
```

2. **问题库** (question_bank.md → pbl_questions集合)
```javascript
{
  "_id": "q001",
  "question": "我们如何让校园垃圾分类变得更容易、更有趣？",
  "theme": "环保",
  "minGrade": 3,
  "maxGrade": 5
}
```

## 🎯 使用示例

### 示例1：完整流程

```
用户：我想设计一个三年级的环保项目

AI：您好！我是PBL项目设计助手...
    请告诉我：项目主题、年级、学科、时长

用户：环保主题，三年级，科学、数学、美术，4周

AI：✅ 已收集信息：
    主题：环保
    年级：三年级
    学科：科学、数学、美术
    时长：4周
    
    [显示确认信息]

用户：确认

AI：[生成完整设计方案]
    🎉 设计方案生成成功！
    
    项目名称：环保探索之旅
    核心问题：我们如何让校园垃圾分类变得更容易、更有趣？
    ...
    
    [按钮：生成Word文档] [查看案例] [优化方案]
```

### 示例2：快速模板

```
用户：帮我设计跨学科项目

AI：[显示欢迎界面]
    [按钮：环保(三年级)] [科技(五年级)] [文化(六年级)]

用户：[点击"环保(三年级)"]

AI：好的！我将为您设计三年级环保主题项目。
    请问项目时长是多久？
    [按钮：2周] [4周] [6周] [8周]

用户：[点击"4周"]

AI：[确认信息并生成方案]
```

## 🔧 进阶功能（可选）

### 1. Word文档生成

需要安装依赖：
```bash
npm install docx --save
# 或
npm install officegen --save
```

在云函数中添加 `generateWordDoc` action，详见 `INTEGRATION_GUIDE.md` 第6步。

### 2. 方案保存

保存到用户项目库：
```javascript
await db.collection('pbl_generated_designs').add({
  data: {
    userId: openid,
    projectName: design.projectInfo.projectName,
    fullDesign: design,
    createdAt: new Date()
  }
});
```

### 3. 分享功能

生成分享码或小程序码，让其他教师查看方案。

## 📝 注意事项

1. **性能优化**
   - 生成过程需要10-15秒，建议显示加载动画
   - 可以考虑异步生成，完成后推送通知

2. **数据准备**
   - 案例库和问题库需要提前导入
   - 建议先导入5-10个高质量案例测试

3. **错误处理**
   - 所有数据库操作都有try-catch
   - 提供降级方案（模板生成）

4. **用户体验**
   - 建议按钮样式要显眼
   - 生成结果要清晰展示
   - 提供多种后续操作选项

## 🐛 常见问题

### Q: Skill没有被触发？
A: 检查 `PBLDesignSkill.detectTrigger()` 中的关键词列表，确保包含用户可能输入的词。

### Q: 信息提取不准确？
A: 调整 `extractProjectInfo()` 中的正则表达式，增加更多匹配模式。

### Q: 生成的方案太简单？
A: 丰富 `pbl-skill-helpers.js` 中的模板内容，或增加数据库中的参考资料。

### Q: 如何添加新的主题？
A: 在案例库中添加该主题的案例，在问题库中添加相关问题即可自动支持。

## 📚 相关文档

- **完整集成指南**：`INTEGRATION_GUIDE.md`
- **快速上手**：`QUICKSTART.md`
- **案例参考**：`examples.md`
- **问题库**：`question_bank.md`
- **评估模板**：`assessment_templates.md`

## 🎓 下一步

1. ✅ 复制文件到云函数目录
2. ✅ 修改主云函数集成Skill检测
3. ✅ 创建数据库集合
4. ✅ 导入案例和问题数据
5. ✅ 前端添加UI组件
6. ✅ 部署并测试

---

**集成完成后，您的小程序将拥有强大的PBL项目设计能力！** 🚀

教师只需在AI助手中简单对话，就能获得专业的跨学科项目化学习设计方案。

如有问题，请参考 `INTEGRATION_GUIDE.md` 或直接询问AI助手。
