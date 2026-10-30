# PBL设计Skill - 文件说明

## 📂 当前文件结构（已清理）

```
pbl-design/
├── 📋 TODO.md                        ⭐ 开始看这个！下一步操作指南
│
├── 📖 核心文档
│   ├── INTEGRATION_GUIDE.md          完整集成指南（43KB，最详细）
│   ├── WORD_TO_DATABASE_GUIDE.md     Word文档导入数据库指南
│   └── SKILL.md                      Skill定义（Cursor需要）
│
├── 📚 知识库资源（供AI参考）
│   ├── examples.md                   5个完整的PBL项目案例
│   ├── question_bank.md              68个驱动性问题库
│   └── assessment_templates.md       8种评估模板
│
└── 🛠️ 工具脚本
    └── scripts/
        ├── parse_word_to_json.py     Word文档转JSON
        ├── generate_pbl_doc.py       生成Word文档
        └── validate_design.py        验证设计质量
```

## 🎯 快速开始

### 1. 查看TODO清单
```bash
打开 TODO.md 查看接下来要做的事
```

最重要的是：**接入混元大模型API**

### 2. 核心任务
- [ ] 在 `pbl-skill.js` 中接入混元API
- [ ] 准备数据库（添加测试案例）
- [ ] 集成到主云函数

### 3. 详细步骤
参考 `INTEGRATION_GUIDE.md` 获取完整的集成步骤

## 📝 已完成的工作

✅ Skill逻辑代码已创建
✅ 知识库资源已准备
✅ 数据导入方案已创建
✅ 文档已整理精简

## 🚀 下一步

打开 `TODO.md` 开始工作！
