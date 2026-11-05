# PBL设计Skill - 小程序集成指南

## 概述

本指南将帮助您把PBL设计Skill集成到微信小程序的AI助手中，实现类似Cursor中调用skill的功能。

## 集成架构

```
┌─────────────────┐
│  小程序前端      │
│  (用户提问)      │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│  云函数             │
│  ai-assistant       │
│  ├─ 识别意图         │
│  ├─ 匹配Skill        │
│  └─ 调用PBL设计逻辑  │
└────────┬────────────┘
         │
         ▼
┌──────────────────────┐
│  PBL Skill模块       │
│  ├─ 信息收集流程      │
│  ├─ 方案生成逻辑      │
│  ├─ 案例库检索        │
│  ├─ 问题库匹配        │
│  └─ Word文档生成      │
└──────────────────────┘
```

## 集成步骤

### 第1步：将Skill资源上传到云存储

#### 1.1 准备资源文件

将以下文件上传到微信云存储：

```bash
cloud://你的环境ID.xxx/pbl-skill/
├── examples.json          # 案例库（从examples.md转换）
├── question_bank.json     # 问题库（从question_bank.md转换）
├── assessment_templates.json  # 评估模板（从assessment_templates.md转换）
└── skill_config.json      # Skill配置
```

#### 1.2 转换脚本

创建 `scripts/convert_to_json.js` 将markdown转为JSON：

```javascript
// 在本地运行，生成JSON文件
const fs = require('fs');

// 案例库转换示例
const examplesData = {
  cases: [
    {
      id: "case_001",
      title: "校园垃圾分类大作战",
      grade: 3,
      subjects: ["科学", "数学", "美术", "语文"],
      duration: "4周",
      overview: "学校推行垃圾分类政策，但效果不理想...",
      drivingQuestion: {
        core: "我们如何让校园垃圾分类变得更容易、更有趣？",
        sub: [
          "现在学校垃圾分类存在什么问题？",
          "垃圾应该如何正确分类？",
          "怎样设计让同学们一看就懂的分类标识？"
        ]
      },
      activities: [...],
      assessment: {...},
      resources: {...}
    },
    // ... 其他案例
  ]
};

fs.writeFileSync('examples.json', JSON.stringify(examplesData, null, 2));
```

**注意**：我已经帮您准备了完整的案例、问题库和模板，您只需要将它们转换成JSON格式。

### 第2步：创建PBL Skill模块

在云函数中创建 `pbl-skill` 模块：

```
cloudfunctions/ai-assistant/
├── index.js              # 主入口（已有）
├── hunyuan.js           # 混元API（已有）
├── config.js            # 配置（已有）
└── pbl-skill.js         # ⭐ 新建：PBL Skill模块
```

#### 2.1 创建 `pbl-skill.js`

```javascript
// cloudfunctions/ai-assistant/pbl-skill.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * PBL设计Skill模块
 * 负责处理跨学科项目化学习设计的所有逻辑
 */
class PBLDesignSkill {
  constructor() {
    this.state = {}; // 会话状态
  }

  /**
   * 检测用户是否触发了PBL设计Skill
   */
  static detectTrigger(message) {
    const keywords = [
      '项目化学习', '跨学科项目', 'PBL', '项目方案', '项目设计',
      '综合实践', '主题活动', '综合性学习', '设计项目'
    ];
    
    return keywords.some(keyword => message.includes(keyword));
  }

  /**
   * 主流程：处理用户消息
   */
  async process(message, sessionState) {
    this.state = sessionState || this.initializeState();
    
    const currentStep = this.state.currentStep;
    
    switch (currentStep) {
      case 'initial':
        return await this.handleInitial(message);
      
      case 'collecting_info':
        return await this.handleInfoCollection(message);
      
      case 'confirming':
        return await this.handleConfirmation(message);
      
      case 'generating':
        return await this.handleGeneration(message);
      
      case 'completed':
        return await this.handleCompleted(message);
      
      default:
        return await this.handleInitial(message);
    }
  }

  /**
   * 初始化状态
   */
  initializeState() {
    return {
      currentStep: 'initial',
      projectInfo: {
        projectName: null,
        theme: null,
        grade: null,
        subjects: [],
        duration: null,
        realWorldContext: null,
        specialRequirements: null
      },
      collectedFields: [],
      generatedDesign: null
    };
  }

  /**
   * 步骤1：初始阶段
   */
  async handleInitial(message) {
    this.state.currentStep = 'collecting_info';
    
    return {
      content: `您好！我是PBL项目设计助手，我将帮您设计一个完整的跨学科项目化学习方案。

在开始设计前，我需要了解一些基本信息：

📋 **必需信息**
1. 项目主题/名称（例如：环保、科技、传统文化）
2. 目标年级（1-6年级）
3. 涉及学科（至少2个学科）
4. 预计时长（周数或课时）

💡 **可选信息**
5. 真实世界情境说明
6. 特殊要求或限制

请先告诉我：**您想设计什么主题的项目？面向哪个年级？**`,
      
      suggestions: [
        { text: '环保主题（三年级）', action: 'quick_start', theme: '环保', grade: 3 },
        { text: '科技创新（五年级）', action: 'quick_start', theme: '科技创新', grade: 5 },
        { text: '传统文化（六年级）', action: 'quick_start', theme: '传统文化', grade: 6 }
      ],
      
      state: this.state
    };
  }

  /**
   * 步骤2：信息收集阶段
   */
  async handleInfoCollection(message) {
    // 提取信息
    const extracted = this.extractProjectInfo(message);
    
    // 更新状态
    Object.keys(extracted).forEach(key => {
      if (extracted[key] && !this.state.collectedFields.includes(key)) {
        this.state.projectInfo[key] = extracted[key];
        this.state.collectedFields.push(key);
      }
    });

    // 检查必填项
    const requiredFields = ['theme', 'grade', 'subjects', 'duration'];
    const missingFields = requiredFields.filter(field => 
      !this.state.collectedFields.includes(field) || 
      !this.state.projectInfo[field] ||
      (Array.isArray(this.state.projectInfo[field]) && this.state.projectInfo[field].length === 0)
    );

    if (missingFields.length === 0) {
      // 信息收集完成，进入确认阶段
      this.state.currentStep = 'confirming';
      return await this.handleConfirmation('');
    }

    // 继续询问缺失信息
    return this.askForMissingInfo(missingFields);
  }

  /**
   * 从用户消息中提取项目信息
   */
  extractProjectInfo(message) {
    const extracted = {};
    
    // 提取主题
    const themePatterns = [
      /主题[是：]?(.+?)(?:[，。]|$)/,
      /关于(.+?)的项目/,
      /想做(.+?)项目/,
      /设计(.+?)(?:主题|方案)/
    ];
    for (const pattern of themePatterns) {
      const match = message.match(pattern);
      if (match) {
        extracted.theme = match[1].trim();
        break;
      }
    }

    // 提取年级
    const gradeMatch = message.match(/([一二三四五六1-6])年级/);
    if (gradeMatch) {
      const gradeMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6 };
      extracted.grade = gradeMap[gradeMatch[1]] || parseInt(gradeMatch[1]);
    }

    // 提取学科
    const subjects = [];
    const subjectKeywords = ['科学', '数学', '语文', '美术', '音乐', '体育', '信息技术', '社会', '英语'];
    subjectKeywords.forEach(subject => {
      if (message.includes(subject)) {
        subjects.push(subject);
      }
    });
    if (subjects.length > 0) {
      extracted.subjects = subjects;
    }

    // 提取时长
    const durationMatch = message.match(/(\d+)\s*(?:周|课时|节课)/);
    if (durationMatch) {
      extracted.duration = durationMatch[0];
    }

    // 提取真实情境
    if (message.includes('情境') || message.includes('背景') || message.includes('因为')) {
      extracted.realWorldContext = message;
    }

    return extracted;
  }

  /**
   * 询问缺失信息
   */
  askForMissingInfo(missingFields) {
    const { projectInfo } = this.state;
    
    // 生成已收集信息的总结
    let summary = '目前已收集的信息：\n\n';
    if (projectInfo.theme) summary += `✅ 主题：${projectInfo.theme}\n`;
    if (projectInfo.grade) summary += `✅ 年级：${projectInfo.grade}年级\n`;
    if (projectInfo.subjects && projectInfo.subjects.length > 0) {
      summary += `✅ 学科：${projectInfo.subjects.join('、')}\n`;
    }
    if (projectInfo.duration) summary += `✅ 时长：${projectInfo.duration}\n`;
    summary += '\n';

    // 询问下一个缺失项
    const fieldPrompts = {
      theme: '请告诉我项目主题（例如：环保、科技、传统文化）',
      grade: '请告诉我目标年级（1-6年级）',
      subjects: '请告诉我需要整合哪些学科？（至少2个，例如：科学、数学、美术）',
      duration: '请告诉我预计项目时长（例如：4周、12课时）'
    };

    const nextField = missingFields[0];
    const prompt = fieldPrompts[nextField];

    const suggestions = this.generateSuggestionsForField(nextField, projectInfo);

    return {
      content: summary + prompt,
      suggestions: suggestions,
      state: this.state
    };
  }

  /**
   * 为特定字段生成建议按钮
   */
  generateSuggestionsForField(field, projectInfo) {
    switch (field) {
      case 'theme':
        return [
          { text: '环保主题', action: 'set_field', field: 'theme', value: '环保' },
          { text: '科技创新', action: 'set_field', field: 'theme', value: '科技创新' },
          { text: '传统文化', action: 'set_field', field: 'theme', value: '传统文化' }
        ];
      
      case 'grade':
        return [
          { text: '三年级', action: 'set_field', field: 'grade', value: 3 },
          { text: '四年级', action: 'set_field', field: 'grade', value: 4 },
          { text: '五年级', action: 'set_field', field: 'grade', value: 5 }
        ];
      
      case 'subjects':
        if (projectInfo.theme === '环保') {
          return [
            { text: '科学+数学+美术', action: 'set_field', field: 'subjects', value: ['科学', '数学', '美术'] }
          ];
        } else if (projectInfo.theme === '科技创新') {
          return [
            { text: '科学+数学+信息技术', action: 'set_field', field: 'subjects', value: ['科学', '数学', '信息技术'] }
          ];
        }
        return [];
      
      case 'duration':
        return [
          { text: '4周', action: 'set_field', field: 'duration', value: '4周' },
          { text: '6周', action: 'set_field', field: 'duration', value: '6周' },
          { text: '8周', action: 'set_field', field: 'duration', value: '8周' }
        ];
      
      default:
        return [];
    }
  }

  /**
   * 步骤3：确认信息
   */
  async handleConfirmation(message) {
    const { projectInfo } = this.state;

    // 如果是修改命令
    if (message.includes('修改') || message.includes('不对') || message.includes('重新')) {
      this.state.currentStep = 'collecting_info';
      return {
        content: '好的，请告诉我需要修改哪些信息？',
        suggestions: [
          { text: '修改主题', action: 'modify_field', field: 'theme' },
          { text: '修改年级', action: 'modify_field', field: 'grade' },
          { text: '修改学科', action: 'modify_field', field: 'subjects' }
        ],
        state: this.state
      };
    }

    // 如果确认
    if (message.includes('确认') || message.includes('没问题') || message.includes('开始') || message === '') {
      this.state.currentStep = 'generating';
      
      // 开始生成设计方案
      const design = await this.generateDesign(projectInfo);
      this.state.generatedDesign = design;
      this.state.currentStep = 'completed';

      return {
        content: this.formatDesignResult(design),
        suggestions: [
          { text: '生成Word文档', action: 'generate_word' },
          { text: '查看参考案例', action: 'view_examples' },
          { text: '修改方案', action: 'modify_design' }
        ],
        state: this.state,
        design: design // 返回完整设计数据
      };
    }

    // 显示确认信息
    const confirmText = `
请确认项目信息：

📌 **项目名称**：${projectInfo.projectName || this.generateProjectName(projectInfo)}
📌 **主题**：${projectInfo.theme}
📌 **年级**：${projectInfo.grade}年级
📌 **学科**：${projectInfo.subjects.join('、')}
📌 **时长**：${projectInfo.duration}
${projectInfo.realWorldContext ? `📌 **真实情境**：${projectInfo.realWorldContext}\n` : ''}

信息无误吗？确认后我将为您生成完整的设计方案。`;

    return {
      content: confirmText,
      suggestions: [
        { text: '✅ 确认，开始生成', action: 'confirm' },
        { text: '修改信息', action: 'modify' }
      ],
      state: this.state
    };
  }

  /**
   * 步骤4：生成设计方案
   */
  async generateDesign(projectInfo) {
    // 1. 生成项目名称
    if (!projectInfo.projectName) {
      projectInfo.projectName = this.generateProjectName(projectInfo);
    }

    // 2. 查找参考案例
    const similarCases = await this.findSimilarCases(projectInfo);

    // 3. 生成驱动性问题
    const drivingQuestions = await this.generateDrivingQuestions(projectInfo);

    // 4. 生成学习目标
    const learningObjectives = await this.generateLearningObjectives(projectInfo);

    // 5. 生成活动设计
    const activities = await this.generateActivities(projectInfo);

    // 6. 生成评估方案
    const assessment = await this.generateAssessment(projectInfo);

    // 7. 生成资源清单
    const resources = await this.generateResources(projectInfo);

    // 8. 生成时间线
    const timeline = await this.generateTimeline(projectInfo, activities);

    return {
      projectInfo: projectInfo,
      projectBasis: {
        realWorldContext: projectInfo.realWorldContext || this.generateRealWorldContext(projectInfo),
        curriculumStandards: this.generateCurriculumStandards(projectInfo),
        studentAnalysis: this.generateStudentAnalysis(projectInfo.grade)
      },
      learningObjectives: learningObjectives,
      drivingQuestions: drivingQuestions,
      activities: activities,
      assessment: assessment,
      resources: resources,
      timeline: timeline,
      differentiation: this.generateDifferentiation(projectInfo.grade),
      implementation: this.generateImplementation(projectInfo),
      similarCases: similarCases
    };
  }

  /**
   * 生成项目名称
   */
  generateProjectName(projectInfo) {
    const { theme, grade } = projectInfo;
    const templates = [
      `${theme}探索之旅`,
      `小小${theme}专家`,
      `${theme}大作战`,
      `走进${theme}世界`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * 查找相似案例
   */
  async findSimilarCases(projectInfo) {
    try {
      // 从云存储的案例库中检索
      const result = await db.collection('pbl_cases')
        .where({
          grade: projectInfo.grade,
          theme: db.RegExp({
            regexp: projectInfo.theme,
            options: 'i'
          })
        })
        .limit(3)
        .get();

      if (result.data.length > 0) {
        return result.data;
      }

      // 如果没有匹配的，返回同年级的案例
      const fallbackResult = await db.collection('pbl_cases')
        .where({
          grade: projectInfo.grade
        })
        .limit(3)
        .get();

      return fallbackResult.data || [];

    } catch (error) {
      console.error('查找案例失败:', error);
      return [];
    }
  }

  /**
   * 生成驱动性问题
   */
  async generateDrivingQuestions(projectInfo) {
    const { theme, grade } = projectInfo;
    
    // 从问题库中检索匹配的问题
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
        .limit(5)
        .get();

      if (result.data.length > 0) {
        return {
          core: result.data[0].question,
          sub: result.data.slice(1, 4).map(q => q.question)
        };
      }
    } catch (error) {
      console.error('检索问题失败:', error);
    }

    // 降级：使用模板生成
    return {
      core: `我们如何通过${theme}项目，让学习变得更有意义？`,
      sub: [
        `${theme}与我们的生活有什么关系？`,
        `我们可以通过哪些方式来研究${theme}？`,
        `如何向他人展示我们关于${theme}的发现？`
      ]
    };
  }

  /**
   * 生成学习目标
   */
  async generateLearningObjectives(projectInfo) {
    const { subjects, grade } = projectInfo;
    
    const objectives = {
      knowledge: {},
      ability: [],
      competency: []
    };

    // 为每个学科生成知识目标
    subjects.forEach(subject => {
      objectives.knowledge[subject] = [
        `掌握${subject}相关的核心概念`,
        `能够应用${subject}知识解决实际问题`
      ];
    });

    // 跨学科能力目标
    objectives.ability = [
      '培养问题发现与解决能力',
      '提升信息收集与分析能力',
      '发展团队协作与沟通能力'
    ];

    // 核心素养目标
    objectives.competency = [
      '批判性思维：能够质疑和分析信息',
      '创造力：提出创新的解决方案',
      '合作能力：与他人有效协作',
      '沟通表达：清晰表达想法和成果'
    ];

    return objectives;
  }

  /**
   * 生成活动设计
   */
  async generateActivities(projectInfo) {
    const { duration } = projectInfo;
    const weeks = parseInt(duration) || 4;

    const activityTemplates = [
      {
        name: '启动与探索',
        ratio: 0.2,
        objectives: '激发兴趣，发现问题',
        activities: '头脑风暴、实地调查、访谈'
      },
      {
        name: '深入研究',
        ratio: 0.3,
        objectives: '收集信息，深入分析',
        activities: '文献研究、实验探究、数据收集'
      },
      {
        name: '方案设计',
        ratio: 0.3,
        objectives: '设计解决方案，制作成果',
        activities: '创意设计、原型制作、方案优化'
      },
      {
        name: '展示评估',
        ratio: 0.2,
        objectives: '展示成果，反思总结',
        activities: '成果展示、答辩交流、反思改进'
      }
    ];

    return activityTemplates.map((template, index) => ({
      stage: index + 1,
      name: template.name,
      duration: `${Math.ceil(weeks * template.ratio)}周`,
      objectives: template.objectives,
      activities: template.activities,
      subjectIntegration: this.generateSubjectIntegration(projectInfo.subjects),
      outcomes: `第${index + 1}阶段成果`,
      teacherGuidance: '教师需要关注学生的参与度和进展情况'
    }));
  }

  /**
   * 生成学科融合点
   */
  generateSubjectIntegration(subjects) {
    const integration = {};
    subjects.forEach(subject => {
      integration[subject] = `${subject}知识的实际应用`;
    });
    return integration;
  }

  /**
   * 生成评估方案
   */
  async generateAssessment(projectInfo) {
    return {
      formative: [
        { method: '学习日志', frequency: '每周', focus: '反思与思考过程' },
        { method: '小组讨论观察', frequency: '每次课', focus: '参与度与贡献' },
        { method: '阶段性成果检查', frequency: '每阶段', focus: '任务完成质量' }
      ],
      summative: [
        { content: '学科知识掌握', weight: '40%', criteria: '准确理解并应用' },
        { content: '问题解决能力', weight: '30%', criteria: '能独立解决问题' },
        { content: '合作与沟通', weight: '20%', criteria: '有效协作交流' },
        { content: '创新与反思', weight: '10%', criteria: '有创新和深度反思' }
      ]
    };
  }

  /**
   * 生成资源清单
   */
  async generateResources(projectInfo) {
    return {
      materials: ['相关书籍资料', '实验/创作材料', '展示用具'],
      technology: ['电脑/平板', '投影设备', '相关软件工具'],
      human: ['学科教师协作', '专家资源', '家长志愿者'],
      venue: ['教室', '实验室', '图书馆', '户外场地']
    };
  }

  /**
   * 生成项目时间线
   */
  async generateTimeline(projectInfo, activities) {
    return activities.map((activity, index) => ({
      stage: activity.name,
      week: `第${index + 1}-${index + Math.ceil(activities.length / 4)}周`,
      tasks: activity.activities,
      outcomes: activity.outcomes
    }));
  }

  /**
   * 生成真实世界情境
   */
  generateRealWorldContext(projectInfo) {
    return `本项目源于学生身边的真实${projectInfo.theme}问题，旨在培养学生的实践能力和社会责任感。`;
  }

  /**
   * 生成课程标准对接
   */
  generateCurriculumStandards(projectInfo) {
    const standards = {};
    projectInfo.subjects.forEach(subject => {
      standards[subject] = [`${subject}课程标准相关要求`];
    });
    return standards;
  }

  /**
   * 生成学生学情分析
   */
  generateStudentAnalysis(grade) {
    const analyses = {
      1: '一年级学生具体形象思维为主，需要直观、游戏化的学习方式',
      2: '二年级学生开始发展抽象思维，喜欢动手操作和探索',
      3: '三年级学生认知能力提升，能进行简单的研究和探究',
      4: '四年级学生逻辑思维发展，可以承担更复杂的项目任务',
      5: '五年级学生自主学习能力强，能够进行深度研究',
      6: '六年级学生综合能力较强，可以完成较为复杂的跨学科项目'
    };
    return analyses[grade] || '学生具备相应年龄段的认知能力';
  }

  /**
   * 生成差异化策略
   */
  generateDifferentiation(grade) {
    return {
      support: ['为学习困难学生提供脚手架', '简化任务难度', '增加支持和指导'],
      challenge: ['为优秀学生设计进阶任务', '提供更多探究空间', '担任小组长角色'],
      grouping: '根据学生特点灵活分组，确保每个学生都能参与'
    };
  }

  /**
   * 生成实施建议
   */
  generateImplementation(projectInfo) {
    return {
      preparation: ['提前准备相关资源', '协调各学科教师', '与家长沟通'],
      commonProblems: ['时间管理问题：预留缓冲时间', '资源不足：寻找替代方案'],
      parentCommunication: '通过家长会说明项目价值，争取理解和支持'
    };
  }

  /**
   * 格式化设计结果为可读文本
   */
  formatDesignResult(design) {
    const { projectInfo, drivingQuestions, activities } = design;

    let result = `
✅ **项目设计完成！**

## 📌 项目概览

**项目名称**：${projectInfo.projectName}
**主题**：${projectInfo.theme}
**年级**：${projectInfo.grade}年级
**学科**：${projectInfo.subjects.join('、')}
**时长**：${projectInfo.duration}

## 💡 驱动性问题

**核心问题**：${drivingQuestions.core}

**子问题**：
${drivingQuestions.sub.map((q, i) => `${i + 1}. ${q}`).join('\n')}

## 📚 学习活动（共${activities.length}个阶段）

${activities.map((a, i) => `**阶段${i + 1}：${a.name}**（${a.duration}）\n目标：${a.objectives}`).join('\n\n')}

## 🎯 下一步

方案已生成完毕！您可以：
1. 生成Word文档进行编辑
2. 查看参考案例获取灵感
3. 继续优化方案细节

需要我帮您做什么？`;

    return result;
  }

  /**
   * 步骤5：完成阶段
   */
  async handleCompleted(message) {
    if (message.includes('重新') || message.includes('再设计')) {
      // 重新开始
      this.state = this.initializeState();
      return await this.handleInitial(message);
    }

    if (message.includes('修改') || message.includes('优化')) {
      return {
        content: '请告诉我您想修改或优化哪个部分？\n\n1. 驱动性问题\n2. 学习活动\n3. 评估方案\n4. 其他',
        suggestions: [
          { text: '优化驱动性问题', action: 'optimize_questions' },
          { text: '调整学习活动', action: 'adjust_activities' },
          { text: '查看完整方案', action: 'view_full_design' }
        ],
        state: this.state
      };
    }

    return {
      content: '项目方案已为您准备好。还有其他需要吗？',
      suggestions: [
        { text: '设计新项目', action: 'new_project' },
        { text: '查看案例库', action: 'view_cases' }
      ],
      state: this.state
    };
  }
}

module.exports = { PBLDesignSkill };
```

这个模块是核心！我将在下一个文件中继续集成步骤...

### 第3步：修改主云函数集成PBL Skill

修改 `cloudfunctions/ai-assistant/index.js`，在 `handleChat` 函数中添加Skill检测：

```javascript
// 在文件开头添加
const { PBLDesignSkill } = require('./pbl-skill');

// 在 handleChat 函数中，调用AI之前添加Skill检测
async function handleChat(event, openid) {
  const { message, sessionId, projectContext } = event;

  try {
    // ... 现有代码 ...

    // ⭐ 新增：检测是否触发PBL Skill
    const session = await getOrCreateSession(sessionId, openid, projectContext);
    
    // 检查当前是否在PBL设计流程中
    const inPBLFlow = session.context?.pblState?.currentStep !== undefined;
    
    // 检测是否需要启动PBL Skill
    const triggeredPBL = PBLDesignSkill.detectTrigger(message);
    
    if (inPBLFlow || triggeredPBL) {
      // 使用PBL Skill处理
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
      
      // 添加消息到会话
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
        design: pblResponse.design // 如果有生成的设计数据
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
    // ... 现有AI调用代码 ...
  }
}
```

### 第4步：数据库准备

#### 4.1 创建集合

在云开发数据库中创建以下集合：

```json
// pbl_cases - 案例库
{
  "_id": "case_001",
  "title": "校园垃圾分类大作战",
  "theme": "环保",
  "grade": 3,
  "subjects": ["科学", "数学", "美术", "语文"],
  "duration": "4周",
  "drivingQuestion": {
    "core": "我们如何让校园垃圾分类变得更容易、更有趣？",
    "sub": ["现在学校垃圾分类存在什么问题？", "..."]
  },
  "activities": [...],
  "fullContent": "完整的案例内容...",
  "createdAt": "2026-03-08",
  "tags": ["环保", "垃圾分类", "小学"]
}

// pbl_questions - 问题库
{
  "_id": "q001",
  "question": "我们如何让校园垃圾分类变得更容易、更有趣？",
  "theme": "环保",
  "type": "问题解决型",
  "minGrade": 3,
  "maxGrade": 5,
  "subjectSuggestions": ["科学", "数学", "美术"]
}

// pbl_templates - 评估模板库
{
  "_id": "template_001",
  "name": "综合评分量规",
  "type": "rubric",
  "content": {...}
}

// pbl_generated_designs - 用户生成的设计方案
{
  "_id": "design_xxx",
  "userId": "openid",
  "projectName": "校园环保大作战",
  "projectInfo": {...},
  "fullDesign": {...},
  "createdAt": "2026-03-08",
  "updatedAt": "2026-03-08"
}
```

#### 4.2 数据导入脚本

创建脚本将skill资源导入数据库：

```javascript
// scripts/import_pbl_data.js
const cloud = require('wx-server-sdk');
cloud.init({ env: 'your-env-id' });
const db = cloud.database();

const examplesData = require('../.cursor/skills/pbl-design/examples.json');
const questionsData = require('../.cursor/skills/pbl-design/question_bank.json');

async function importData() {
  // 导入案例
  for (const caseData of examplesData.cases) {
    await db.collection('pbl_cases').add({
      data: caseData
    });
  }
  
  // 导入问题
  for (const question of questionsData.questions) {
    await db.collection('pbl_questions').add({
      data: question
    });
  }
  
  console.log('数据导入完成！');
}

importData();
```

### 第5步：前端页面集成

#### 5.1 修改AI助手页面显示Skill状态

在 `pages/ai-assistant/ai-assistant.js` 中添加：

```javascript
// 在 data 中添加
data: {
  // ... 现有数据
  activeSkill: null, // 当前激活的skill
  skillProgress: null // skill进度信息
},

// 修改 receiveAIResponse 函数
receiveAIResponse(data) {
  const { chatHistory } = this.data;
  
  // 检查是否使用了skill
  if (data.skillUsed) {
    this.setData({
      activeSkill: data.skillUsed,
      skillProgress: data.state?.currentStep || null
    });
  }
  
  // 添加AI消息
  const aiMessage = {
    id: Date.now(),
    sender: 'ai',
    content: data.message,
    time: this.formatTime(new Date()),
    suggestions: data.suggestions || [],
    design: data.design || null, // PBL设计数据
    skillUsed: data.skillUsed
  };
  
  chatHistory.push(aiMessage);
  
  this.setData({
    chatHistory,
    isAiTyping: false,
    scrollToId: `msg-${aiMessage.id}`
  });
  
  wx.setStorageSync('chatHistory', chatHistory);
},

// 新增：处理skill建议按钮
handleSkillSuggestion(e) {
  const { suggestion } = e.currentTarget.dataset;
  
  switch (suggestion.action) {
    case 'quick_start':
      // 快速开始
      this.setData({
        inputText: `${suggestion.theme}主题，${suggestion.grade}年级`
      });
      this.sendMessage();
      break;
    
    case 'set_field':
      // 设置字段值
      let valueText = '';
      if (Array.isArray(suggestion.value)) {
        valueText = suggestion.value.join('、');
      } else {
        valueText = suggestion.value;
      }
      this.setData({
        inputText: valueText
      });
      this.sendMessage();
      break;
    
    case 'confirm':
      // 确认生成
      this.setData({
        inputText: '确认'
      });
      this.sendMessage();
      break;
    
    case 'generate_word':
      // 生成Word文档
      this.generateWordDoc();
      break;
    
    case 'view_examples':
      // 查看案例
      wx.navigateTo({
        url: '/pages/pbl-examples/pbl-examples'
      });
      break;
    
    default:
      // 默认：将建议文本发送
      if (suggestion.text) {
        this.setData({
          inputText: suggestion.text
        });
        this.sendMessage();
      }
  }
},

// 新增：生成Word文档
async generateWordDoc() {
  const lastMessage = this.data.chatHistory[this.data.chatHistory.length - 1];
  if (!lastMessage || !lastMessage.design) {
    wx.showToast({
      title: '没有可生成的设计方案',
      icon: 'none'
    });
    return;
  }

  wx.showLoading({ title: '生成中...' });
  
  try {
    const res = await wx.cloud.callFunction({
      name: 'ai-assistant',
      data: {
        action: 'generateWordDoc',
        design: lastMessage.design
      }
    });

    if (res.result.success) {
      // 下载文件
      wx.cloud.downloadFile({
        fileID: res.result.fileID,
        success: (downloadRes) => {
          wx.hideLoading();
          wx.showModal({
            title: '文档生成成功',
            content: '是否打开预览？',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.openDocument({
                  filePath: downloadRes.tempFilePath,
                  fileType: 'docx'
                });
              }
            }
          });
        },
        fail: () => {
          wx.hideLoading();
          wx.showToast({
            title: '下载失败',
            icon: 'none'
          });
        }
      });
    }
  } catch (error) {
    wx.hideLoading();
    wx.showToast({
      title: '生成失败',
      icon: 'none'
    });
  }
}
```

#### 5.2 添加WXML显示Skill进度

在 `pages/ai-assistant/ai-assistant.wxml` 中添加：

```xml
<!-- 在对话区域上方添加skill状态栏 -->
<view class="skill-status" wx:if="{{activeSkill}}">
  <view class="skill-badge">
    <text class="skill-icon">🎯</text>
    <text class="skill-name">PBL项目设计助手</text>
  </view>
  <view class="skill-progress" wx:if="{{skillProgress}}">
    <text class="progress-text">{{skillProgressText[skillProgress]}}</text>
  </view>
</view>

<!-- 在消息中显示建议按钮 -->
<view class="message-suggestions" wx:if="{{msg.suggestions && msg.suggestions.length > 0}}">
  <view 
    class="suggestion-btn" 
    wx:for="{{msg.suggestions}}" 
    wx:key="index"
    data-suggestion="{{item}}"
    bindtap="handleSkillSuggestion"
  >
    {{item.text}}
  </view>
</view>

<!-- 显示设计结果卡片 -->
<view class="design-card" wx:if="{{msg.design}}">
  <view class="card-header">
    <text class="card-title">✅ 设计方案已生成</text>
  </view>
  <view class="card-content">
    <view class="info-item">
      <text class="label">项目名称：</text>
      <text class="value">{{msg.design.projectInfo.projectName}}</text>
    </view>
    <view class="info-item">
      <text class="label">核心问题：</text>
      <text class="value">{{msg.design.drivingQuestions.core}}</text>
    </view>
    <view class="info-item">
      <text class="label">活动阶段：</text>
      <text class="value">共{{msg.design.activities.length}}个阶段</text>
    </view>
  </view>
  <view class="card-actions">
    <button class="action-btn primary" bindtap="generateWordDoc">生成Word文档</button>
    <button class="action-btn" bindtap="viewFullDesign">查看完整方案</button>
  </view>
</view>
```

#### 5.3 添加样式

在 `pages/ai-assistant/ai-assistant.wxss` 中添加：

```css
/* Skill状态栏 */
.skill-status {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 15rpx 30rpx;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.skill-badge {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.skill-icon {
  font-size: 32rpx;
}

.skill-name {
  font-size: 28rpx;
  font-weight: 500;
}

.skill-progress {
  font-size: 24rpx;
  opacity: 0.9;
}

/* 建议按钮 */
.message-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 15rpx;
  margin-top: 15rpx;
}

.suggestion-btn {
  background: #f0f2f5;
  border: 1px solid #e4e6eb;
  border-radius: 30rpx;
  padding: 12rpx 24rpx;
  font-size: 26rpx;
  color: #333;
  transition: all 0.3s;
}

.suggestion-btn:active {
  background: #e4e6eb;
  transform: scale(0.98);
}

/* 设计结果卡片 */
.design-card {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-top: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.08);
}

.card-header {
  border-bottom: 1rpx solid #f0f2f5;
  padding-bottom: 20rpx;
  margin-bottom: 20rpx;
}

.card-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1aad19;
}

.card-content {
  margin-bottom: 30rpx;
}

.info-item {
  display: flex;
  margin-bottom: 15rpx;
}

.info-item .label {
  font-size: 26rpx;
  color: #999;
  width: 160rpx;
  flex-shrink: 0;
}

.info-item .value {
  font-size: 26rpx;
  color: #333;
  flex: 1;
}

.card-actions {
  display: flex;
  gap: 15rpx;
}

.action-btn {
  flex: 1;
  height: 70rpx;
  line-height: 70rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
  background: white;
  border: 1rpx solid #e4e6eb;
  color: #333;
}

.action-btn.primary {
  background: #07c160;
  color: white;
  border: none;
}
```

### 第6步：添加Word文档生成功能

在云函数中添加Word文档生成action：

```javascript
// 在 ai-assistant/index.js 中添加
case 'generateWordDoc':
  return await generateWordDoc(event, openid);

// 添加函数
async function generateWordDoc(event, openid) {
  const { design } = event;
  
  try {
    // 这里调用之前创建的Python脚本生成Word
    // 或者使用Node.js的docx库生成
    
    // 方案1：调用容器/云托管中的Python服务
    // 方案2：使用Node.js的officegen或docx库
    
    // 使用Node.js方案示例：
    const officegen = require('officegen');
    const docx = officegen('docx');
    
    // 添加标题
    let pObj = docx.createP();
    pObj.addText(design.projectInfo.projectName, {
      bold: true,
      font_size: 28,
      color: '000000'
    });
    
    // 添加项目概述
    pObj = docx.createP();
    pObj.addText('\n项目概述', { bold: true, font_size: 16 });
    
    pObj = docx.createP();
    pObj.addText(`年级：${design.projectInfo.grade}年级`);
    
    pObj = docx.createP();
    pObj.addText(`学科：${design.projectInfo.subjects.join('、')}`);
    
    // ... 添加更多内容
    
    // 生成文件并上传到云存储
    const filename = `PBL_${design.projectInfo.projectName}_${Date.now()}.docx`;
    const tempFilePath = `/tmp/${filename}`;
    
    await new Promise((resolve, reject) => {
      const out = require('fs').createWriteStream(tempFilePath);
      docx.generate(out);
      out.on('close', resolve);
      out.on('error', reject);
    });
    
    // 上传到云存储
    const uploadResult = await cloud.uploadFile({
      cloudPath: `pbl-designs/${openid}/${filename}`,
      fileContent: require('fs').createReadStream(tempFilePath)
    });
    
    // 保存设计记录到数据库
    await db.collection('pbl_generated_designs').add({
      data: {
        userId: openid,
        projectName: design.projectInfo.projectName,
        fullDesign: design,
        fileID: uploadResult.fileID,
        createdAt: new Date()
      }
    });
    
    return {
      success: true,
      fileID: uploadResult.fileID,
      filename: filename
    };
    
  } catch (error) {
    console.error('生成Word文档失败:', error);
    return {
      success: false,
      message: '文档生成失败'
    };
  }
}
```

### 第7步：安装依赖

在云函数目录安装必要的依赖：

```bash
cd cloudfunctions/ai-assistant
npm install officegen --save
# 或者
npm install docx --save
```

### 第8步：测试集成

#### 8.1 测试触发词

在小程序AI助手中输入：
- "我想设计一个项目化学习方案"
- "帮我做个跨学科项目"
- "设计一个三年级的环保项目"

#### 8.2 测试完整流程

1. **触发skill** → 系统识别并启动PBL设计流程
2. **信息收集** → 系统询问必要信息，用户回答
3. **确认信息** → 显示收集的信息供确认
4. **生成方案** → AI生成完整的设计方案
5. **生成文档** → 点击按钮生成Word文档

### 第9步：优化建议

#### 9.1 添加进度保存

```javascript
// 在每次状态更新时保存到数据库
await db.collection('pbl_design_sessions').add({
  data: {
    userId: openid,
    sessionId: session._id,
    state: pblResponse.state,
    updatedAt: new Date()
  }
});
```

#### 9.2 添加历史方案查看

创建页面 `pages/my-pbl-designs/my-pbl-designs.js`：

```javascript
Page({
  data: {
    designs: []
  },
  
  async onLoad() {
    const res = await wx.cloud.callFunction({
      name: 'ai-assistant',
      data: {
        action: 'getMyDesigns'
      }
    });
    
    this.setData({
      designs: res.result.data
    });
  },
  
  viewDesign(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/design-detail/design-detail?id=${id}`
    });
  }
});
```

#### 9.3 添加分享功能

```javascript
// 分享设计方案
async shareDesign(designId) {
  // 生成分享链接或小程序码
  const res = await wx.cloud.callFunction({
    name: 'ai-assistant',
    data: {
      action: 'shareDesign',
      designId: designId
    }
  });
  
  wx.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline']
  });
}
```

## 完整集成检查清单

部署前请确认：

- [ ] PBL Skill模块已创建（pbl-skill.js）
- [ ] 主云函数已集成Skill检测逻辑
- [ ] 数据库集合已创建（pbl_cases、pbl_questions等）
- [ ] 案例和问题数据已导入
- [ ] 前端页面已添加Skill UI组件
- [ ] 建议按钮处理逻辑已实现
- [ ] Word文档生成功能已实现
- [ ] 云函数依赖已安装
- [ ] 测试触发词正常工作
- [ ] 完整流程可以走通
- [ ] 生成的文档可以正常下载

## 常见问题

### Q1: 如何调整Skill的触发灵敏度？

修改 `PBLDesignSkill.detectTrigger()` 中的关键词列表，添加或删除关键词。

### Q2: 如何添加新的案例到案例库？

直接在 `pbl_cases` 集合中添加新文档，或通过管理后台上传。

### Q3: Word文档生成太慢怎么办？

考虑：
1. 使用云托管部署Python脚本服务
2. 异步生成，完成后通知用户
3. 简化文档内容，只包含核心信息

### Q4: 如何让AI回答更准确？

1. 优化案例库的标签和描述
2. 增加问题库的覆盖面
3. 调整信息提取的正则表达式
4. 使用混元API的function calling能力

### Q5: 能否支持其他学段（初中、高中）？

可以！修改以下部分：
1. 扩展年级范围检测
2. 添加对应学段的案例
3. 调整学情分析逻辑
4. 更新评估标准

## 下一步优化方向

1. **语义理解增强**：集成向量数据库，实现语义搜索案例
2. **个性化推荐**：基于用户历史，推荐合适的主题和案例
3. **协作设计**：支持多教师协作设计项目
4. **模板市场**：用户可以分享和下载优秀设计模板
5. **AI自动优化**：AI分析设计方案并给出优化建议

## 技术支持

如有问题，请查看：
- [QUICKSTART.md](./QUICKSTART.md) - 快速上手指南
- [README.md](./README.md) - 完整功能说明
- [examples.md](./examples.md) - 参考案例

---

**祝您集成顺利！** 🎉

如有任何问题，随时联系开发团队。
