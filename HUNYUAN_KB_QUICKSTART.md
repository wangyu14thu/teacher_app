# 腾讯混元知识库快速接入指南

## 一、为什么选择混元知识库？

### 对比分析

| 维度 | 自建RAG | 混元知识库 |
|-----|---------|-----------|
| 开发时间 | 3-5天 | 0.5天 |
| 技术难度 | 高 | 低 |
| 效果质量 | 看实现 | 专业优化 |
| 月成本（1000用户） | ~100元 | ~300元 |
| 维护成本 | 高 | 低 |
| **推荐指数** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

### 核心优势

1. **开箱即用**：无需实现向量化、检索算法
2. **专业优化**：腾讯团队优化的RAG效果
3. **弹性成本**：按需付费，不用不花钱
4. **快速迭代**：节省开发时间，专注业务逻辑

## 二、腾讯混元知识库功能

### 2.1 核心能力

- ✅ **文档解析**：支持PDF、Word、TXT等格式
- ✅ **智能分块**：自动将文档切分为合适的片段
- ✅ **向量化存储**：自动生成Embedding并存储
- ✅ **语义检索**：高效的向量检索
- ✅ **RAG对话**：知识库+对话一体化

### 2.2 支持的文档类型

- 📄 PDF
- 📝 Word (docx)
- 📃 TXT
- 📊 Markdown
- 🌐 网页（URL）

## 三、快速开始（按Gemini建议）

### 第1步：开通腾讯混元知识库

#### 1.1 登录腾讯云控制台

访问：https://console.cloud.tencent.com/hunyuan

#### 1.2 创建知识库

1. 点击 **知识库管理**
2. 点击 **新建知识库**
3. 填写信息：
   - 知识库名称：`PBL案例知识库`
   - 描述：`项目化学习案例知识库`
   - 模型：选择 `hunyuan-standard`（标准版）

#### 1.3 获取知识库ID

创建成功后，会得到一个 `KnowledgeBaseId`，类似：`kb-xxxxxx`

**保存这个ID，后面会用到！**

---

### 第2步：上传测试案例

#### 2.1 准备5个代表性案例

按Gemini建议，先上传5个最有代表性的案例：

**建议选择**：
1. 低年级案例（1-2年级）- 如"校园测量"
2.中年级案例（3-4年级）- 如"传统文化"
3.高年级案例（5-6年级）- 如"环保项目"
4. 跨学科案例 - 如"科学+艺术"
5. 典型完整案例 - 包含驱动性问题、子问题、活动设计

#### 2.2 文档格式要求

每个案例文档包含：

```markdown
# 案例标题：校园测量工程

## 基本信息
- 年级：2年级
- 学科：数学、科学
- 课时：8课时

## 驱动性问题
"作为小小测量师，我们如何为学校设计一套测量方案？"

## 跨学科概念
结构与功能

## 子问题链
1. 我们身边有哪些东西需要测量？
2. 不同的东西用什么工具测量？
3. 如何设计测量记录表？

## 探究活动
1. 活动一：认识测量工具
2. 活动二：校园测量实践
3. 活动三：数据整理与展示

## 学生作品展示
[描述学生作品...]

## 教师反思
[教学反思...]
```

#### 2.3 上传方式

**方式一：控制台上传**（推荐快速测试）
1. 进入知识库详情页
2. 点击 **上传文档**
3. 选择文件（支持批量上传）
4. 等待解析完成（一般几分钟）

**方式二：API上传**（后续批量使用）
```javascript
// 稍后会提供代码
```

---

### 第3步：控制台测试调试

#### 3.1 测试知识检索

在控制台右侧聊天框测试：

**测试问题**：
```
1. "我想设计一个数学主题的PBL项目"
2. "如何为低年级学生设计驱动性问题？"
3. "有没有关于环保的案例参考？"
4. "跨学科概念'结构与功能'怎么用？"
```

**检查效果**：
- ✅ 能否召回相关案例？
- ✅ 回答是否基于知识库内容？
- ✅ 回答质量如何？

#### 3.2 调整System Prompt

在知识库设置中，配置系统提示词：

```
你是一个专业的PBL（项目化学习）教学设计助手，名字叫"小助"。

你的任务是帮助小学教师设计高质量的PBL项目。

核心能力：
1. 基于知识库中的优秀案例，为教师提供参考和灵感
2. 生成符合PBL理念的驱动性问题
3. 设计合理的子问题链和探究活动
4. 提供跨学科概念的应用建议

回答要求：
- 语言亲切、专业，富有启发性
- 优先引用知识库中的案例作为参考
- 如果没有完全匹配的案例，可以结合多个案例给出建议
- 每次回答都要具体、可操作，避免空洞的理论
- 如果教师的问题超出PBL教学设计范围，友好地引导回主题

示例风格：
"我为您找到了一个很好的参考案例——《校园测量工程》（2年级数学+科学）。这个案例的驱动性问题是：'作为小小测量师，我们如何为学校设计一套测量方案？'这个问题给了学生明确的角色和任务，您可以参考这个思路..."
```

**反复调试，直到回答风格满意！**

---

### 第4步：云函数对接

#### 4.1 安装SDK

在 `cloudfunctions/ai-assistant/` 目录：

```bash
npm install tencentcloud-sdk-nodejs --save
```

#### 4.2 修改云函数

创建新文件：`cloudfunctions/ai-assistant/knowledge-base.js`

```javascript
// cloudfunctions/ai-assistant/knowledge-base.js
const tencentcloud = require('tencentcloud-sdk-nodejs');
const HunyuanClient = tencentcloud.hunyuan.v20230901.Client;

/**
 * 使用知识库对话
 */
async function chatWithKnowledgeBase(messages, knowledgeBaseId) {
  try {
    const client = new HunyuanClient({
      credential: {
        secretId: process.env.HUNYUAN_SECRET_ID,
        secretKey: process.env.HUNYUAN_SECRET_KEY,
      },
      region: 'ap-guangzhou',
    });

    const params = {
      Model: 'hunyuan-standard',
      Messages: messages.map(msg => ({
        Role: msg.role,
        Content: msg.content
      })),
      // 关键：指定知识库ID
      KnowledgeBaseId: knowledgeBaseId,
      // 知识库检索配置
      KnowledgeBaseConfig: {
        TopK: 3,              // 召回3个最相关的片段
        Score: 0.6,           // 相似度阈值
        EnableCitation: true  // 启用引用标注
      },
      Stream: false
    };

    const response = await client.ChatCompletions(params);
    
    return {
      success: true,
      content: response.Choices[0].Message.Content,
      // 返回引用的知识片段
      citations: response.Choices[0].Citations || [],
      usage: response.Usage
    };

  } catch (error) {
    console.error('知识库对话错误:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 上传文档到知识库
 */
async function uploadDocument(knowledgeBaseId, fileContent, fileName) {
  try {
    const client = new HunyuanClient({
      credential: {
        secretId: process.env.HUNYUAN_SECRET_ID,
        secretKey: process.env.HUNYUAN_SECRET_KEY,
      },
      region: 'ap-guangzhou',
    });

    const params = {
      KnowledgeBaseId: knowledgeBaseId,
      File: fileContent,
      FileName: fileName
    };

    const response = await client.UploadDocument(params);
    
    return {
      success: true,
      documentId: response.DocumentId
    };

  } catch (error) {
    console.error('上传文档错误:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

module.exports = {
  chatWithKnowledgeBase,
  uploadDocument
};
```

#### 4.3 修改配置文件

编辑 `cloudfunctions/ai-assistant/config.json`：

```json
{
  "permissions": {
    "openapi": []
  },
  "env": {
    "HUNYUAN_SECRET_ID": "你的SecretId",
    "HUNYUAN_SECRET_KEY": "你的SecretKey",
    "KNOWLEDGE_BASE_ID": "kb-xxxxxx"
  },
  "timeout": 20
}
```

#### 4.4 修改主函数

编辑 `cloudfunctions/ai-assistant/index.js`：

```javascript
// 在文件顶部添加
const { chatWithKnowledgeBase } = require('./knowledge-base');

// 修改 callAI 函数
async function callAI(messages, projectContext) {
  try {
    // 优先使用知识库
    const knowledgeBaseId = process.env.KNOWLEDGE_BASE_ID;
    
    if (knowledgeBaseId) {
      console.log('使用知识库模式');
      const response = await chatWithKnowledgeBase(messages, knowledgeBaseId);
      
      if (response.success) {
        return {
          content: response.content,
          toolCalls: [],
          suggestions: generateSuggestions(response.content, projectContext),
          citations: response.citations, // 引用的知识片段
          usage: response.usage
        };
      }
    }
    
    // 降级到原有逻辑
    return await fallbackAIResponse(messages, projectContext);
    
  } catch (error) {
    console.error('AI调用错误:', error);
    return await fallbackAIResponse(messages, projectContext);
  }
}
```

#### 4.5 前端显示引用

修改 `pages/ai-assistant/ai-assistant.wxml`，显示AI引用的知识：

```xml
<!-- AI消息气泡中添加 -->
<view wx:if="{{item.citations && item.citations.length > 0}}" class="citations">
  <text class="citation-label">📚 参考案例：</text>
  <view wx:for="{{item.citations}}" wx:for-item="cite" wx:key="index" class="citation-item">
    <text class="citation-text">{{cite.Title}}</text>
  </view>
</view>
```

---

### 第5步：部署测试

#### 5.1 部署云函数

```bash
# 右键点击 cloudfunctions/ai-assistant
# 选择：上传并部署：云端安装依赖
```

#### 5.2 测试对话

在小程序中测试：

**测试问题**：
```
"我想为4年级学生设计一个关于传统文化的PBL项目，有什么建议吗？"
```

**期望效果**：
- ✅ AI能找到相关案例
- ✅ 回答基于知识库内容
- ✅ 显示引用的案例标题

#### 5.3 监控成本

在腾讯云控制台查看：
- 知识库调用次数
- Token消耗量
- 当日费用

---

## 四、成本估算

### 4.1 知识库费用

**计费方式**：
- **存储费用**：按文档数量，约0.01元/文档/月
- **检索费用**：按调用次数，约0.002元/次
- **对话费用**：与普通混元API相同

**示例**：
- 100个案例文档：1元/月
- 1000次检索调用：2元/月
- 1000次对话（平均2000 tokens）：20元/月
- **总计**：约23元/月

**1000个用户**（每人每月10次对话）：
- 文档存储：1元
- 检索：20元
- 对话：200元
- **总计**：约221元/月

### 4.2 体验额度

腾讯云新用户通常会赠送：
- 免费额度：100元-500元
- 体验期：1-3个月

**足够你测试和验证市场！**

---

## 五、对比总结

### 5.1 三个方案对比

| 方案 | 开发时间 | 月成本（1000用户） | 效果 | 维护成本 |
|-----|---------|------------------|------|----------|
| **当前方案**（无RAG） | 已完成 | 50元 | ⭐⭐⭐ | 低 |
| **方案1**（自建RAG） | 3-5天 | 100元 | ⭐⭐⭐⭐ | 高 |
| **混元知识库** | 0.5天 | 220元 | ⭐⭐⭐⭐⭐ | 低 |

### 5.2 决策建议

**现阶段（用户<100）**：
- ✅ 使用混元知识库
- 理由：快速验证，效果最好

**成长期（用户100-1000）**：
- ✅ 继续使用知识库
- 理由：成本可控，专注业务

**成熟期（用户>1000）**：
- ⚖️ 评估是否自建RAG
- 考虑因素：成本、技术能力、维护成本

---

## 六、FAQ

### Q1: 知识库能存多少文档？
A: 标准版支持10000个文档，足够用了。

### Q2: 如果后期想换成自建RAG，数据能迁移吗？
A: 可以，知识库支持导出。而且云函数只需修改一个函数，前端无需改动。

### Q3: 知识库的检索效果怎么样？
A: 腾讯团队优化的专业RAG，效果比自己实现的好很多。

### Q4: 成本会不会失控？
A: 不会。可以在控制台设置费用告警，超过阈值自动通知。

### Q5: 如果不想用了，能随时停吗？
A: 可以，随时删除知识库，立即停止计费。

---

## 七、总结与建议

### Gemini的建议是对的！

1. **时间是最宝贵的资源**
   - 你节省的3-5天开发时间，价值远超200元/月

2. **先验证市场，再优化成本**
   - 等有1000个活跃用户，再考虑自建

3. **专业的事交给专业的人**
   - 腾讯团队优化的RAG效果比自己写的好

### 我的额外建议

1. **立即行动**：
   - 今天就去开通知识库
   - 上传5个案例测试
   - 本周内完成对接

2. **关注数据**：
   - 记录用户的提问类型
   - 分析哪些案例被引用最多
   - 持续优化知识库内容

3. **灵活调整**：
   - 如果效果不好，随时可以换回原方案
   - 如果成本太高，随时可以切换到自建

---

**下一步：需要我帮你写具体的对接代码吗？**

我可以帮你：
1. 修改云函数，接入知识库
2. 更新前端，显示引用信息
3. 提供测试checklist

开始吗？ 🚀

