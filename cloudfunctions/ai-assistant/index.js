// cloudfunctions/ai-assistant/index.js
const cloud = require('wx-server-sdk');
const config = require('./config');
const { callHunyuanAPI, getAvailableTools } = require('./hunyuan');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * AI助手云函数入口
 */
exports.main = async (event, context) => {
  const { action } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    switch (action) {
      case 'chat':
        return await handleChat(event, openid);
      
      case 'getSession':
        return await getSession(event, openid);
      
      case 'clearSession':
        return await clearSession(event, openid);
      
      case 'searchCases':
        return await searchCases(event, openid);
      
      case 'uploadKnowledge':
        return await uploadKnowledge(event, openid);
      
      case 'getKnowledgeList':
        return await getKnowledgeList(event, openid);
      
      case 'getUsageStats':
        return await getUsageStats(event, openid);
      
      default:
        return {
          success: false,
          message: '未知操作'
        };
    }
  } catch (error) {
    console.error('AI助手云函数错误:', error);
    return {
      success: false,
      message: error.message || '服务器错误'
    };
  }
};

/**
 * 处理对话
 */
async function handleChat(event, openid) {
  const { message, sessionId, projectContext } = event;

  try {
    console.log('收到对话请求:', { openid, message, sessionId });

    // 0. 检查每日提问限额
    const usageCheck = await checkDailyUsage(openid);
    if (!usageCheck.allowed) {
      return {
        success: false,
        message: usageCheck.message,
        code: 'QUOTA_EXCEEDED'
      };
    }

    // 1. 获取或创建会话
    const session = await getOrCreateSession(sessionId, openid, projectContext);
    
    // 2. 添加用户消息到会话
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    
    await addMessageToSession(session._id, userMessage);

    // 3. 构建对话历史
    const messages = await buildConversationHistory(session._id);

    // 4. 调用AI（目前使用模拟响应，后续集成真实API）
    const aiResponse = await callAI(messages, projectContext);

    // 5. 保存AI回复
    const assistantMessage = {
      role: 'assistant',
      content: aiResponse.content,
      timestamp: new Date(),
      toolCalls: aiResponse.toolCalls || []
    };
    
    await addMessageToSession(session._id, assistantMessage);

    // 6. 记录使用次数
    await recordUsage(openid);

    return {
      success: true,
      data: {
        sessionId: session._id,
        message: aiResponse.content,
        toolCalls: aiResponse.toolCalls || [],
        suggestions: aiResponse.suggestions || [],
        remainingQuota: usageCheck.remaining - 1 // 返回剩余次数
      }
    };

  } catch (error) {
    console.error('对话处理错误:', error);
    return {
      success: false,
      message: '对话处理失败: ' + error.message
    };
  }
}

/**
 * 获取或创建会话
 */
async function getOrCreateSession(sessionId, openid, projectContext) {
  if (sessionId) {
    // 尝试获取现有会话
    const result = await db.collection('chat_sessions')
      .doc(sessionId)
      .get();
    
    if (result.data) {
      return result.data;
    }
  }

  // 创建新会话
  const newSession = {
    userId: openid,
    projectId: projectContext?.projectId || null,
    messages: [],
    context: {
      currentStep: 'initial',
      projectData: projectContext || {}
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const addResult = await db.collection('chat_sessions').add({
    data: newSession
  });

  return {
    _id: addResult._id,
    ...newSession
  };
}

/**
 * 添加消息到会话
 */
async function addMessageToSession(sessionId, message) {
  await db.collection('chat_sessions')
    .doc(sessionId)
    .update({
      data: {
        messages: _.push(message),
        updatedAt: new Date()
      }
    });
}

/**
 * 构建对话历史
 */
async function buildConversationHistory(sessionId) {
  const session = await db.collection('chat_sessions')
    .doc(sessionId)
    .get();

  if (!session.data) {
    return [];
  }

  // 添加系统提示词
  const messages = [
    {
      role: 'system',
      content: config.SYSTEM_PROMPT
    }
  ];

  // 添加历史消息（保留最近10轮对话）
  const recentMessages = session.data.messages.slice(-20);
  messages.push(...recentMessages.map(msg => ({
    role: msg.role,
    content: msg.content
  })));

  return messages;
}

/**
 * 调用AI（真实混元API + 工具调用）
 */
async function callAI(messages, projectContext) {
  try {
    // 获取可用工具
    const tools = getAvailableTools();
    
    // 调用混元API
    const apiResponse = await callHunyuanAPI(messages, tools, false);
    
    if (!apiResponse.success) {
      throw new Error('AI调用失败');
    }

    // 处理工具调用
    let finalContent = apiResponse.content;
    const toolCalls = [];
    
    if (apiResponse.toolCalls && apiResponse.toolCalls.length > 0) {
      for (const toolCall of apiResponse.toolCalls) {
        const toolResult = await executeToolCall(toolCall, projectContext);
        toolCalls.push({
          tool: toolCall.Function.Name,
          status: 'completed',
          result: toolResult
        });
        
        // 将工具结果融入回复
        if (toolResult.data) {
          finalContent += '\n\n' + formatToolResult(toolCall.Function.Name, toolResult.data);
        }
      }
    }

    // 生成建议按钮
    const suggestions = generateSuggestions(finalContent, projectContext);

    return {
      content: finalContent,
      toolCalls: toolCalls,
      suggestions: suggestions,
      usage: apiResponse.usage
    };

  } catch (error) {
    console.error('AI调用错误:', error);
    // 降级到智能模拟响应
    return await fallbackAIResponse(messages, projectContext);
  }
}

/**
 * 执行工具调用
 */
async function executeToolCall(toolCall, projectContext) {
  const toolName = toolCall.Function.Name;
  const args = JSON.parse(toolCall.Function.Arguments || '{}');
  
  console.log('执行工具:', toolName, args);

  switch (toolName) {
    case 'search_cases':
      return await searchCasesInternal(args.keywords, {
        grade: args.grade,
        subject: args.subject
      });
    
    case 'generate_driving_question':
      return await generateDrivingQuestion(args);
    
    case 'generate_interdisciplinary_concept':
      return await generateInterdisciplinaryConcept(args);
    
    case 'fill_project_field':
      return { success: true, data: args };
    
    default:
      return { success: false, message: '未知工具' };
  }
}

/**
 * 格式化工具结果
 */
function formatToolResult(toolName, data) {
  switch (toolName) {
    case 'search_cases':
      if (Array.isArray(data) && data.length > 0) {
        let result = '我为您找到了以下案例：\n\n';
        data.forEach((c, idx) => {
          result += `${idx + 1}. 《${c.title}》- ${c.grade}年级 ${c.subject}\n`;
        });
        return result;
      }
      return '暂未找到相关案例';
    
    case 'generate_driving_question':
      return data.questions ? data.questions.join('\n\n') : '';
    
    default:
      return '';
  }
}

/**
 * 生成建议按钮
 */
function generateSuggestions(content, projectContext) {
  const suggestions = [];
  
  if (content.includes('案例')) {
    suggestions.push({ text: '查看更多案例', action: 'search_more' });
  }
  
  if (content.includes('驱动性问题') || content.includes('方案')) {
    suggestions.push({ text: '应用到项目', action: 'apply_to_project' });
    suggestions.push({ text: '重新生成', action: 'regenerate' });
  }
  
  if (!projectContext || !projectContext.projectName) {
    suggestions.push({ text: '开始设计项目', action: 'start_design' });
  }
  
  return suggestions;
}

/**
 * 生成驱动性问题
 */
async function generateDrivingQuestion(args) {
  const { theme, grade, subject } = args;
  
  const questions = [
    `作为小小设计师，我们如何为同学们设计一套"${theme}"方案，让大家的学习更加有趣、高效？`,
    `作为社区小专家，我们如何向家长和邻居介绍"${theme}"，帮助更多人了解它的价值？`,
    `作为未来探索者，我们如何通过研究"${theme}"，发现并解决身边的实际问题？`
  ];
  
  return {
    success: true,
    data: { questions }
  };
}

/**
 * 生成跨学科概念
 */
async function generateInterdisciplinaryConcept(args) {
  const concepts = [
    { name: '结构与功能', description: '适合探究事物的组成和作用关系' },
    { name: '因果关系', description: '适合分析问题的原因和影响' },
    { name: '系统与要素', description: '适合理解复杂系统的运作' }
  ];
  
  return {
    success: true,
    data: { concepts }
  };
}

/**
 * 降级响应（当API不可用时）
 */
async function fallbackAIResponse(messages, projectContext) {
  const userMessage = messages[messages.length - 1].content.toLowerCase();

  // 检测用户意图
  let response = {
    content: '',
    toolCalls: [],
    suggestions: []
  };

  // 意图1: 搜索案例
  if (userMessage.includes('案例') || userMessage.includes('参考') || userMessage.includes('例子')) {
    response.toolCalls.push({
      tool: 'search_cases',
      status: 'completed'
    });

    const cases = await searchCasesInternal(userMessage, projectContext);
    
    response.content = `我为您找到了${cases.length}个相关案例：\n\n`;
    cases.forEach((c, idx) => {
      response.content += `${idx + 1}. 《${c.title}》- ${c.grade}年级 ${c.subject}\n`;
    });
    response.content += `\n这些案例可以为您的项目设计提供灵感。您想了解哪个案例的详细内容？`;
    
    response.suggestions = [
      { text: '查看第1个案例', action: 'view_case', caseId: cases[0]?.id },
      { text: '继续设计我的项目', action: 'continue_design' }
    ];
  }
  // 意图2: 生成驱动性问题
  else if (userMessage.includes('驱动') || userMessage.includes('问题') || userMessage.includes('怎么问')) {
    const theme = projectContext?.projectName || '项目';
    const grade = projectContext?.grade || '4';
    
    response.content = `基于您的项目主题"${theme}"，我为您生成了3个驱动性问题方案：\n\n`;
    response.content += `方案1: "作为小小设计师，我们如何为同学们设计一套${theme}方案，让大家的学习更加有趣、高效？"\n\n`;
    response.content += `方案2: "作为社区小专家，我们如何向家长和邻居介绍${theme}，帮助更多人了解它的价值？"\n\n`;
    response.content += `方案3: "作为未来探索者，我们如何通过研究${theme}，发现并解决身边的实际问题？"\n\n`;
    response.content += `您更喜欢哪个方案？或者需要我根据您的具体需求调整？`;
    
    response.suggestions = [
      { text: '应用方案1', action: 'apply_question', content: response.content.match(/方案1: "(.*?)"/)[1] },
      { text: '重新生成', action: 'regenerate' }
    ];
  }
  // 意图3: 跨学科概念
  else if (userMessage.includes('跨学科') || userMessage.includes('概念')) {
    response.content = `对于PBL项目，跨学科概念是核心。以下是几个常用的跨学科概念：\n\n`;
    response.content += `1. **结构与功能** - 适合探究事物的组成和作用\n`;
    response.content += `2. **因果关系** - 适合分析问题的原因和影响\n`;
    response.content += `3. **系统与要素** - 适合理解复杂系统的运作\n`;
    response.content += `4. **变化与稳定** - 适合观察事物的发展规律\n`;
    response.content += `5. **联系与互动** - 适合研究事物之间的关系\n\n`;
    response.content += `根据您的项目主题，我推荐使用"因果关系"或"系统与要素"。您想深入了解哪个概念？`;
  }
  // 意图4: 分步引导
  else if (userMessage.includes('怎么开始') || userMessage.includes('第一步') || userMessage.includes('引导')) {
    response.content = `让我来引导您一步步完成项目设计！\n\n`;
    response.content += `第1步：**确定项目主题和基本信息**\n`;
    response.content += `- 项目名称：用一句话概括\n`;
    response.content += `- 涉及学科：至少2个学科\n`;
    response.content += `- 年级：1-6年级\n`;
    response.content += `- 课时：预计需要多少课时\n\n`;
    response.content += `请告诉我您想设计什么主题的项目？比如"校园环保"、"传统文化"等。`;
    
    response.suggestions = [
      { text: '我想设计校园主题', action: 'theme', theme: '校园' },
      { text: '我想设计文化主题', action: 'theme', theme: '传统文化' }
    ];
  }
  // 意图5: 项目优化
  else if (userMessage.includes('优化') || userMessage.includes('改进') || userMessage.includes('修改')) {
    response.content = `我来帮您分析和优化项目设计。请告诉我：\n\n`;
    response.content += `1. 您想优化项目的哪个部分？\n`;
    response.content += `   - 驱动性问题\n`;
    response.content += `   - 跨学科概念\n`;
    response.content += `   - 子问题设计\n`;
    response.content += `   - 探究活动\n\n`;
    response.content += `2. 您觉得当前设计有什么不满意的地方？\n\n`;
    response.content += `请分享您的想法，我会给出具体的改进建议。`;
  }
  // 默认: 通用回复
  else {
    response.content = `您好！我是您的PBL项目设计助手。我可以帮您：\n\n`;
    response.content += `📚 搜索相关案例参考\n`;
    response.content += `💡 生成驱动性问题\n`;
    response.content += `🎯 设计跨学科概念\n`;
    response.content += `📝 优化项目设计\n`;
    response.content += `🚀 分步引导完成项目\n\n`;
    response.content += `请告诉我您需要什么帮助？`;
    
    response.suggestions = [
      { text: '我要搜索案例', action: 'search' },
      { text: '帮我生成驱动性问题', action: 'generate_question' },
      { text: '引导我设计项目', action: 'guide' }
    ];
  }

  return response;
}

/**
 * 内部案例搜索
 */
async function searchCasesInternal(query, options = {}) {
  try {
    const { grade, subject } = options;
    
    // 从knowledge_base搜索
    const conditions = {};
    
    if (grade) {
      conditions.grade = parseInt(grade);
    }
    
    if (subject) {
      conditions.subject = db.RegExp({
        regexp: subject,
        options: 'i'
      });
    }

    let queryBuilder = db.collection('knowledge_base');
    
    if (Object.keys(conditions).length > 0) {
      queryBuilder = queryBuilder.where(conditions);
    }

    const result = await queryBuilder
      .orderBy('uploadTime', 'desc')
      .limit(3)
      .get();

    if (result.data.length > 0) {
      return { success: true, data: result.data };
    }

    // 如果knowledge_base为空，返回模拟数据
    return {
      success: true,
      data: [
        { id: 1, title: '校园测量工程', grade: 2, subject: '数学' },
        { id: 2, title: '传承非遗文化——面塑', grade: 3, subject: '艺术' },
        { id: 3, title: '小车冲冲冲', grade: 4, subject: '科学' }
      ]
    };

  } catch (error) {
    console.error('案例搜索错误:', error);
    return { success: false, data: [] };
  }
}

/**
 * 工具: 搜索案例
 */
async function searchCases(event, openid) {
  const { keywords, grade, subject } = event;

  try {
    const conditions = {};
    
    if (grade) {
      conditions.grade = parseInt(grade);
    }
    
    if (subject) {
      conditions.subject = db.RegExp({
        regexp: subject,
        options: 'i'
      });
    }

    const result = await db.collection('knowledge_base')
      .where(conditions)
      .limit(10)
      .get();

    return {
      success: true,
      data: result.data
    };

  } catch (error) {
    console.error('搜索案例错误:', error);
    return {
      success: false,
      message: '搜索失败',
      data: []
    };
  }
}

/**
 * 获取会话
 */
async function getSession(event, openid) {
  const { sessionId } = event;

  try {
    const result = await db.collection('chat_sessions')
      .doc(sessionId)
      .get();

    return {
      success: true,
      data: result.data
    };

  } catch (error) {
    return {
      success: false,
      message: '获取会话失败'
    };
  }
}

/**
 * 清除会话
 */
async function clearSession(event, openid) {
  const { sessionId } = event;

  try {
    if (sessionId) {
      await db.collection('chat_sessions')
        .doc(sessionId)
        .remove();
    } else {
      // 清除该用户的所有会话
      await db.collection('chat_sessions')
        .where({
          userId: openid
        })
        .remove();
    }

    return {
      success: true,
      message: '会话已清除'
    };

  } catch (error) {
    return {
      success: false,
      message: '清除会话失败'
    };
  }
}

/**
 * 上传知识（管理员功能）
 */
async function uploadKnowledge(event, openid) {
  const { caseData } = event;

  try {
    // TODO: 添加管理员权限验证

    const knowledge = {
      caseId: caseData.id || Date.now().toString(),
      title: caseData.title,
      grade: caseData.grade,
      subject: caseData.subject,
      fullContent: caseData.content,
      keyPoints: caseData.keyPoints || [],
      drivingQuestion: caseData.drivingQuestion || '',
      interdisciplinaryConcept: caseData.interdisciplinaryConcept || '',
      uploadTime: new Date(),
      uploadBy: openid
    };

    const result = await db.collection('knowledge_base').add({
      data: knowledge
    });

    return {
      success: true,
      data: { _id: result._id }
    };

  } catch (error) {
    console.error('上传知识错误:', error);
    return {
      success: false,
      message: '上传失败'
    };
  }
}

/**
 * 获取知识库列表
 */
async function getKnowledgeList(event, openid) {
  try {
    const result = await db.collection('knowledge_base')
      .orderBy('uploadTime', 'desc')
      .limit(50)
      .get();

    return {
      success: true,
      data: result.data
    };

  } catch (error) {
    return {
      success: false,
      message: '获取知识库失败',
      data: []
    };
  }
}

/**
 * 检查每日使用限额
 */
async function checkDailyUsage(openid) {
  const DAILY_LIMIT = 30; // 每日限额30次
  
  try {
    // 获取今天的日期（格式：2026-02-01）
    const today = new Date().toISOString().split('T')[0];
    
    // 查询今天的使用记录
    const result = await db.collection('ai_usage')
      .where({
        userId: openid,
        date: today
      })
      .get();
    
    if (result.data.length === 0) {
      // 今天还没有使用记录，可以使用
      return {
        allowed: true,
        remaining: DAILY_LIMIT,
        message: ''
      };
    }
    
    const usageRecord = result.data[0];
    const currentCount = usageRecord.count || 0;
    
    if (currentCount >= DAILY_LIMIT) {
      return {
        allowed: false,
        remaining: 0,
        message: `您今天的提问次数已用完（${DAILY_LIMIT}次），明天再来吧！💡提示：合理规划问题可以更高效地使用AI助手。`
      };
    }
    
    return {
      allowed: true,
      remaining: DAILY_LIMIT - currentCount,
      message: ''
    };
    
  } catch (error) {
    console.error('检查使用限额错误:', error);
    // 出错时允许使用，避免影响用户体验
    return {
      allowed: true,
      remaining: DAILY_LIMIT,
      message: ''
    };
  }
}

/**
 * 记录使用次数
 */
async function recordUsage(openid) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // 查询今天的记录
    const result = await db.collection('ai_usage')
      .where({
        userId: openid,
        date: today
      })
      .get();
    
    if (result.data.length === 0) {
      // 创建新记录
      await db.collection('ai_usage').add({
        data: {
          userId: openid,
          date: today,
          count: 1,
          lastUsedAt: new Date(),
          createdAt: new Date()
        }
      });
    } else {
      // 更新现有记录
      const record = result.data[0];
      await db.collection('ai_usage')
        .doc(record._id)
        .update({
          data: {
            count: _.inc(1),
            lastUsedAt: new Date()
          }
        });
    }
    
  } catch (error) {
    console.error('记录使用次数错误:', error);
    // 记录失败不影响正常流程
  }
}

/**
 * 获取使用统计
 */
async function getUsageStats(event, openid) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const result = await db.collection('ai_usage')
      .where({
        userId: openid,
        date: today
      })
      .get();
    
    const DAILY_LIMIT = 30;
    const currentCount = result.data.length > 0 ? result.data[0].count : 0;
    
    return {
      success: true,
      data: {
        todayUsed: currentCount,
        dailyLimit: DAILY_LIMIT,
        remaining: DAILY_LIMIT - currentCount,
        percentage: Math.round((currentCount / DAILY_LIMIT) * 100)
      }
    };
    
  } catch (error) {
    console.error('获取使用统计错误:', error);
    return {
      success: false,
      message: '获取统计失败'
    };
  }
}

