# PBL Skill 接入清单 - 下一步操作指南

## 📋 当前状态

✅ **已完成**：
- Skill逻辑代码已创建（`pbl-skill.js` 和 `pbl-skill-helpers.js`）
- 完整的集成文档已准备
- 案例库、问题库、评估模板已准备
- Word文档导入方案已创建

⏳ **待完成**：
- **接入大模型（混元API）**
- 数据库准备和导入
- 前端UI集成

---

## 🎯 接下来要做的事（按优先级）

### 第1步：接入混元大模型 ⭐ **最重要！**

目前代码中AI生成部分使用的是模板，需要接入真实的混元API。

#### 1.1 修改 `pbl-skill.js` 中的生成函数

**文件位置**：`cloudfunctions/ai-assistant/pbl-skill.js`

**需要修改的函数**：`generateQuestionsWithRAG()`

**当前代码**（约320行）：
```javascript
// 当前使用智能模板生成
return generateIntelligentQuestions(projectInfo, referenceQuestions);
```

**改为**：
```javascript
// 调用混元API生成
try {
  const { callHunyuanAPI } = require('./hunyuan');
  
  // 构建prompt
  const prompt = buildPromptForQuestions(projectInfo, referenceQuestions);
  
  // 调用混元
  const messages = [
    { role: 'system', content: '你是一位资深的PBL项目设计专家。' },
    { role: 'user', content: prompt }
  ];
  
  const result = await callHunyuanAPI(messages, null, true);
  
  if (result.success) {
    // 解析返回的问题
    const questions = parseQuestionsFromAI(result.content);
    return {
      core: questions.core,
      sub: questions.sub,
      references: referenceQuestions.slice(0, 3).map(q => q.question)
    };
  }
} catch (error) {
  console.log('AI生成失败，使用模板:', error);
}

// 降级方案
return generateIntelligentQuestions(projectInfo, referenceQuestions);
```

**需要添加的辅助函数**：

```javascript
/**
 * 构建驱动性问题的Prompt
 */
function buildPromptForQuestions(projectInfo, referenceQuestions) {
  const { theme, grade, subjects } = projectInfo;
  
  const referenceText = referenceQuestions
    .slice(0, 5)
    .map((q, i) => `参考${i+1}：${q.question}`)
    .join('\n');
  
  return `请为以下项目设计驱动性问题：

【项目信息】
- 主题：${theme}
- 年级：${grade}年级
- 学科：${subjects.join('、')}

【参考优秀案例中的驱动性问题】
${referenceText}

【要求】
1. 核心问题要开放、有挑战性、联系真实世界
2. 符合${grade}年级学生的认知水平
3. 能够自然整合${subjects.join('、')}等学科
4. 参考上述案例的优点，但要创新，不要照搬
5. 生成1个核心问题和3个子问题

【输出格式】（仅输出问题，不要其他说明）
核心问题：[问题内容]
子问题1：[问题内容]
子问题2：[问题内容]
子问题3：[问题内容]`;
}

/**
 * 解析AI返回的问题
 */
function parseQuestionsFromAI(content) {
  const result = { core: '', sub: [] };
  
  const lines = content.split('\n').filter(l => l.trim());
  
  for (const line of lines) {
    if (line.includes('核心问题')) {
      const match = line.match(/[：:]\s*(.+)/);
      if (match) result.core = match[1].trim();
    } else if (line.match(/子问题\d/)) {
      const match = line.match(/[：:]\s*(.+)/);
      if (match) result.sub.push(match[1].trim());
    }
  }
  
  return result;
}
```

#### 1.2 类似地修改其他生成函数

需要接入AI的函数：
- `generateLearningObjectives()` - 生成学习目标
- `generateActivities()` - 生成学习活动
- `generateAssessment()` - 生成评估方案

**建议策略**：
- 先接入驱动性问题生成（最重要）
- 测试通过后，再接入其他生成功能
- 保留模板作为降级方案

---

### 第2步：准备数据库

#### 2.1 创建云数据库集合

在**微信云开发控制台**创建以下集合：

```json
// 1. pbl_cases - 案例库
{
  "_id": "case_001",
  "title": "校园垃圾分类大作战",
  "theme": "环保",
  "grade": 3,
  "subjects": ["科学", "数学", "美术", "语文"],
  "duration": "4周",
  "structured": {
    "drivingQuestion": {
      "core": "我们如何让校园垃圾分类变得更容易、更有趣？",
      "sub": ["...", "...", "..."]
    },
    "activities": [...]
  },
  "fullContent": "完整文本..."
}

// 2. pbl_questions - 问题库
{
  "_id": "q001",
  "question": "我们如何让校园垃圾分类变得更容易、更有趣？",
  "theme": "环保",
  "minGrade": 3,
  "maxGrade": 5
}

// 3. pbl_generated_designs - 用户生成的设计（可选）
{
  "_id": "design_xxx",
  "userId": "openid",
  "projectName": "...",
  "fullDesign": {...},
  "createdAt": "2026-03-08"
}
```

#### 2.2 导入数据

**选项A：先导入几个测试案例**

手动在云开发控制台添加1-2个案例用于测试：

```javascript
// 在云开发控制台 - 数据库 - pbl_cases 中添加
{
  "title": "校园垃圾分类大作战",
  "theme": "环保",
  "grade": 3,
  "subjects": ["科学", "数学", "美术"],
  "structured": {
    "drivingQuestion": {
      "core": "我们如何让校园垃圾分类变得更容易、更有趣？",
      "sub": [
        "现在学校垃圾分类存在什么问题？",
        "垃圾应该如何正确分类？",
        "怎样设计让同学们一看就懂的分类标识？"
      ]
    }
  }
}
```

**选项B：批量导入（如果您有Word文档）**

1. 使用 `scripts/parse_word_to_json.py` 转换Word
2. 在云开发控制台导入JSON

参考：`WORD_TO_DATABASE_GUIDE.md`

---

### 第3步：集成到AI助手

#### 3.1 修改主云函数

**文件位置**：`cloudfunctions/ai-assistant/index.js`

**在 `handleChat` 函数中添加Skill检测**（约60-70行）：

```javascript
// 在文件开头导入
const { PBLDesignSkill } = require('./pbl-skill');

// 在 handleChat 函数中，获取会话后添加：
async function handleChat(event, openid) {
  const { message, sessionId, projectContext } = event;
  
  try {
    // ... 现有代码：检查限额、获取会话 ...
    
    const session = await getOrCreateSession(sessionId, openid, projectContext);
    
    // ⭐ 新增：检测PBL Skill
    const inPBLFlow = session.context?.pblState?.currentStep !== undefined;
    const triggeredPBL = PBLDesignSkill.detectTrigger(message);
    
    if (inPBLFlow || triggeredPBL) {
      console.log('触发PBL设计Skill');
      
      const pblSkill = new PBLDesignSkill();
      const pblResponse = await pblSkill.process(
        message,
        session.context?.pblState
      );
      
      // 保存PBL状态
      await db.collection('chat_sessions')
        .doc(session._id)
        .update({
          data: {
            'context.pblState': pblResponse.state,
            updatedAt: new Date()
          }
        });
      
      // 添加消息记录
      await addMessageToSession(session._id, {
        role: 'user',
        content: message,
        timestamp: new Date()
      });
      
      await addMessageToSession(session._id, {
        role: 'assistant',
        content: pblResponse.content,
        timestamp: new Date(),
        suggestions: pblResponse.suggestions,
        design: pblResponse.design
      });
      
      // 记录使用次数
      await recordUsage(openid);
      
      return {
        success: true,
        data: {
          sessionId: session._id,
          message: pblResponse.content,
          suggestions: pblResponse.suggestions || [],
          design: pblResponse.design,
          skillUsed: 'pbl-design',
          remainingQuota: usageCheck.remaining - 1
        }
      };
    }
    
    // 否则使用普通AI流程
    // ... 现有代码 ...
  }
}
```

#### 3.2 上传云函数

```bash
# 右键点击云函数目录
cloudfunctions/ai-assistant/
# 选择"上传并部署：云端安装依赖"
```

---

### 第4步：前端UI适配（可选，后续优化）

修改 `pages/ai-assistant/ai-assistant.js`：

```javascript
// 在 data 中添加
activeSkill: null,
skillProgress: null

// 修改 callAIAssistant 函数处理返回
if (result.result.data.skillUsed === 'pbl-design') {
  this.setData({
    activeSkill: 'pbl-design',
    skillProgress: result.result.data.state?.currentStep
  });
}

// 添加 WXML 显示Skill状态（可选）
<view class="skill-badge" wx:if="{{activeSkill}}">
  🎯 PBL项目设计助手
</view>
```

---

## 🧪 测试步骤

### 测试1：基本触发

1. 打开小程序AI助手
2. 输入："我想设计一个项目化学习方案"
3. 期望：AI识别并启动PBL Skill，询问项目信息

### 测试2：完整流程

1. 触发Skill
2. 提供信息："三年级环保主题，科学数学美术，4周"
3. 确认信息
4. 期望：生成完整设计方案

### 测试3：RAG检索

1. 确保数据库有测试案例
2. 设计环保主题项目
3. 期望：生成的驱动性问题参考了数据库中的案例

---

## 📚 参考文档

- **完整集成指南**：`INTEGRATION_GUIDE.md`（43KB，最详细）
- **数据导入指南**：`WORD_TO_DATABASE_GUIDE.md`（23KB）
- **Skill定义**：`SKILL.md`（Cursor需要，不要删除）

**知识库资源**（供AI参考）：
- `examples.md` - 5个完整案例
- `question_bank.md` - 68个驱动性问题
- `assessment_templates.md` - 8种评估模板

---

## 💡 关键提醒

### ⚠️ 当前最重要的工作

**混元API接入** 是核心！

目前代码已经写好，但生成部分使用的是模板逻辑。需要：

1. 在 `pbl-skill.js` 中找到 `generateQuestionsWithRAG()` 函数
2. 将模板生成改为调用 `callHunyuanAPI()`
3. 测试生成质量

### 📊 建议的开发顺序

```
优先级 1 (必须): 接入混元API生成驱动性问题
优先级 2 (必须): 添加1-2个测试案例到数据库
优先级 3 (必须): 主云函数集成Skill检测
优先级 4 (可选): 接入其他AI生成功能
优先级 5 (可选): 前端UI优化
```

### 🎯 预期效果

完成后，老师在AI助手中输入：
```
"帮我设计一个三年级的环保项目"
```

AI会：
1. ✅ 识别触发PBL Skill
2. ✅ 收集必要信息
3. ✅ 检索数据库中的参考案例
4. ✅ 调用混元API生成新的驱动性问题
5. ✅ 生成完整的项目设计方案
6. ✅ 返回设计 + 参考案例

---

## 🆘 遇到问题？

1. **AI生成不理想**：调整 `buildPromptForQuestions()` 中的prompt
2. **数据库查询失败**：检查集合名称和字段名
3. **Skill未触发**：检查 `detectTrigger()` 中的关键词
4. **详细步骤**：查看 `INTEGRATION_GUIDE.md`

---

**下一步行动**：打开 `cloudfunctions/ai-assistant/pbl-skill.js`，找到第320行左右的 `generateQuestionsWithRAG()` 函数，开始接入混元API！

祝开发顺利！🚀
