// cloudfunctions/ai-assistant/pbl-skill-helpers.js
/**
 * PBL Skill 辅助方法
 * 包含所有内容生成的具体实现
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 生成学习目标
 */
async function generateLearningObjectives(projectInfo) {
  const { subjects, grade, theme } = projectInfo;
  
  const objectives = {
    knowledge: {},
    ability: [],
    competency: []
  };

  // 为每个学科生成知识目标
  subjects.forEach(subject => {
    objectives.knowledge[subject] = generateSubjectObjectives(subject, theme, grade);
  });

  // 跨学科能力目标
  objectives.ability = [
    '能够发现和提出有价值的问题',
    '能够收集、整理和分析信息',
    '能够设计解决方案并付诸实践',
    '能够与他人有效协作完成任务',
    '能够清晰表达想法和展示成果'
  ];

  // 核心素养目标
  objectives.competency = [
    '批判性思维：能够质疑、分析和评价信息',
    '创造力：提出创新的想法和解决方案',
    '合作能力：与他人建立良好的协作关系',
    '沟通表达：清晰准确地表达观点和想法',
    '自我管理：合理规划时间和资源'
  ];

  return objectives;
}

/**
 * 为单个学科生成目标
 */
function generateSubjectObjectives(subject, theme, grade) {
  const objectives = [];
  
  switch (subject) {
    case '科学':
      objectives.push(`理解${theme}相关的科学概念和原理`);
      objectives.push('能够运用科学方法进行观察、实验和探究');
      objectives.push('培养科学态度和实事求是的精神');
      break;
    
    case '数学':
      objectives.push('掌握相关的数学知识和计算方法');
      objectives.push('能够用数学方式描述和解决实际问题');
      objectives.push('发展数据分析和逻辑推理能力');
      break;
    
    case '语文':
      objectives.push('提高阅读理解和信息提取能力');
      objectives.push('能够准确、生动地表达观点和想法');
      objectives.push('通过写作记录探究过程和成果');
      break;
    
    case '美术':
      objectives.push('提升审美能力和艺术表现力');
      objectives.push('能够用视觉方式表达创意和想法');
      objectives.push('掌握相关的艺术技法和工具使用');
      break;
    
    case '信息技术':
      objectives.push('掌握信息技术工具的基本操作');
      objectives.push('能够利用技术收集、处理和展示信息');
      objectives.push('培养计算思维和数字素养');
      break;
    
    case '社会':
      objectives.push(`了解${theme}的社会意义和影响`);
      objectives.push('培养社会责任感和公民意识');
      objectives.push('学会从多角度分析社会问题');
      break;
    
    case '音乐':
      objectives.push('感受音乐的美和情感表达');
      objectives.push('能够运用音乐元素进行创作');
      objectives.push('培养音乐鉴赏能力');
      break;
    
    default:
      objectives.push(`掌握${subject}相关的核心知识`);
      objectives.push(`能够将${subject}知识应用于实际`);
  }
  
  return objectives;
}

/**
 * 生成驱动性问题（RAG模式：检索+生成）
 */
async function generateDrivingQuestions(projectInfo) {
  const { theme, grade, subjects } = projectInfo;
  
  // 【第1步：检索知识库】从数据库检索相关问题作为参考
  let referenceQuestions = [];
  try {
    const result = await db.collection('pbl_questions')
      .where({
        theme: db.RegExp({
          regexp: theme,
          options: 'i'
        }),
        minGrade: db.command.lte(grade),
        maxGrade: db.command.gte(grade)
      })
      .limit(10)
      .get();

    referenceQuestions = result.data || [];
    console.log(`检索到${referenceQuestions.length}个参考问题`);
  } catch (error) {
    console.log('检索问题库失败:', error);
  }

  // 【第2步：构建增强提示词】
  // 如果有参考问题，使用RAG模式生成；否则使用模板
  if (referenceQuestions.length > 0) {
    // RAG模式：基于知识库生成新问题
    return await generateQuestionsWithRAG(projectInfo, referenceQuestions);
  } else {
    // 降级：使用模板生成
    return generateQuestionsWithTemplate(projectInfo);
  }
}

/**
 * 基于知识库生成问题（RAG核心）
 */
async function generateQuestionsWithRAG(projectInfo, referenceQuestions) {
  const { theme, grade, subjects } = projectInfo;
  
  // 构建参考内容
  const referenceText = referenceQuestions
    .slice(0, 5)
    .map((q, i) => `参考${i+1}：${q.question}`)
    .join('\n');
  
  // 【方案A：如果有混元API，调用大模型生成】
  // 构建prompt
  const prompt = `你是一位资深的PBL项目设计专家。请为以下项目设计驱动性问题：

项目信息：
- 主题：${theme}
- 年级：${grade}年级
- 学科：${subjects.join('、')}

参考优秀案例中的驱动性问题：
${referenceText}

要求：
1. 核心问题要开放、有挑战性、联系真实世界
2. 符合${grade}年级学生的认知水平
3. 能够自然整合${subjects.join('、')}等学科
4. 参考上述案例的优点，但要创新，不要照搬
5. 生成1个核心问题和3个子问题

请按以下格式输出（仅输出问题内容，不要解释）：
核心问题：[问题内容]
子问题1：[问题内容]
子问题2：[问题内容]  
子问题3：[问题内容]`;

  try {
    // 这里可以调用混元API生成
    const aiResult = await callHunyuanAPI(prompt);
    // 解析返回的问题
    
    // 暂时使用智能模板生成（融合参考问题的特点）
    return generateIntelligentQuestions(projectInfo, referenceQuestions);
    
  } catch (error) {
    console.log('大模型生成失败，使用智能模板:', error);
    return generateIntelligentQuestions(projectInfo, referenceQuestions);
  }
}

/**
 * 智能模板生成（融合知识库特点）
 */
function generateIntelligentQuestions(projectInfo, referenceQuestions) {
  const { theme, grade } = projectInfo;
  
  // 分析参考问题的模式
  const questionPatterns = analyzeQuestionPatterns(referenceQuestions);
  
  // 基于分析结果生成新问题
  const coreQuestion = generateCoreQuestion(theme, grade, questionPatterns);
  const subQuestions = generateSubQuestions(theme, grade, questionPatterns);
  
  return {
    core: coreQuestion,
    sub: subQuestions,
    references: referenceQuestions.slice(0, 3).map(q => q.question) // 附带参考
  };
}

/**
 * 分析问题模式
 */
function analyzeQuestionPatterns(questions) {
  const patterns = {
    hasHowTo: false,      // 包含"如何"
    hasWhatWay: false,    // 包含"什么方式"
    hasRealWorld: false,  // 联系真实世界
    hasAction: false,     // 包含行动导向
    commonWords: []       // 高频词
  };
  
  questions.forEach(q => {
    const question = q.question || '';
    if (question.includes('如何') || question.includes('怎样')) patterns.hasHowTo = true;
    if (question.includes('什么') && question.includes('方式')) patterns.hasWhatWay = true;
    if (question.includes('生活') || question.includes('身边') || question.includes('社区')) patterns.hasRealWorld = true;
    if (question.includes('设计') || question.includes('制作') || question.includes('策划')) patterns.hasAction = true;
  });
  
  return patterns;
}

/**
 * 生成核心问题
 */
function generateCoreQuestion(theme, grade, patterns) {
  // 根据模式选择合适的句式
  const templates = [];
  
  if (patterns.hasHowTo && patterns.hasAction) {
    templates.push(`我们如何设计/制作______，让${theme}变得更______？`);
    templates.push(`作为小小______，我们如何通过${theme}项目解决身边的实际问题？`);
  }
  
  if (patterns.hasRealWorld) {
    templates.push(`${theme}在我们的生活中扮演什么角色？我们能做些什么？`);
    templates.push(`如何让我们的校园/社区在${theme}方面变得更好？`);
  }
  
  // 根据年级调整难度
  if (grade <= 3) {
    templates.push(`我们能为${theme}做些什么有趣的事情？`);
    templates.push(`怎样让大家都喜欢${theme}？`);
  } else {
    templates.push(`我们如何成为${theme}的小专家，并影响他人？`);
    templates.push(`${theme}可以怎样改变我们的生活？我们能做什么贡献？`);
  }
  
  // 选择一个模板并填充
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template.replace(/______/g, getThemeAction(theme));
}

/**
 * 根据主题生成行动词
 */
function getThemeAction(theme) {
  const actions = {
    '环保': '环保方案',
    '科技': '科技创新作品',
    '传统文化': '文化传承活动',
    '健康': '健康生活计划'
  };
  return actions[theme] || `${theme}项目`;
}

/**
 * 生成子问题
 */
function generateSubQuestions(theme, grade, patterns) {
  const questions = [];
  
  // 问题1：现状调查类
  questions.push(`${theme}在我们身边是什么样的？存在哪些问题？`);
  
  // 问题2：方法探究类
  if (patterns.hasHowTo) {
    questions.push(`我们可以用哪些方法来研究和改善${theme}？`);
  } else {
    questions.push(`我们可以通过什么方式来了解${theme}？`);
  }
  
  // 问题3：行动实践类
  if (patterns.hasAction) {
    questions.push(`我们能设计/制作什么来展示我们对${theme}的理解？`);
  } else {
    questions.push(`如何让更多人了解和参与${theme}？`);
  }
  
  return questions;
}

/**
 * 使用模板生成（无知识库时的降级方案）
 */
function generateQuestionsWithTemplate(projectInfo) {
  const { theme } = projectInfo;
  
  const coreQuestions = [
    `我们如何让${theme}变得更有意义？`,
    `作为小小研究者，我们如何探索${theme}的奥秘？`,
    `我们能为${theme}做些什么有价值的事情？`,
    `如何让更多人了解和关注${theme}？`
  ];
  
  const subQuestions = [
    `${theme}与我们的生活有什么关系？`,
    `我们可以通过哪些方式来研究${theme}？`,
    `${theme}存在哪些有趣的问题值得探究？`,
    `如何向他人展示我们关于${theme}的发现？`
  ];
  
  return {
    core: coreQuestions[Math.floor(Math.random() * coreQuestions.length)],
    sub: subQuestions.sort(() => 0.5 - Math.random()).slice(0, 3)
  };
}

/**
 * 生成学习活动
 */
async function generateActivities(projectInfo) {
  const { duration, theme, subjects } = projectInfo;
  
  // 解析时长
  const weeks = parseDuration(duration);
  
  // 根据时长确定阶段数
  let stageCount = 4;
  if (weeks <= 2) stageCount = 3;
  else if (weeks >= 8) stageCount = 5;
  
  // 活动模板
  const templates = [
    {
      name: '启动与探索',
      ratio: 0.2,
      objectives: '激发兴趣，发现问题',
      mainActivities: [
        '头脑风暴：围绕主题展开讨论',
        '实地调查：观察身边的相关现象',
        '访谈交流：了解他人的看法和经验',
        '问题梳理：提出自己的疑问'
      ],
      outcomes: '问题清单、调查记录'
    },
    {
      name: '深入研究',
      ratio: 0.3,
      objectives: '收集信息，深入分析',
      mainActivities: [
        '文献研究：查阅相关资料',
        '实验探究：动手验证想法',
        '数据收集：记录和整理信息',
        '分析讨论：寻找规律和答案'
      ],
      outcomes: '研究报告、实验记录'
    },
    {
      name: '方案设计',
      ratio: 0.3,
      objectives: '设计方案，制作成果',
      mainActivities: [
        '创意构思：提出解决方案',
        '方案设计：绘制设计图',
        '原型制作：动手制作成果',
        '测试优化：改进完善方案'
      ],
      outcomes: '设计方案、原型作品'
    },
    {
      name: '展示评估',
      ratio: 0.2,
      objectives: '展示成果，反思总结',
      mainActivities: [
        '成果整理：准备展示材料',
        '汇报展示：向他人介绍成果',
        '答辩交流：回答问题和讨论',
        '反思总结：回顾学习过程'
      ],
      outcomes: '展示PPT、总结报告'
    }
  ];
  
  const activities = [];
  
  for (let i = 0; i < stageCount; i++) {
    const template = templates[Math.min(i, templates.length - 1)];
    const stageDuration = Math.ceil(weeks * template.ratio);
    
    activities.push({
      stage: i + 1,
      name: template.name,
      duration: `${stageDuration}周`,
      objectives: template.objectives,
      mainActivities: template.mainActivities.join('；'),
      subjectIntegration: generateSubjectIntegration(subjects, template.name),
      outcomes: template.outcomes,
      teacherGuidance: generateTeacherGuidance(template.name)
    });
  }
  
  return activities;
}

/**
 * 解析时长
 */
function parseDuration(duration) {
  const match = duration.match(/(\d+)/);
  if (!match) return 4; // 默认4周
  
  const num = parseInt(match[1]);
  
  if (duration.includes('课时') || duration.includes('节')) {
    // 假设每周3-4课时
    return Math.ceil(num / 3.5);
  }
  
  return num; // 已经是周数
}

/**
 * 生成学科融合点
 */
function generateSubjectIntegration(subjects, stageName) {
  const integration = {};
  
  const integrationPoints = {
    '启动与探索': {
      '科学': '观察自然现象，提出科学问题',
      '数学': '收集数据，进行分类统计',
      '语文': '记录观察日记，撰写调查报告',
      '美术': '绘制观察图，制作调查海报',
      '信息技术': '使用工具记录，搜索相关资料'
    },
    '深入研究': {
      '科学': '设计实验，探究原理',
      '数学': '数据分析，图表制作',
      '语文': '阅读文献，撰写研究笔记',
      '美术': '绘制实验图示，可视化数据',
      '信息技术': '数字化记录，数据处理'
    },
    '方案设计': {
      '科学': '应用科学原理，优化设计',
      '数学': '测量计算，比例设计',
      '语文': '撰写设计说明，编写使用手册',
      '美术': '设计外观，制作模型',
      '信息技术': '3D建模，演示制作'
    },
    '展示评估': {
      '科学': '解释科学原理，回答技术问题',
      '数学': '展示数据结果，说明量化指标',
      '语文': '撰写总结报告，进行口头汇报',
      '美术': '设计展示版面，制作展示道具',
      '信息技术': '制作演示文稿，视频剪辑'
    }
  };
  
  const stagePoints = integrationPoints[stageName] || integrationPoints['深入研究'];
  
  subjects.forEach(subject => {
    integration[subject] = stagePoints[subject] || `${subject}知识的实际应用`;
  });
  
  return integration;
}

/**
 * 生成教师指导要点
 */
function generateTeacherGuidance(stageName) {
  const guidance = {
    '启动与探索': '教师需要营造开放探索的氛围，鼓励学生大胆提问；提供必要的调查工具和方法指导；关注学生的兴趣点和困惑。',
    '深入研究': '教师应提供充足的研究资源和工具；指导学生掌握基本的研究方法；适时介入帮助学生克服困难；培养科学严谨的态度。',
    '方案设计': '教师需要激发学生的创造力；提供技术支持和材料准备；引导学生关注实用性和可行性；鼓励大胆尝试和迭代优化。',
    '展示评估': '教师应创造展示交流的机会；引导学生进行建设性的互评；帮助学生总结收获和不足；激励学生继续探索。'
  };
  
  return guidance[stageName] || '教师需要关注学生的学习过程，提供适当的支持和引导。';
}

/**
 * 生成评估方案
 */
function generateAssessment(projectInfo) {
  return {
    formative: [
      {
        method: '学习日志',
        frequency: '每周1-2次',
        focus: '记录学习过程、反思与思考'
      },
      {
        method: '小组讨论观察',
        frequency: '每次活动',
        focus: '参与度、贡献度、合作表现'
      },
      {
        method: '阶段性成果检查',
        frequency: '每阶段结束时',
        focus: '任务完成情况、质量水平'
      },
      {
        method: '师生对话',
        frequency: '适时',
        focus: '理解程度、困难与需求'
      }
    ],
    
    summative: [
      {
        content: '学科知识掌握',
        weight: '40%',
        criteria: '准确理解相关概念，能正确应用知识解决问题'
      },
      {
        content: '问题解决能力',
        weight: '25%',
        criteria: '能独立或协作解决问题，方案可行且有创意'
      },
      {
        content: '合作与沟通',
        weight: '20%',
        criteria: '积极参与团队活动，有效沟通，尊重他人'
      },
      {
        content: '成果质量',
        weight: '10%',
        criteria: '成果完整、规范、有一定创新性'
      },
      {
        content: '反思与改进',
        weight: '5%',
        criteria: '能反思学习过程，提出改进想法'
      }
    ],
    
    rubric: {
      description: '采用4级评分标准（优秀、良好、合格、需改进）',
      levels: ['优秀(4分)', '良好(3分)', '合格(2分)', '需改进(1分)']
    }
  };
}

/**
 * 生成资源清单
 */
function generateResources(projectInfo) {
  const { theme, subjects } = projectInfo;
  
  return {
    materials: [
      '基础文具用品（纸、笔、剪刀、胶水等）',
      `${theme}相关的实验/制作材料`,
      '记录工具（笔记本、相机等）',
      '展示用具（展板、海报纸等）'
    ],
    
    technology: [
      '电脑或平板设备',
      '投影仪/显示设备',
      subjects.includes('信息技术') ? '相关软件工具（根据需要选择）' : null,
      '网络资源访问'
    ].filter(Boolean),
    
    human: [
      '各学科教师协作',
      `${theme}领域的专家资源（可选）`,
      '家长志愿者支持',
      '社区资源对接'
    ],
    
    venue: [
      '常规教室',
      subjects.includes('科学') ? '科学实验室' : null,
      subjects.includes('信息技术') ? '计算机教室' : null,
      subjects.includes('美术') ? '美术教室' : null,
      '图书馆/阅览室',
      '户外活动场地（视需要）'
    ].filter(Boolean),
    
    learning: [
      `${theme}相关的参考书籍`,
      '在线学习资源和网站',
      '教学视频和纪录片',
      '案例库中的优秀项目'
    ]
  };
}

/**
 * 生成项目时间线
 */
function generateTimeline(activities, duration) {
  const timeline = [];
  let currentWeek = 1;
  
  activities.forEach((activity, index) => {
    const weekCount = parseInt(activity.duration) || 1;
    const endWeek = currentWeek + weekCount - 1;
    
    timeline.push({
      stage: activity.name,
      week: weekCount === 1 ? `第${currentWeek}周` : `第${currentWeek}-${endWeek}周`,
      tasks: activity.mainActivities,
      outcomes: activity.outcomes,
      milestones: index === activities.length - 1 ? '项目成果展示' : `${activity.name}成果提交`
    });
    
    currentWeek = endWeek + 1;
  });
  
  return timeline;
}

/**
 * 生成差异化策略
 */
function generateDifferentiation(grade) {
  const baseStrategies = {
    support: [
      '为学习困难学生提供任务分解和步骤指导',
      '提供操作示范和脚手架工具',
      '安排同伴辅导和小组内互助',
      '降低任务难度或简化要求',
      '给予更多时间和个别指导'
    ],
    
    challenge: [
      '为优秀学生设计拓展性任务',
      '提供更高层次的挑战问题',
      '鼓励担任小组长或项目协调员',
      '引导进行深度研究和创新实践',
      '提供展示和分享的更多机会'
    ],
    
    grouping: '采用异质分组，确保每个小组都有不同能力水平的学生；根据项目需要灵活调整分组；鼓励学生发挥各自优势，承担适合的角色。'
  };
  
  // 根据年级微调
  if (grade <= 2) {
    baseStrategies.support.unshift('提供更多的直观演示和图文并茂的指导');
    baseStrategies.challenge[0] = '为优秀学生提供角色扮演或表演机会';
  } else if (grade >= 5) {
    baseStrategies.challenge.push('鼓励自主设计研究方案');
    baseStrategies.support.push('提供学习策略和方法指导');
  }
  
  return baseStrategies;
}

/**
 * 生成实施建议
 */
function generateImplementation(projectInfo) {
  const { subjects, duration, theme } = projectInfo;
  
  return {
    preparation: [
      `提前${parseDuration(duration) >= 4 ? '1-2周' : '1周'}准备相关资源和材料`,
      `与${subjects.join('、')}学科教师沟通协调，明确分工`,
      '制作项目指导手册和学习单',
      '联系校外资源（如需要）',
      '通过家长会向家长说明项目意义和需求'
    ],
    
    commonProblems: [
      {
        problem: '时间管理困难',
        solution: '为每个阶段预留缓冲时间；灵活调整进度；优先完成核心任务'
      },
      {
        problem: '资源不足',
        solution: '寻找替代方案；利用网络资源；争取家长和社区支持'
      },
      {
        problem: '学生参与度不均',
        solution: '明确分工；设计多样化任务；关注每个学生的贡献'
      },
      {
        problem: '跨学科协调困难',
        solution: '建立教师协作机制；定期沟通；共享学生表现信息'
      }
    ],
    
    parentCommunication: `建议通过家长会、微信群等方式向家长说明：
1. 项目化学习的意义和价值
2. 项目的具体内容和时间安排
3. 需要家长配合的地方（如材料准备、经验分享等）
4. 如何在家支持孩子的学习
5. 欢迎家长参与和提供资源

及时分享项目进展和学生表现，让家长看到孩子的成长。`
  };
}

/**
 * 查找相似案例
 */
async function findSimilarCases(projectInfo) {
  try {
    // 先按主题和年级精确匹配
    let result = await db.collection('pbl_cases')
      .where({
        theme: db.RegExp({
          regexp: projectInfo.theme,
          options: 'i'
        }),
        grade: projectInfo.grade
      })
      .limit(3)
      .get();

    if (result.data && result.data.length > 0) {
      return result.data.map(c => ({
        id: c._id,
        title: c.title,
        grade: c.grade,
        subjects: c.subjects,
        theme: c.theme,
        duration: c.duration
      }));
    }

    // 如果没有，放宽到同年级
    result = await db.collection('pbl_cases')
      .where({
        grade: projectInfo.grade
      })
      .limit(3)
      .get();

    if (result.data && result.data.length > 0) {
      return result.data.map(c => ({
        id: c._id,
        title: c.title,
        grade: c.grade,
        subjects: c.subjects,
        theme: c.theme,
        duration: c.duration
      }));
    }

    return [];

  } catch (error) {
    console.error('查找相似案例失败:', error);
    return [];
  }
}

// 导出所有函数
module.exports = {
  generateLearningObjectives,
  generateDrivingQuestions,
  generateActivities,
  generateAssessment,
  generateResources,
  generateTimeline,
  generateDifferentiation,
  generateImplementation,
  findSimilarCases
};
