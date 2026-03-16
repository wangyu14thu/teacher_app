# RAG技术架构说明与升级方案

## 一、当前架构分析

### 1.1 已实现的功能

✅ **Agent（智能体）**
- 使用腾讯混元大模型
- Function Calling能力（工具调用）
- 对话上下文管理（chat_sessions）

✅ **知识库存储**
- 云数据库 `knowledge_base` 集合
- 结构化存储案例数据

✅ **基础检索**
- 按年级、学科字段过滤
- 关键词匹配（正则表达式）

### 1.2 当前架构图

```
┌─────────────┐
│  用户提问    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ 腾讯混元API     │
│ (Function Call) │
└──────┬──────────┘
       │
       ▼
┌──────────────────┐
│ search_cases工具 │
└──────┬───────────┘
       │
       ▼
┌─────────────────────┐
│ 云数据库查询         │
│ WHERE grade=X       │
│ AND subject LIKE Y  │
└──────┬──────────────┘
       │
       ▼
┌─────────────┐
│ 返回3条结果  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 生成回答     │
└─────────────┘
```

### 1.3 技术特点

| 特性 | 当前实现 | 说明 |
|-----|---------|------|
| 检索方式 | 结构化查询 | 精确匹配grade、subject字段 |
| 语义理解 | ❌ 无 | 无法理解问题的语义含义 |
| 相关度排序 | 按时间倒序 | 不是按相似度排序 |
| 知识切片 | ❌ 无 | 返回完整文档 |
| 向量化 | ❌ 无 | 未使用Embedding技术 |

## 二、什么是真正的RAG？

### 2.1 RAG技术架构

**RAG（Retrieval-Augmented Generation）= 检索增强生成**

核心流程：
1. **文档向量化**：将知识文档转换为向量（Embedding）
2. **查询向量化**：将用户问题转换为向量
3. **语义检索**：在向量空间中找到最相似的知识片段
4. **上下文注入**：将检索到的知识片段注入到Prompt中
5. **生成回答**：大模型基于问题+知识生成回答

### 2.2 完整RAG架构图

```
┌─────────────┐
│  用户提问    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Embedding API   │ ← 腾讯混元Embedding
│ (文本向量化)     │
└──────┬──────────┘
       │ [0.12, -0.45, 0.78, ...]
       ▼
┌──────────────────┐
│ 向量数据库检索    │ ← 腾讯云向量数据库
│ (语义相似度TopK)  │
└──────┬───────────┘
       │
       ▼
┌─────────────────────┐
│ 召回最相关的知识片段 │
│ (Top 3-5个片段)     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ 构建增强Prompt       │
│ 问题 + 知识上下文    │
└──────┬──────────────┘
       │
       ▼
┌─────────────┐
│ 腾讯混元API  │
│ (生成回答)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 返回答案     │
└─────────────┘
```

### 2.3 RAG vs 当前实现

| 维度 | 当前实现 | 完整RAG |
|-----|---------|---------|
| **检索精度** | 低（关键词匹配） | 高（语义相似度） |
| **灵活性** | 低（需精确字段） | 高（自然语言查询） |
| **相关性** | 中等 | 很高 |
| **成本** | 低 | 中等（需Embedding调用） |
| **实现难度** | 简单 | 中等 |

## 三、腾讯云知识引擎

### 3.1 什么是腾讯知识引擎？

腾讯云知识引擎（Knowledge Engine）提供：
- **文档解析**：PDF/Word/TXT等格式解析
- **智能分块**：自动将文档切分为合适的片段
- **向量化存储**：自动生成Embedding并存储
- **语义检索**：提供高效的向量检索API
- **一体化方案**：开箱即用的RAG能力

### 3.2 是否已接入？

**❌ 当前未接入腾讯知识引擎**

当前只使用了：
- ✅ 腾讯混元大模型（对话API）
- ✅ Function Calling
- ❌ 腾讯混元Embedding API
- ❌ 腾讯云向量数据库
- ❌ 腾讯知识引擎

## 四、升级方案

### 方案1：使用腾讯混元Embedding + 云数据库（推荐）

**优势**：
- 成本可控
- 与现有架构兼容
- 逐步升级

**步骤**：

#### 4.1 开通腾讯混元Embedding服务

```bash
# API: https://cloud.tencent.com/document/product/1729/97731
# 模型: hunyuan-embedding
```

#### 4.2 修改云函数，添加向量化功能

```javascript
// cloudfunctions/ai-assistant/embedding.js
const tencentcloud = require('tencentcloud-sdk-nodejs');
const HunyuanClient = tencentcloud.hunyuan.v20230901.Client;

/**
 * 文本向量化
 */
async function getEmbedding(text) {
  const client = new HunyuanClient({
    credential: {
      secretId: process.env.HUNYUAN_SECRET_ID,
      secretKey: process.env.HUNYUAN_SECRET_KEY,
    },
    region: 'ap-guangzhou',
  });

  const params = {
    Model: 'hunyuan-embedding',
    Input: text
  };

  const response = await client.GetEmbedding(params);
  return response.Data[0].Embedding; // 返回向量数组
}

module.exports = { getEmbedding };
```

#### 4.3 知识库上传时自动向量化

```javascript
// 修改 uploadKnowledge 函数
async function uploadKnowledge(event, openid) {
  const { caseData } = event;
  
  // 1. 文本分块（可选，如果文档很长）
  const chunks = splitText(caseData.content, 500); // 每500字一块
  
  // 2. 每个块生成向量
  const vectorizedChunks = [];
  for (const chunk of chunks) {
    const vector = await getEmbedding(chunk.text);
    vectorizedChunks.push({
      text: chunk.text,
      vector: vector,
      chunkId: chunk.id
    });
  }
  
  // 3. 存储到数据库
  const knowledge = {
    caseId: caseData.id,
    title: caseData.title,
    grade: caseData.grade,
    subject: caseData.subject,
    fullContent: caseData.content,
    chunks: vectorizedChunks, // 存储向量化的块
    uploadTime: new Date()
  };
  
  await db.collection('knowledge_base').add({ data: knowledge });
}
```

#### 4.4 检索时使用语义相似度

```javascript
async function semanticSearch(query, topK = 3) {
  // 1. 查询向量化
  const queryVector = await getEmbedding(query);
  
  // 2. 从数据库获取所有知识
  const allKnowledge = await db.collection('knowledge_base').get();
  
  // 3. 计算余弦相似度
  const similarities = [];
  for (const doc of allKnowledge.data) {
    for (const chunk of doc.chunks) {
      const similarity = cosineSimilarity(queryVector, chunk.vector);
      similarities.push({
        docId: doc._id,
        chunkId: chunk.chunkId,
        text: chunk.text,
        title: doc.title,
        similarity: similarity
      });
    }
  }
  
  // 4. 按相似度排序，返回TopK
  similarities.sort((a, b) => b.similarity - a.similarity);
  return similarities.slice(0, topK);
}

// 余弦相似度计算
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

#### 4.5 成本估算

- **Embedding调用**：约0.0001元/千tokens
- **假设**：每次检索1个文档（500字），每月1000次检索
- **月成本**：约0.5-1元

---

### 方案2：使用腾讯云向量数据库（企业级）

**优势**：
- 高性能（毫秒级检索）
- 支持海量数据（亿级向量）
- 专业的向量索引算法（HNSW）

**步骤**：

#### 4.1 开通腾讯云向量数据库

产品链接：https://cloud.tencent.com/product/vdb

#### 4.2 创建向量集合

```javascript
// 使用腾讯云向量数据库SDK
const VectorDB = require('@tencentcloud/vectordb');

const client = new VectorDB.Client({
  url: 'your-vector-db-url',
  apiKey: 'your-api-key'
});

// 创建集合
await client.createCollection({
  name: 'pbl_knowledge',
  dimension: 1024, // 腾讯混元Embedding维度
  metric: 'cosine' // 余弦相似度
});
```

#### 4.3 向量检索

```javascript
async function vectorSearch(query, topK = 3) {
  // 1. 查询向量化
  const queryVector = await getEmbedding(query);
  
  // 2. 向量数据库检索
  const results = await client.search({
    collection: 'pbl_knowledge',
    vector: queryVector,
    topK: topK,
    filter: { // 可选：结构化过滤
      grade: { $eq: 4 },
      subject: { $eq: '数学' }
    }
  });
  
  return results;
}
```

#### 4.4 成本估算

- **向量数据库**：按存储和查询次数收费
- **假设**：1万条知识，每月10万次查询
- **月成本**：约50-100元

---

### 方案3：使用腾讯知识引擎（最简单）

**优势**：
- 一站式解决方案
- 无需自己实现向量化和检索
- 开箱即用

**步骤**：

#### 4.1 开通腾讯知识引擎

产品链接：https://cloud.tencent.com/product/tke

#### 4.2 调用知识引擎API

```javascript
const KnowledgeEngine = require('tencentcloud-sdk-nodejs').tke;

const client = new KnowledgeEngine.Client({
  credential: {
    secretId: 'YOUR_SECRET_ID',
    secretKey: 'YOUR_SECRET_KEY'
  }
});

// 创建知识库
await client.CreateKnowledgeBase({
  Name: 'PBL案例库',
  Description: '项目化学习案例知识库'
});

// 上传文档
await client.UploadDocument({
  KnowledgeBaseId: 'kb-xxx',
  File: fileContent,
  FileName: '校园测量工程.pdf'
});

// 知识检索
const result = await client.RetrieveKnowledge({
  KnowledgeBaseId: 'kb-xxx',
  Query: '如何设计数学主题的PBL项目',
  TopK: 3
});

// 集成到混元对话
const chatResult = await client.ChatWithKnowledge({
  KnowledgeBaseId: 'kb-xxx',
  Messages: [{ Role: 'user', Content: '帮我设计一个PBL项目' }]
});
```

#### 4.3 成本估算

- **知识引擎**：按文档数量和查询次数收费
- **月成本**：约100-300元（根据使用量）

## 五、推荐方案对比

| 方案 | 实现难度 | 成本 | 性能 | 推荐场景 |
|-----|---------|------|------|---------|
| **方案1：混元Embedding+云数据库** | 中等 | 低（~5元/月） | 中等 | 知识量<1万条，预算有限 |
| **方案2：腾讯云向量数据库** | 中等 | 中（~100元/月） | 高 | 知识量>1万条，需要高性能 |
| **方案3：腾讯知识引擎** | 简单 | 高（~300元/月） | 高 | 快速上线，预算充足 |

## 六、总结

### 当前状态
- ✅ 基础Agent能力（Function Calling）
- ✅ 结构化知识存储
- ❌ 未使用RAG技术
- ❌ 未接入腾讯知识引擎

### 升级建议
1. **短期**：保持当前架构，优化检索逻辑（添加全文搜索）
2. **中期**：实施方案1（混元Embedding），成本低、效果好
3. **长期**：如果用户量大、知识量多，考虑方案2或方案3

### 何时需要升级到RAG？
- ✅ 知识库超过100条文档
- ✅ 用户查询经常找不到相关内容
- ✅ 需要支持复杂的语义理解
- ✅ 预算允许（每月至少50元以上）

---

**需要我帮你实现RAG升级吗？** 
可以从方案1开始，成本最低且效果显著！

