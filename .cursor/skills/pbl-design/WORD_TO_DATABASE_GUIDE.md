# Word文档导入云数据库完整指南

## 📝 问题场景

您有多个Word文档，每个文档包含一个PBL项目案例：

```
案例1.docx
├── 标题：校园垃圾分类大作战
├── 项目概述
│   └── 内容...
├── 驱动性问题
│   └── 内容...
├── 学习活动
│   └── 内容...
└── ...

案例2.docx
案例3.docx
...
```

**目标**：将这些Word文档导入到微信小程序云数据库中

---

## 🎯 整体方案

```
Word文档 → Python解析 → JSON格式 → 云数据库
   ↓            ↓           ↓          ↓
原始文件    提取结构化   标准格式   可查询使用
```

---

## 📊 数据库结构设计

### 方案A：完整存储（推荐用于案例库）

```javascript
// pbl_cases 集合
{
  "_id": "case_001",
  "title": "校园垃圾分类大作战",
  "theme": "环保",
  "grade": 3,
  "subjects": ["科学", "数学", "美术", "语文"],
  "duration": "4周",
  
  // 结构化数据（用于检索和生成）
  "structured": {
    "projectOverview": {
      "projectName": "校园垃圾分类大作战",
      "targetGrade": 3,
      "subjects": ["科学", "数学", "美术", "语文"],
      "duration": "4周",
      "description": "学校推行垃圾分类政策，但效果不理想..."
    },
    
    "drivingQuestion": {
      "core": "我们如何让校园垃圾分类变得更容易、更有趣？",
      "sub": [
        "现在学校垃圾分类存在什么问题？",
        "垃圾应该如何正确分类？",
        "怎样设计让同学们一看就懂的分类标识？"
      ]
    },
    
    "activities": [
      {
        "stage": 1,
        "name": "问题发现",
        "duration": "1周",
        "objectives": "发现校园垃圾分类问题",
        "mainActivities": "观察、采访、统计",
        "outcomes": "问题调查报告"
      },
      // ... 更多阶段
    ],
    
    "assessment": {
      "formative": [...],
      "summative": [...]
    },
    
    "resources": {
      "materials": [...],
      "technology": [...],
      "human": [...]
    }
  },
  
  // 全文内容（用于全文检索）
  "fullContent": "校园垃圾分类大作战\n\n项目概述\n学校推行垃圾分类...",
  
  // 原始文档引用（可选）
  "originalDoc": {
    "fileID": "cloud://xxx.docx",
    "fileName": "校园垃圾分类大作战.docx",
    "uploadTime": "2026-03-08"
  },
  
  // 元数据
  "metadata": {
    "createdAt": "2026-03-08",
    "createdBy": "admin",
    "tags": ["环保", "垃圾分类", "小学"],
    "quality": "verified",
    "viewCount": 0,
    "likeCount": 0
  }
}
```

### 方案B：分块存储（用于向量检索）

如果未来要用向量数据库做语义检索：

```javascript
// pbl_case_chunks 集合（每个小块一条记录）
{
  "_id": "chunk_001",
  "caseId": "case_001",
  "caseTitle": "校园垃圾分类大作战",
  "chunkType": "driving_question",  // 块类型
  "content": "我们如何让校园垃圾分类变得更容易、更有趣？",
  "metadata": {
    "grade": 3,
    "theme": "环保",
    "subjects": ["科学", "数学"]
  }
}
```

---

## 🛠️ 实现步骤

### 步骤1：Word文档解析脚本

创建 `scripts/parse_word_to_json.py`：

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Word文档解析脚本
将PBL项目案例Word文档转换为JSON格式
"""

from docx import Document
import json
import re
from pathlib import Path

class PBLCaseParser:
    """PBL案例解析器"""
    
    def __init__(self):
        self.current_case = {}
        
    def parse_word_document(self, docx_path):
        """解析Word文档"""
        doc = Document(docx_path)
        
        # 初始化案例数据结构
        case = {
            "title": "",
            "theme": "",
            "grade": 0,
            "subjects": [],
            "duration": "",
            "structured": {
                "projectOverview": {},
                "drivingQuestion": {"core": "", "sub": []},
                "activities": [],
                "assessment": {},
                "resources": {}
            },
            "fullContent": "",
            "metadata": {}
        }
        
        # 当前章节
        current_section = None
        current_content = []
        
        # 遍历所有段落
        for para in doc.paragraphs:
            text = para.text.strip()
            
            if not text:
                continue
            
            # 识别标题（通过样式或格式）
            if para.style.name.startswith('Heading'):
                # 保存上一节的内容
                if current_section:
                    case = self._save_section(case, current_section, current_content)
                
                # 开始新章节
                current_section = self._normalize_section_name(text)
                current_content = []
                
            else:
                # 普通段落，加入当前章节
                current_content.append(text)
            
            # 全文累加
            case['fullContent'] += text + '\n'
        
        # 保存最后一节
        if current_section:
            case = self._save_section(case, current_section, current_content)
        
        # 后处理：提取元数据
        case = self._extract_metadata(case)
        
        return case
    
    def _normalize_section_name(self, heading_text):
        """标准化章节名称"""
        # 去除编号（如"一、"、"1."）
        text = re.sub(r'^[一二三四五六七八九十\d]+[、\.]?\s*', '', heading_text)
        
        # 标准化关键词映射
        mapping = {
            '项目概述': 'overview',
            '项目基本信息': 'overview',
            '驱动性问题': 'driving_question',
            '核心问题': 'driving_question',
            '学习目标': 'objectives',
            '学习活动': 'activities',
            '活动设计': 'activities',
            '评估方案': 'assessment',
            '评价方案': 'assessment',
            '资源清单': 'resources',
            '所需资源': 'resources',
            '时间线': 'timeline',
            '项目进度': 'timeline'
        }
        
        for key, value in mapping.items():
            if key in text:
                return value
        
        return 'other'
    
    def _save_section(self, case, section_name, content_lines):
        """保存章节内容到对应字段"""
        content_text = '\n'.join(content_lines)
        
        if section_name == 'overview':
            case['structured']['projectOverview'] = self._parse_overview(content_text)
        
        elif section_name == 'driving_question':
            case['structured']['drivingQuestion'] = self._parse_driving_question(content_text)
        
        elif section_name == 'activities':
            case['structured']['activities'] = self._parse_activities(content_text)
        
        elif section_name == 'assessment':
            case['structured']['assessment'] = self._parse_assessment(content_text)
        
        elif section_name == 'resources':
            case['structured']['resources'] = self._parse_resources(content_text)
        
        elif section_name == 'objectives':
            case['structured']['learningObjectives'] = self._parse_objectives(content_text)
        
        return case
    
    def _parse_overview(self, text):
        """解析项目概述"""
        overview = {}
        
        # 提取项目名称
        name_match = re.search(r'项目名称[：:]\s*(.+)', text)
        if name_match:
            overview['projectName'] = name_match.group(1).strip()
        
        # 提取年级
        grade_match = re.search(r'年级[：:]\s*([一二三四五六\d]+)年级', text)
        if grade_match:
            grade_map = {'一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6}
            grade_str = grade_match.group(1)
            overview['grade'] = grade_map.get(grade_str, int(grade_str) if grade_str.isdigit() else 0)
        
        # 提取学科
        subjects_match = re.search(r'学科[：:]\s*(.+)', text)
        if subjects_match:
            subjects_str = subjects_match.group(1).strip()
            overview['subjects'] = [s.strip() for s in re.split(r'[、，,]', subjects_str)]
        
        # 提取时长
        duration_match = re.search(r'时长[：:]\s*(.+)', text)
        if duration_match:
            overview['duration'] = duration_match.group(1).strip()
        
        # 提取描述
        overview['description'] = text
        
        return overview
    
    def _parse_driving_question(self, text):
        """解析驱动性问题"""
        result = {'core': '', 'sub': []}
        
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # 识别核心问题
            if '核心问题' in line or line.startswith('**核心'):
                # 提取问号后面的内容
                match = re.search(r'[：:](.+)', line)
                if match:
                    result['core'] = match.group(1).strip()
            
            # 识别子问题（以数字或序号开头）
            elif re.match(r'^[\d①②③④⑤⑥⑦⑧⑨]+[、\.\)]', line):
                # 去除序号
                question = re.sub(r'^[\d①②③④⑤⑥⑦⑧⑨]+[、\.\)]\s*', '', line)
                result['sub'].append(question.strip())
        
        # 如果没有明确标注核心问题，取第一个问号结尾的句子
        if not result['core']:
            for line in lines:
                if '？' in line or '?' in line:
                    result['core'] = line.strip()
                    break
        
        return result
    
    def _parse_activities(self, text):
        """解析学习活动"""
        activities = []
        
        # 按阶段分割
        stages = re.split(r'阶段[一二三四五\d]+[：:]|第[一二三四五\d]+阶段', text)
        
        stage_num = 1
        for stage_text in stages[1:]:  # 跳过第一个空分割
            activity = {
                'stage': stage_num,
                'name': '',
                'duration': '',
                'objectives': '',
                'mainActivities': '',
                'outcomes': ''
            }
            
            # 提取阶段名称
            name_match = re.search(r'(.+?)\s*（', stage_text)
            if name_match:
                activity['name'] = name_match.group(1).strip()
            
            # 提取时长
            duration_match = re.search(r'（(.+?周|.+?课时)', stage_text)
            if duration_match:
                activity['duration'] = duration_match.group(1).strip()
            
            # 提取目标
            obj_match = re.search(r'目标[：:]\s*(.+)', stage_text)
            if obj_match:
                activity['objectives'] = obj_match.group(1).strip()
            
            # 提取活动内容
            act_match = re.search(r'活动[：:]\s*(.+)', stage_text)
            if act_match:
                activity['mainActivities'] = act_match.group(1).strip()
            
            activities.append(activity)
            stage_num += 1
        
        return activities
    
    def _parse_assessment(self, text):
        """解析评估方案"""
        assessment = {
            'formative': [],
            'summative': []
        }
        
        # 简单提取，实际可以更复杂
        if '形成性' in text:
            assessment['formative'] = [
                {'method': '学习日志', 'frequency': '每周'},
                {'method': '观察记录', 'frequency': '每次'}
            ]
        
        if '总结性' in text or '权重' in text:
            assessment['summative'] = [
                {'content': '知识掌握', 'weight': '40%'},
                {'content': '能力发展', 'weight': '30%'},
                {'content': '态度与价值观', 'weight': '30%'}
            ]
        
        return assessment
    
    def _parse_resources(self, text):
        """解析资源清单"""
        resources = {
            'materials': [],
            'technology': [],
            'human': [],
            'venue': []
        }
        
        lines = text.split('\n')
        current_type = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # 识别资源类型
            if '材料' in line:
                current_type = 'materials'
            elif '技术' in line or '设备' in line:
                current_type = 'technology'
            elif '人力' in line or '专家' in line:
                current_type = 'human'
            elif '场地' in line:
                current_type = 'venue'
            elif current_type and (line.startswith('-') or line.startswith('•')):
                # 提取列表项
                item = re.sub(r'^[-•]\s*', '', line)
                resources[current_type].append(item)
        
        return resources
    
    def _parse_objectives(self, text):
        """解析学习目标"""
        objectives = {
            'knowledge': {},
            'ability': [],
            'competency': []
        }
        
        # 简化处理
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        objectives['ability'] = lines[:5] if len(lines) > 5 else lines
        
        return objectives
    
    def _extract_metadata(self, case):
        """提取元数据"""
        # 从overview中提取到顶层
        overview = case['structured'].get('projectOverview', {})
        
        case['title'] = overview.get('projectName', '未命名项目')
        case['grade'] = overview.get('grade', 0)
        case['subjects'] = overview.get('subjects', [])
        case['duration'] = overview.get('duration', '')
        
        # 推断主题
        case['theme'] = self._infer_theme(case['title'], case['fullContent'])
        
        return case
    
    def _infer_theme(self, title, content):
        """推断主题"""
        theme_keywords = {
            '环保': ['环保', '垃圾', '节能', '绿色', '生态'],
            '科技': ['科技', '创新', '发明', '机器人', '编程'],
            '传统文化': ['传统', '文化', '节日', '非遗', '民俗'],
            '健康': ['健康', '运动', '营养', '饮食'],
            '安全': ['安全', '防护', '消防', '交通']
        }
        
        text = title + content
        
        for theme, keywords in theme_keywords.items():
            if any(kw in text for kw in keywords):
                return theme
        
        return '综合'


def batch_convert_word_to_json(word_dir, output_dir):
    """批量转换Word文档为JSON"""
    parser = PBLCaseParser()
    
    word_dir = Path(word_dir)
    output_dir = Path(output_dir)
    output_dir.mkdir(exist_ok=True)
    
    # 找到所有docx文件
    docx_files = list(word_dir.glob('*.docx'))
    
    print(f"找到 {len(docx_files)} 个Word文档")
    
    all_cases = []
    
    for i, docx_file in enumerate(docx_files, 1):
        print(f"\n[{i}/{len(docx_files)}] 解析: {docx_file.name}")
        
        try:
            case = parser.parse_word_document(docx_file)
            
            # 添加ID
            case['_id'] = f"case_{i:03d}"
            
            # 保存单个JSON
            output_file = output_dir / f"{docx_file.stem}.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(case, f, ensure_ascii=False, indent=2)
            
            print(f"  ✓ 已保存: {output_file.name}")
            print(f"    标题: {case['title']}")
            print(f"    年级: {case['grade']}年级")
            print(f"    主题: {case['theme']}")
            
            all_cases.append(case)
            
        except Exception as e:
            print(f"  ✗ 解析失败: {e}")
            continue
    
    # 保存合并的JSON
    all_cases_file = output_dir / 'all_cases.json'
    with open(all_cases_file, 'w', encoding='utf-8') as f:
        json.dump(all_cases, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ 全部完成！共转换 {len(all_cases)} 个案例")
    print(f"  合并文件: {all_cases_file}")
    
    return all_cases


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) < 2:
        print("用法: python parse_word_to_json.py <Word文档目录> [输出目录]")
        print("示例: python parse_word_to_json.py ./word_cases ./json_output")
        sys.exit(1)
    
    word_directory = sys.argv[1]
    output_directory = sys.argv[2] if len(sys.argv) > 2 else './json_output'
    
    batch_convert_word_to_json(word_directory, output_directory)
```

### 步骤2：安装依赖

```bash
pip install python-docx
```

### 步骤3：运行转换

```bash
# 转换所有Word文档
python scripts/parse_word_to_json.py ./word_cases ./json_output

# 输出：
# - json_output/案例1.json
# - json_output/案例2.json
# - json_output/all_cases.json（合并文件）
```

### 步骤4：导入到云数据库

创建 `scripts/import_to_cloud.js`：

```javascript
// Node.js脚本，在本地运行
const cloud = require('wx-server-sdk');
const fs = require('fs');
const path = require('path');

cloud.init({
  env: 'your-env-id'  // 替换为你的环境ID
});

const db = cloud.database();

async function importCases() {
  // 读取JSON文件
  const jsonFile = path.join(__dirname, '../json_output/all_cases.json');
  const casesData = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
  
  console.log(`准备导入 ${casesData.length} 个案例...`);
  
  for (const caseData of casesData) {
    try {
      // 检查是否已存在
      const existing = await db.collection('pbl_cases')
        .where({ title: caseData.title })
        .get();
      
      if (existing.data.length > 0) {
        console.log(`跳过已存在的案例: ${caseData.title}`);
        continue;
      }
      
      // 添加到数据库
      await db.collection('pbl_cases').add({
        data: {
          ...caseData,
          createdAt: new Date(),
          metadata: {
            ...caseData.metadata,
            importedAt: new Date(),
            source: 'word_document'
          }
        }
      });
      
      console.log(`✓ 已导入: ${caseData.title}`);
      
    } catch (error) {
      console.error(`✗ 导入失败 ${caseData.title}:`, error);
    }
  }
  
  console.log('\n导入完成！');
}

// 运行
importCases().catch(console.error);
```

运行导入：

```bash
node scripts/import_to_cloud.js
```

---

## 🔄 方案B：在线转换（小程序管理后台）

如果您想在小程序管理后台上传Word并自动解析：

### 前端上传界面

```javascript
// pages/admin/import-cases/import-cases.js
Page({
  data: {
    uploading: false
  },
  
  // 选择Word文件
  async chooseWordFile() {
    const res = await wx.chooseMessageFile({
      count: 10,
      type: 'file',
      extension: ['docx', 'doc']
    });
    
    this.uploadAndParse(res.tempFiles);
  },
  
  // 上传并解析
  async uploadAndParse(files) {
    wx.showLoading({ title: '上传中...' });
    
    for (const file of files) {
      try {
        // 1. 上传到云存储
        const uploadResult = await wx.cloud.uploadFile({
          cloudPath: `word_cases/${Date.now()}_${file.name}`,
          filePath: file.path
        });
        
        // 2. 调用云函数解析
        const parseResult = await wx.cloud.callFunction({
          name: 'admin',
          data: {
            action: 'parseWordCase',
            fileID: uploadResult.fileID
          }
        });
        
        if (parseResult.result.success) {
          console.log('解析成功:', parseResult.result.data.title);
        }
        
      } catch (error) {
        console.error('处理失败:', error);
      }
    }
    
    wx.hideLoading();
    wx.showToast({ title: '导入完成', icon: 'success' });
  }
});
```

### 云函数解析（需要容器环境）

由于小程序云函数不能直接解析Word，需要：
1. 使用云托管服务（支持Python环境）
2. 或者使用在线Word转换API

---

## 📚 数据库查询示例

导入后的使用：

```javascript
// 查询案例
const db = wx.cloud.database();

// 1. 按主题查询
const envCases = await db.collection('pbl_cases')
  .where({
    theme: '环保',
    grade: 3
  })
  .get();

// 2. 按学科查询
const scienceCases = await db.collection('pbl_cases')
  .where({
    subjects: db.command.all(['科学', '数学'])
  })
  .get();

// 3. 全文检索（需要建索引）
const searchResult = await db.collection('pbl_cases')
  .where({
    fullContent: db.RegExp({
      regexp: '垃圾分类',
      options: 'i'
    })
  })
  .get();

// 4. 用于RAG生成时的检索
async function findReferenceCases(theme, grade) {
  const result = await db.collection('pbl_cases')
    .where({
      theme: db.RegExp({
        regexp: theme,
        options: 'i'
      }),
      grade: grade
    })
    .field({
      title: true,
      'structured.drivingQuestion': true,
      'structured.activities': true
    })
    .limit(5)
    .get();
  
  return result.data;
}
```

---

## 💡 最佳实践建议

### 1. 标准化Word文档格式

建议您的Word文档遵循统一模板：

```
项目名称
年级：X年级
学科：XX、XX、XX
时长：X周

一、项目概述
...

二、驱动性问题
核心问题：...
子问题：
1. ...
2. ...

三、学习活动
阶段一：...
阶段二：...

四、评估方案
...

五、资源清单
...
```

这样解析脚本可以更准确地提取内容。

### 2. 两步导入策略

```
第1步：快速导入
  - 只提取关键字段（标题、年级、主题）
  - 全文存入 fullContent
  - 先让系统可用

第2步：精细化
  - 逐步完善结构化字段
  - 人工审核和补充
  - 提高数据质量
```

### 3. 保留原始文件

```javascript
{
  "structured": {...},  // 结构化数据
  "fullContent": "...", // 全文
  "originalDoc": {      // 原始文档
    "fileID": "cloud://xxx.docx",
    "fileName": "案例1.docx"
  }
}
```

这样老师可以下载原始Word查看完整格式。

---

## 🎯 总结

### 推荐流程：

```
1. 整理Word文档 (统一格式)
   ↓
2. 运行Python解析脚本
   ↓
3. 生成JSON文件
   ↓
4. 导入云数据库
   ↓
5. 在小程序中使用
```

### 核心要点：

✅ **云数据库只支持JSON格式**，不直接支持Word  
✅ **需要转换步骤**：Word → 解析 → JSON → 数据库  
✅ **保留原始文件**：上传到云存储，数据库记录fileID  
✅ **结构化 + 全文**：既要结构化字段便于查询，也要全文便于检索  
✅ **RAG使用**：结构化数据用于精确匹配，全文用于语义检索  

---

需要我帮您：
1. 调整解析脚本以适应您的Word格式？
2. 创建Word标准模板？
3. 设计更详细的数据库结构？
