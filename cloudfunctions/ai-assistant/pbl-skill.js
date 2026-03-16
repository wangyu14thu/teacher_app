// cloudfunctions/ai-assistant/pbl-skill.js
/**
 * PBL设计Skill - 微信小程序集成版本
 * 跨学科项目化学习设计助手
 * 
 * 功能：
 * 1. 智能对话式信息收集
 * 2. 生成完整的PBL设计方案
 * 3. 推荐相关案例和问题
 * 4. 支持方案优化和Word文档导出
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * PBL设计Skill主类
 */
class PBLDesignSkill {
  constructor() {
    this.state = {};
  }

  /**
   * 检测用户消息是否触发PBL设计Skill
   * @param {string} message - 用户消息
   * @returns {boolean} 是否触发
   */
  static detectTrigger(message) {
    const triggerKeywords = [
      '项目化学习', 'PBL', '跨学科项目', '项目方案', '项目设计',
      '综合实践', '主题活动', '综合性学习', '设计项目',
      '跨学科设计', '项目式学习', '探究项目'
    ];
    
    const lowerMessage = message.toLowerCase();
    return triggerKeywords.some(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    );
  }

  /**
   * 主处理函数
   * @param {string} message - 用户消息
   * @param {object} sessionState - 会话状态
   * @returns {object} 响应结果
   */
  async process(message, sessionState) {
    this.state = sessionState || this.initializeState();
    
    const currentStep = this.state.currentStep;
    
    try {
      switch (currentStep) {
        case 'initial':
          return await this.handleInitial(message);
        
        case 'collecting_info':
          return await this.handleInfoCollection(message);
        
        case 'confirming':
          return await this.handleConfirmation(message);
        
        case 'generating':
          return await this.handleGeneration();
        
        case 'completed':
          return await this.handleCompleted(message);
        
        default:
          return await this.handleInitial(message);
      }
    } catch (error) {
      console.error('PBL Skill处理错误:', error);
      return {
        content: '抱歉，处理过程中出现了错误。让我们重新开始吧。',
        suggestions: [
          { text: '重新开始', action: 'restart' }
        ],
        state: this.initializeState()
      };
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
      generatedDesign: null,
      startTime: new Date()
    };
  }

  /**
   * 步骤1：初始引导
   */
  async handleInitial(message) {
    // 尝试从消息中提取初始信息
    const extracted = this.extractProjectInfo(message);
    
    if (Object.keys(extracted).length > 0) {
      // 如果已经包含信息，直接进入收集阶段
      Object.keys(extracted).forEach(key => {
        this.state.projectInfo[key] = extracted[key];
        this.state.collectedFields.push(key);
      });
      this.state.currentStep = 'collecting_info';
      return await this.handleInfoCollection('');
    }
    
    // 否则显示欢迎界面
    this.state.currentStep = 'collecting_info';
    
    return {
      content: `您好！我是**PBL项目设计助手** 🎯

我将帮您设计一个完整的跨学科项目化学习方案，包括：
✅ 项目依据分析
✅ 驱动性问题设计
✅ 学习活动规划
✅ 评估方案制定
✅ 完整Word文档生成

**开始前，我需要了解几个关键信息：**

1️⃣ **项目主题** - 例如：环保、科技、传统文化
2️⃣ **目标年级** - 1-6年级
3️⃣ **涉及学科** - 至少2个学科
4️⃣ **项目时长** - 几周或几课时

您可以直接告诉我，比如："我想设计一个三年级的环保主题项目，4周，整合科学、数学、美术"

或者点击下方快速开始 👇`,
      
      suggestions: [
        { text: '环保（三年级）', action: 'quick_template', theme: '环保', grade: 3, subjects: ['科学', '数学', '美术'] },
        { text: '科技（五年级）', action: 'quick_template', theme: '科技创新', grade: 5, subjects: ['科学', '数学', '信息技术'] },
        { text: '文化（六年级）', action: 'quick_template', theme: '传统文化', grade: 6, subjects: ['语文', '社会', '美术'] },
        { text: '我自己说', action: 'custom' }
      ],
      
      state: this.state
    };
  }

  /**
   * 步骤2：信息收集
   */
  async handleInfoCollection(message) {
    // 提取新信息
    if (message && message.trim()) {
      const extracted = this.extractProjectInfo(message);
      
      Object.keys(extracted).forEach(key => {
        const value = extracted[key];
        if (value && !this.isFieldCollected(key)) {
          this.state.projectInfo[key] = value;
          this.state.collectedFields.push(key);
        }
      });
    }

    // 检查必填项
    const requiredFields = ['theme', 'grade', 'subjects', 'duration'];
    const missingFields = requiredFields.filter(field => 
      !this.isFieldCollected(field) || 
      !this.state.projectInfo[field] ||
      (Array.isArray(this.state.projectInfo[field]) && this.state.projectInfo[field].length === 0)
    );

    if (missingFields.length === 0) {
      // 信息收集完成
      this.state.currentStep = 'confirming';
      return await this.handleConfirmation('');
    }

    // 继续收集
    return this.askForMissingInfo(missingFields);
  }

  /**
   * 检查字段是否已收集
   */
  isFieldCollected(field) {
    return this.state.collectedFields.includes(field);
  }

  /**
   * 从消息中提取项目信息
   */
  extractProjectInfo(message) {
    const extracted = {};
    const msg = message.toLowerCase();
    
    // 提取主题
    const themePatterns = [
      /(?:主题|关于)(?:是|为|：)?([^\s，。、]+?)(?:的)?(?:项目|方案|主题)?/,
      /想(?:做|设计)([^\s，。]+?)(?:主题|项目)/,
      /([环保科技文化创新健康安全传统]+)(?:主题|项目)/
    ];
    
    for (const pattern of themePatterns) {
      const match = message.match(pattern);
      if (match && match[1] && match[1].length > 1 && match[1].length < 20) {
        extracted.theme = match[1].trim();
        break;
      }
    }

    // 提取年级
    const gradePatterns = [
      /([一二三四五六123456])年级/,
      /年级[是：]?([一二三四五六123456])/,
      /([一二三四五六123456])级/
    ];
    
    const gradeMap = {
      '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6,
      '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6
    };
    
    for (const pattern of gradePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const grade = gradeMap[match[1]];
        if (grade) {
          extracted.grade = grade;
          break;
        }
      }
    }

    // 提取学科
    const subjectKeywords = [
      '语文', '数学', '英语', '科学', '美术', '音乐', 
      '体育', '信息技术', '社会', '道德与法治', '劳动'
    ];
    
    const foundSubjects = [];
    subjectKeywords.forEach(subject => {
      if (message.includes(subject) && !foundSubjects.includes(subject)) {
        foundSubjects.push(subject);
      }
    });
    
    if (foundSubjects.length > 0) {
      extracted.subjects = foundSubjects;
    }

    // 提取时长
    const durationPatterns = [
      /(\d+)\s*(?:周|星期)/,
      /(\d+)\s*(?:课时|节课|节)/,
      /时长[是：]?(\d+)/
    ];
    
    for (const pattern of durationPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const unit = message.includes('周') || message.includes('星期') ? '周' : '课时';
        extracted.duration = `${match[1]}${unit}`;
        break;
      }
    }

    // 提取真实情境（如果消息较长且包含描述性内容）
    if (message.length > 30 && (
      message.includes('因为') || 
      message.includes('情境') || 
      message.includes('背景') || 
      message.includes('现在') ||
      message.includes('学校')
    )) {
      extracted.realWorldContext = message;
    }

    return extracted;
  }

  /**
   * 询问缺失信息
   */
  askForMissingInfo(missingFields) {
    const { projectInfo } = this.state;
    
    // 显示已收集的信息
    let summary = '✅ **已收集信息：**\n\n';
    const collected = [];
    
    if (projectInfo.theme) {
      collected.push(`主题：${projectInfo.theme}`);
    }
    if (projectInfo.grade) {
      collected.push(`年级：${projectInfo.grade}年级`);
    }
    if (projectInfo.subjects && projectInfo.subjects.length > 0) {
      collected.push(`学科：${projectInfo.subjects.join('、')}`);
    }
    if (projectInfo.duration) {
      collected.push(`时长：${projectInfo.duration}`);
    }
    
    if (collected.length > 0) {
      summary += collected.join('\n') + '\n\n';
    }

    // 询问下一个字段
    const fieldNames = {
      theme: '项目主题',
      grade: '目标年级',
      subjects: '涉及学科',
      duration: '项目时长'
    };
    
    const fieldPrompts = {
      theme: '请告诉我**项目主题**（例如：环保、科技创新、传统文化）',
      grade: '请告诉我**目标年级**（1-6年级）',
      subjects: '请告诉我需要整合哪些**学科**？（至少2个，例如：科学、数学、美术）',
      duration: '请告诉我**项目时长**（例如：4周 或 12课时）'
    };

    const nextField = missingFields[0];
    const prompt = summary + '📝 ' + fieldPrompts[nextField];

    return {
      content: prompt,
      suggestions: this.generateFieldSuggestions(nextField, projectInfo),
      state: this.state
    };
  }

  /**
   * 生成字段建议按钮
   */
  generateFieldSuggestions(field, projectInfo) {
    switch (field) {
      case 'theme':
        return [
          { text: '环保', value: '环保', field: 'theme' },
          { text: '科技创新', value: '科技创新', field: 'theme' },
          { text: '传统文化', value: '传统文化', field: 'theme' },
          { text: '健康生活', value: '健康生活', field: 'theme' }
        ];
      
      case 'grade':
        return [
          { text: '一年级', value: 1, field: 'grade' },
          { text: '二年级', value: 2, field: 'grade' },
          { text: '三年级', value: 3, field: 'grade' },
          { text: '四年级', value: 4, field: 'grade' },
          { text: '五年级', value: 5, field: 'grade' },
          { text: '六年级', value: 6, field: 'grade' }
        ];
      
      case 'subjects':
        // 根据主题推荐学科组合
        const subjectCombos = {
          '环保': [
            { text: '科学+数学+美术', value: ['科学', '数学', '美术'] },
            { text: '科学+语文+社会', value: ['科学', '语文', '社会'] }
          ],
          '科技创新': [
            { text: '科学+数学+信息技术', value: ['科学', '数学', '信息技术'] },
            { text: '科学+美术+劳动', value: ['科学', '美术', '劳动'] }
          ],
          '传统文化': [
            { text: '语文+美术+音乐', value: ['语文', '美术', '音乐'] },
            { text: '语文+社会+美术', value: ['语文', '社会', '美术'] }
          ],
          'default': [
            { text: '科学+数学', value: ['科学', '数学'] },
            { text: '语文+美术', value: ['语文', '美术'] }
          ]
        };
        
        const theme = projectInfo.theme || 'default';
        return subjectCombos[theme] || subjectCombos.default;
      
      case 'duration':
        return [
          { text: '2周', value: '2周', field: 'duration' },
          { text: '4周', value: '4周', field: 'duration' },
          { text: '6周', value: '6周', field: 'duration' },
          { text: '8周', value: '8周', field: 'duration' }
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

    // 检测修改意图
    if (message && (
      message.includes('修改') || 
      message.includes('不对') || 
      message.includes('重新') ||
      message.includes('换')
    )) {
      this.state.currentStep = 'collecting_info';
      this.state.collectedFields = [];
      
      return {
        content: '好的，让我们重新收集信息。请告诉我您想设计什么项目？',
        suggestions: [
          { text: '环保主题', value: '环保', field: 'theme' },
          { text: '科技主题', value: '科技创新', field: 'theme' }
        ],
        state: this.state
      };
    }

    // 确认后开始生成
    if (!message || 
        message.includes('确认') || 
        message.includes('没问题') || 
        message.includes('开始') ||
        message.includes('好') ||
        message.includes('可以')) {
      
      this.state.currentStep = 'generating';
      return await this.handleGeneration();
    }

    // 生成项目名称
    if (!projectInfo.projectName) {
      projectInfo.projectName = this.generateProjectName(projectInfo);
    }

    // 显示确认信息
    const confirmText = `
📋 **请确认项目信息：**

🎯 **项目名称**：${projectInfo.projectName}
📌 **主题**：${projectInfo.theme}
👥 **年级**：${projectInfo.grade}年级
📚 **学科**：${projectInfo.subjects.join('、')}
⏱️ **时长**：${projectInfo.duration}
${projectInfo.realWorldContext ? `\n🌍 **真实情境**：${projectInfo.realWorldContext}\n` : ''}
---

✅ 信息无误？确认后我将为您生成完整的设计方案。

预计包含：
• 项目依据分析
• 驱动性问题设计
• 分阶段学习活动
• 多元评估方案
• 资源与时间规划

生成过程需要10-15秒⏳`;

    return {
      content: confirmText,
      suggestions: [
        { text: '✅ 确认，开始生成', action: 'confirm_generate' },
        { text: '🔄 修改信息', action: 'modify_info' }
      ],
      state: this.state
    };
  }

  /**
   * 步骤4：生成设计方案
   */
  async handleGeneration() {
    const { projectInfo } = this.state;
    
    try {
      // 生成完整设计
      const design = await this.generateCompleteDesign(projectInfo);
      
      this.state.generatedDesign = design;
      this.state.currentStep = 'completed';

      // 格式化输出
      const resultText = this.formatDesignPreview(design);

      return {
        content: resultText,
        suggestions: [
          { text: '📄 生成Word文档', action: 'generate_word_doc' },
          { text: '📚 查看参考案例', action: 'view_similar_cases' },
          { text: '🔍 查看完整方案', action: 'view_full_design' },
          { text: '✏️ 优化方案', action: 'optimize_design' }
        ],
        state: this.state,
        design: design // 返回完整数据供前端使用
      };
      
    } catch (error) {
      console.error('生成设计方案失败:', error);
      return {
        content: '抱歉，生成过程中出现了问题。要不要重新尝试？',
        suggestions: [
          { text: '重新生成', action: 'regenerate' },
          { text: '修改信息', action: 'modify_info' }
        ],
        state: this.state
      };
    }
  }

  /**
   * 生成完整设计方案
   */
  async generateCompleteDesign(projectInfo) {
    // 生成各个部分
    const design = {
      projectInfo: {
        ...projectInfo,
        projectName: projectInfo.projectName || this.generateProjectName(projectInfo),
        designer: '教师',
        designDate: new Date().toISOString().split('T')[0]
      },
      
      projectBasis: await this.generateProjectBasis(projectInfo),
      learningObjectives: await this.generateLearningObjectives(projectInfo),
      drivingQuestions: await this.generateDrivingQuestions(projectInfo),
      activities: await this.generateActivities(projectInfo),
      assessment: this.generateAssessment(projectInfo),
      resources: this.generateResources(projectInfo),
      timeline: null, // 将在activities生成后填充
      differentiation: this.generateDifferentiation(projectInfo.grade),
      implementation: this.generateImplementation(projectInfo),
      
      metadata: {
        generatedAt: new Date(),
        version: '1.0',
        skillVersion: 'pbl-design-v1.0'
      }
    };

    // 生成时间线（基于活动）
    design.timeline = this.generateTimeline(design.activities, projectInfo.duration);

    // 查找相似案例
    design.similarCases = await this.findSimilarCases(projectInfo);

    return design;
  }

  /**
   * 生成项目名称
   */
  generateProjectName(projectInfo) {
    const { theme, grade } = projectInfo;
    const templates = [
      `探索${theme}的奥秘`,
      `${theme}小专家`,
      `${theme}大作战`,
      `走进${theme}世界`,
      `${theme}探究之旅`
    ];
    const randomIndex = Math.floor(Math.random() * templates.length);
    return templates[randomIndex];
  }

  /**
   * 生成项目依据
   */
  async generateProjectBasis(projectInfo) {
    return {
      realWorldContext: projectInfo.realWorldContext || 
        `本项目源于学生身边的真实${projectInfo.theme}问题，旨在通过实践探究，培养学生的综合素养和社会责任感。学生将在真实情境中发现问题、研究问题、解决问题，体验学习的意义和价值。`,
      
      curriculumStandards: this.generateCurriculumStandards(projectInfo),
      
      studentAnalysis: this.generateStudentAnalysis(projectInfo.grade)
    };
  }

  /**
   * 生成课程标准对接
   */
  generateCurriculumStandards(projectInfo) {
    const standards = {};
    
    const standardsTemplates = {
      '科学': ['认识自然现象和规律', '培养科学探究能力', '理解科学、技术与社会的关系'],
      '数学': ['掌握数学基本知识和技能', '发展数学思维能力', '学会用数学解决实际问题'],
      '语文': ['提高语言文字运用能力', '发展思维能力和审美情趣', '传承中华优秀文化'],
      '美术': ['提高审美和人文素养', '激发创新精神和实践能力', '理解美术与生活的关系'],
      '音乐': ['感受音乐美', '表现音乐情感', '创造音乐作品'],
      '体育': ['增强体质', '掌握运动技能', '培养体育精神'],
      '信息技术': ['提升信息素养', '学会信息技术应用', '培养计算思维'],
      '社会': ['了解社会生活', '培养社会责任', '发展公民素养'],
      '劳动': ['培养劳动技能', '树立劳动观念', '养成劳动习惯']
    };
    
    projectInfo.subjects.forEach(subject => {
      standards[subject] = standardsTemplates[subject] || [`${subject}课程标准相关要求`];
    });
    
    return standards;
  }

  /**
   * 生成学生学情分析
   */
  generateStudentAnalysis(grade) {
    const analyses = {
      1: `一年级学生以具体形象思维为主，注意力持续时间较短（15-20分钟），对新鲜事物充满好奇。他们喜欢游戏化、情境化的学习方式，需要大量的动手操作和直观体验。在项目学习中，建议设计短周期（1-2周）、任务简单、趣味性强的活动。`,
      
      2: `二年级学生的具体形象思维进一步发展，开始出现抽象逻辑思维的萌芽。注意力可持续20-25分钟，自我控制能力有所提升。他们乐于参与探究活动，喜欢动手制作。项目设计应注重直观性和操作性，提供充分的实践机会。`,
      
      3: `三年级学生处于从具体形象思维向抽象逻辑思维过渡的关键期，开始具备初步的分析、综合能力。注意力可维持25-30分钟，能够参与较为复杂的项目活动。适合开展2-4周的跨学科项目，培养初步的研究意识和方法。`,
      
      4: `四年级学生的抽象逻辑思维能力明显发展，能够进行简单的推理和判断。注意力可持续30-35分钟，自主学习能力逐步提升。他们能够承担更复杂的项目任务，适合开展4-6周的深度项目学习，注重培养问题解决能力和创新思维。`,
      
      5: `五年级学生的抽象思维能力进一步发展，能够进行较为复杂的分析和推理。注意力可维持35-40分钟，自我管理能力较强。他们具备一定的研究能力和批判性思维，适合开展6-8周的综合性项目，可以进行较深入的探究和创作。`,
      
      6: `六年级学生即将进入青春期，抽象思维能力基本成熟，具备较强的分析、综合、评价能力。注意力可持续40分钟以上，自主学习和合作能力较好发展。他们能够承担复杂的项目任务，适合开展8周以上的长期项目，注重培养综合素养和社会责任感。`
    };
    
    return analyses[grade] || `${grade}年级学生具备相应年龄段的认知能力和学习特点，项目设计应充分考虑其发展水平。`;
  }

  // ... 继续在下一个文件中补充剩余方法

  /**
   * 格式化设计预览
   */
  formatDesignPreview(design) {
    const { projectInfo, drivingQuestions, activities } = design;
    
    return `
🎉 **设计方案生成成功！**

━━━━━━━━━━━━━━━━━━

## 📌 项目概览

**🎯 项目名称**：${projectInfo.projectName}
**📚 主题**：${projectInfo.theme}
**👥 年级**：${projectInfo.grade}年级
**📖 学科**：${projectInfo.subjects.join('、')}
**⏱️ 时长**：${projectInfo.duration}

━━━━━━━━━━━━━━━━━━

## 💡 核心驱动问题

**${drivingQuestions.core}**

**子问题：**
${drivingQuestions.sub.map((q, i) => `${i + 1}. ${q}`).join('\n')}

━━━━━━━━━━━━━━━━━━

## 📚 学习活动（${activities.length}个阶段）

${activities.slice(0, 3).map((a, i) => 
`**阶段${i + 1}：${a.name}** (${a.duration})
📍 目标：${a.objectives}`
).join('\n\n')}

${activities.length > 3 ? `\n... 还有${activities.length - 3}个阶段` : ''}

━━━━━━━━━━━━━━━━━━

✅ **方案已完整生成！**

包含内容：
• 完整的项目依据分析
• 详细的学习目标设定
• ${activities.length}个阶段的活动设计
• 多元化的评估方案
• 完整的资源与时间规划
• 差异化教学策略
• 实施建议与注意事项

🎁 **相关推荐**：为您找到${design.similarCases?.length || 0}个相似案例供参考

---

**下一步您可以：**
`;
  }

  /**
   * 步骤5：完成后处理
   */
  async handleCompleted(message) {
    // 检测重新设计意图
    if (message && (
      message.includes('重新') || 
      message.includes('再设计') ||
      message.includes('新项目')
    )) {
      this.state = this.initializeState();
      return await this.handleInitial('');
    }

    // 检测优化意图
    if (message && (
      message.includes('优化') || 
      message.includes('改进') ||
      message.includes('修改')
    )) {
      return {
        content: `好的！请告诉我您想优化或修改哪个部分？

我可以帮您：
1. 重新生成驱动性问题
2. 调整学习活动设计
3. 优化评估方案
4. 补充资源清单
5. 修改项目时长

请具体说明您的需求，我会为您重新生成。`,
        
        suggestions: [
          { text: '优化驱动性问题', action: 'optimize_questions' },
          { text: '调整活动设计', action: 'adjust_activities' },
          { text: '完善评估方案', action: 'enhance_assessment' }
        ],
        state: this.state
      };
    }

    // 默认提示
    return {
      content: `项目设计方案已为您准备好！
      
您可以：
• 生成Word文档进行详细编辑
• 查看推荐的参考案例
• 继续优化方案细节
• 保存到我的项目库

还需要其他帮助吗？`,
      
      suggestions: [
        { text: '📄 生成Word文档', action: 'generate_word_doc' },
        { text: '🔄 设计新项目', action: 'new_project' },
        { text: '📚 查看案例库', action: 'view_case_library' }
      ],
      state: this.state
    };
  }
  
  // ... 其他生成方法将在pbl-skill-helpers.js中实现
}

// 导出
module.exports = { PBLDesignSkill };
