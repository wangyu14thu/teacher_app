// 腾讯混元API调用封装
const tencentcloud = require("tencentcloud-sdk-nodejs");
const config = require('./config');

// 初始化混元客户端
function createHunyuanClient() {
  const HunyuanClient = tencentcloud.hunyuan.v20230901.Client;
  
  if (!config.HUNYUAN_SECRET_ID || !config.HUNYUAN_SECRET_KEY) {
    console.warn('警告: 未配置腾讯混元API密钥，将使用模拟响应');
    return null;
  }

  return new HunyuanClient({
    credential: {
      secretId: config.HUNYUAN_SECRET_ID,
      secretKey: config.HUNYUAN_SECRET_KEY
    },
    region: config.HUNYUAN_REGION,
    profile: {
      httpProfile: {
        endpoint: "hunyuan.tencentcloudapi.com"
      }
    }
  });
}

/**
 * 调用腾讯混元API
 * @param {Array} messages - 对话历史
 * @param {Array} tools - 可用工具列表（Function Calling）
 * @param {Boolean} stream - 是否使用流式输出
 */
async function callHunyuanAPI(messages, tools = [], stream = false) {
  const client = createHunyuanClient();
  
  // 如果没有配置API，使用模拟响应
  if (!client) {
    return await mockHunyuanResponse(messages);
  }

  try {
    const params = {
      Model: config.HUNYUAN_MODEL,
      Messages: messages.map(msg => ({
        Role: msg.role,
        Content: msg.content
      })),
      Stream: stream,
      Temperature: 0.7,
      TopP: 0.8
    };

    // 如果提供了工具，添加到参数中
    if (tools && tools.length > 0) {
      params.Tools = tools;
    }

    console.log('调用混元API:', {
      model: params.Model,
      messageCount: params.Messages.length,
      toolCount: tools.length
    });

    const response = await client.ChatCompletions(params);
    
    console.log('混元API响应:', response);

    return {
      success: true,
      content: response.Choices[0].Message.Content,
      finishReason: response.Choices[0].FinishReason,
      toolCalls: response.Choices[0].Message.ToolCalls || [],
      usage: response.Usage
    };

  } catch (error) {
    console.error('混元API调用错误:', error);
    
    // 如果API调用失败，降级到模拟响应
    return await mockHunyuanResponse(messages);
  }
}

/**
 * 模拟混元响应（用于开发测试或API故障时）
 */
async function mockHunyuanResponse(messages) {
  const userMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
  
  let content = '';
  const toolCalls = [];

  // 智能判断意图并生成响应
  if (userMessage.includes('案例') || userMessage.includes('参考')) {
    content = '我正在为您搜索相关案例...';
    toolCalls.push({
      Id: 'call_' + Date.now(),
      Type: 'function',
      Function: {
        Name: 'search_cases',
        Arguments: JSON.stringify({
          keywords: userMessage,
          grade: null,
          subject: null
        })
      }
    });
  } else if (userMessage.includes('驱动') || userMessage.includes('问题')) {
    content = '让我为您生成几个驱动性问题方案...';
  } else if (userMessage.includes('跨学科') || userMessage.includes('概念')) {
    content = `对于PBL项目，跨学科概念是核心。常用的跨学科概念包括：

1. **结构与功能** - 适合探究事物的组成和作用关系
2. **因果关系** - 适合分析问题的原因和影响
3. **系统与要素** - 适合理解复杂系统的运作
4. **变化与稳定** - 适合观察事物的发展规律
5. **联系与互动** - 适合研究事物之间的关系

您的项目主题是什么？我可以帮您选择最合适的跨学科概念。`;
  } else {
    content = `您好！我是PBL项目设计助手。我可以帮您：

📚 搜索相关案例参考
💡 生成驱动性问题
🎯 设计跨学科概念
📝 优化项目设计
🚀 分步引导完成项目

请告诉我您需要什么帮助？`;
  }

  return {
    success: true,
    content: content,
    finishReason: 'stop',
    toolCalls: toolCalls,
    usage: {
      PromptTokens: 100,
      CompletionTokens: 50,
      TotalTokens: 150
    },
    isMock: true
  };
}

/**
 * 定义可用的工具（Function Calling）
 */
function getAvailableTools() {
  return [
    {
      Type: "function",
      Function: {
        Name: "search_cases",
        Description: "搜索PBL项目案例库，查找相关的教学案例",
        Parameters: {
          type: "object",
          properties: {
            keywords: {
              type: "string",
              description: "搜索关键词，如'校园环保'、'传统文化'"
            },
            grade: {
              type: "integer",
              description: "年级，1-6之间的整数"
            },
            subject: {
              type: "string",
              description: "学科，如'语文'、'数学'、'科学'"
            }
          },
          required: ["keywords"]
        }
      }
    },
    {
      Type: "function",
      Function: {
        Name: "generate_driving_question",
        Description: "根据项目主题生成驱动性问题",
        Parameters: {
          type: "object",
          properties: {
            theme: {
              type: "string",
              description: "项目主题"
            },
            grade: {
              type: "integer",
              description: "年级"
            },
            subject: {
              type: "string",
              description: "学科"
            }
          },
          required: ["theme"]
        }
      }
    },
    {
      Type: "function",
      Function: {
        Name: "generate_interdisciplinary_concept",
        Description: "为项目推荐合适的跨学科概念",
        Parameters: {
          type: "object",
          properties: {
            theme: {
              type: "string",
              description: "项目主题"
            }
          },
          required: ["theme"]
        }
      }
    },
    {
      Type: "function",
      Function: {
        Name: "fill_project_field",
        Description: "将生成的内容填充到项目设计表单的指定字段",
        Parameters: {
          type: "object",
          properties: {
            fieldName: {
              type: "string",
              description: "字段名称，如'drivingQuestion'、'interdisciplinaryConcept'"
            },
            content: {
              type: "string",
              description: "要填充的内容"
            }
          },
          required: ["fieldName", "content"]
        }
      }
    }
  ];
}

module.exports = {
  callHunyuanAPI,
  getAvailableTools,
  mockHunyuanResponse
};

