#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Word文档解析脚本
将PBL项目案例Word文档转换为JSON格式，用于导入云数据库

依赖：pip install python-docx

用法：
    python parse_word_to_json.py <Word文档目录> [输出目录]
    
示例：
    python parse_word_to_json.py ./word_cases ./json_output
"""

from docx import Document
import json
import re
from pathlib import Path
from datetime import datetime


class PBLCaseParser:
    """PBL案例解析器"""
    
    def __init__(self):
        self.section_patterns = {
            '项目概述': ['项目概述', '项目基本信息', '基本信息', 'Overview'],
            '驱动性问题': ['驱动性问题', '核心问题', 'Driving Question'],
            '学习目标': ['学习目标', '目标', 'Learning Objectives'],
            '学习活动': ['学习活动', '活动设计', 'Activities'],
            '评估方案': ['评估方案', '评价方案', '评估', 'Assessment'],
            '资源清单': ['资源清单', '所需资源', '资源', 'Resources'],
            '时间线': ['时间线', '项目进度', 'Timeline'],
            '差异化': ['差异化', '差异化教学', 'Differentiation'],
            '实施建议': ['实施建议', '建议', 'Implementation']
        }
        
    def parse_document(self, docx_path):
        """解析单个Word文档"""
        print(f"\n{'='*60}")
        print(f"解析文档: {Path(docx_path).name}")
        print(f"{'='*60}")
        
        doc = Document(docx_path)
        
        # 初始化案例结构
        case = self._init_case_structure()
        
        # 提取内容
        case = self._extract_content(doc, case)
        
        # 提取元数据
        case = self._extract_metadata(case)
        
        # 打印摘要
        self._print_summary(case)
        
        return case
    
    def _init_case_structure(self):
        """初始化案例数据结构"""
        return {
            "title": "",
            "theme": "",
            "grade": 0,
            "subjects": [],
            "duration": "",
            "structured": {
                "projectOverview": {},
                "projectBasis": {},
                "drivingQuestion": {"core": "", "sub": []},
                "learningObjectives": {},
                "activities": [],
                "assessment": {},
                "resources": {},
                "timeline": [],
                "differentiation": {},
                "implementation": {}
            },
            "fullContent": "",
            "originalFileName": "",
            "metadata": {
                "parsedAt": datetime.now().isoformat(),
                "quality": "pending_review"
            }
        }
    
    def _extract_content(self, doc, case):
        """提取文档内容"""
        current_section = None
        section_content = []
        
        for para in doc.paragraphs:
            text = para.text.strip()
            
            if not text:
                continue
            
            # 累加全文
            case['fullContent'] += text + '\n'
            
            # 检测是否是章节标题
            detected_section = self._detect_section(text, para.style.name)
            
            if detected_section:
                # 保存上一章节
                if current_section:
                    case = self._save_section_content(
                        case, current_section, section_content
                    )
                
                # 开始新章节
                current_section = detected_section
                section_content = []
                print(f"  检测到章节: {current_section}")
            else:
                # 加入当前章节内容
                section_content.append(text)
        
        # 保存最后一个章节
        if current_section:
            case = self._save_section_content(
                case, current_section, section_content
            )
        
        return case
    
    def _detect_section(self, text, style_name):
        """检测章节类型"""
        # 如果是标题样式
        if 'Heading' in style_name:
            # 去除编号
            cleaned_text = re.sub(
                r'^[一二三四五六七八九十\d]+[、\.\s]*', 
                '', 
                text
            )
            
            # 匹配章节模式
            for section_name, patterns in self.section_patterns.items():
                if any(pattern in cleaned_text for pattern in patterns):
                    return section_name
        
        return None
    
    def _save_section_content(self, case, section_name, content_lines):
        """保存章节内容"""
        content_text = '\n'.join(content_lines)
        
        parsers = {
            '项目概述': self._parse_overview,
            '驱动性问题': self._parse_driving_question,
            '学习目标': self._parse_objectives,
            '学习活动': self._parse_activities,
            '评估方案': self._parse_assessment,
            '资源清单': self._parse_resources,
            '时间线': self._parse_timeline,
            '差异化': self._parse_differentiation,
            '实施建议': self._parse_implementation
        }
        
        parser = parsers.get(section_name)
        if parser:
            result = parser(content_text)
            # 保存到对应字段
            field_map = {
                '项目概述': 'projectOverview',
                '驱动性问题': 'drivingQuestion',
                '学习目标': 'learningObjectives',
                '学习活动': 'activities',
                '评估方案': 'assessment',
                '资源清单': 'resources',
                '时间线': 'timeline',
                '差异化': 'differentiation',
                '实施建议': 'implementation'
            }
            field_name = field_map.get(section_name)
            if field_name:
                case['structured'][field_name] = result
        
        return case
    
    def _parse_overview(self, text):
        """解析项目概述"""
        overview = {
            'projectName': '',
            'grade': 0,
            'subjects': [],
            'duration': '',
            'description': text
        }
        
        # 提取项目名称
        patterns = [
            r'项目名称[：:]\s*[《」"]?([^《」"\n]+)',
            r'名称[：:]\s*[《」"]?([^《」"\n]+)'
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                overview['projectName'] = match.group(1).strip()
                break
        
        # 提取年级
        grade_match = re.search(
            r'年级[：:]\s*([一二三四五六1-6])年级',
            text
        )
        if grade_match:
            grade_map = {'一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6}
            grade_str = grade_match.group(1)
            overview['grade'] = grade_map.get(grade_str, int(grade_str) if grade_str.isdigit() else 0)
        
        # 提取学科
        subjects_match = re.search(
            r'学科[：:]\s*([^\n]+)',
            text
        )
        if subjects_match:
            subjects_str = subjects_match.group(1).strip()
            overview['subjects'] = [
                s.strip() 
                for s in re.split(r'[、，,\s]+', subjects_str)
                if s.strip()
            ]
        
        # 提取时长
        duration_match = re.search(
            r'时长[：:]\s*([^\n]+)',
            text
        )
        if duration_match:
            overview['duration'] = duration_match.group(1).strip()
        
        return overview
    
    def _parse_driving_question(self, text):
        """解析驱动性问题"""
        result = {'core': '', 'sub': []}
        
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        
        for line in lines:
            # 核心问题
            if '核心问题' in line or '主要问题' in line:
                match = re.search(r'[：:](.+)', line)
                if match:
                    result['core'] = match.group(1).strip()
            
            # 子问题（带序号）
            elif re.match(r'^[\d①②③④⑤⑥⑦⑧⑨]+[、\.\)：:]', line):
                question = re.sub(
                    r'^[\d①②③④⑤⑥⑦⑧⑨]+[、\.\)：:]\s*',
                    '',
                    line
                )
                result['sub'].append(question.strip())
        
        # 如果没找到核心问题，取第一个问号结尾的
        if not result['core']:
            for line in lines:
                if '？' in line or '?' in line:
                    result['core'] = line.strip()
                    break
        
        return result
    
    def _parse_objectives(self, text):
        """解析学习目标"""
        objectives = {
            'knowledge': {},
            'ability': [],
            'competency': []
        }
        
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        
        current_category = None
        
        for line in lines:
            # 检测类别
            if '知识' in line and '目标' in line:
                current_category = 'knowledge'
                continue
            elif '能力' in line and '目标' in line:
                current_category = 'ability'
                continue
            elif '素养' in line or '核心素养' in line:
                current_category = 'competency'
                continue
            
            # 提取目标内容
            if current_category == 'ability':
                if re.match(r'^[-•\d]', line):
                    objectives['ability'].append(
                        re.sub(r'^[-•\d]+[、\.\)：:]\s*', '', line)
                    )
            elif current_category == 'competency':
                if re.match(r'^[-•\d]', line):
                    objectives['competency'].append(
                        re.sub(r'^[-•\d]+[、\.\)：:]\s*', '', line)
                    )
        
        return objectives
    
    def _parse_activities(self, text):
        """解析学习活动"""
        activities = []
        
        # 按阶段分割
        stage_splits = re.split(
            r'阶段[一二三四五\d]+[：:]|第[一二三四五\d]+阶段',
            text
        )
        
        stage_num = 1
        for stage_text in stage_splits[1:]:
            if not stage_text.strip():
                continue
            
            activity = {
                'stage': stage_num,
                'name': '',
                'duration': '',
                'objectives': '',
                'mainActivities': '',
                'outcomes': ''
            }
            
            # 提取阶段名称和时长
            name_match = re.search(r'^([^（\n]+)', stage_text.strip())
            if name_match:
                activity['name'] = name_match.group(1).strip()
            
            duration_match = re.search(r'（(.+?周|.+?课时)', stage_text)
            if duration_match:
                activity['duration'] = duration_match.group(1).strip()
            
            # 提取目标
            obj_match = re.search(r'目标[：:]\s*([^\n]+)', stage_text)
            if obj_match:
                activity['objectives'] = obj_match.group(1).strip()
            
            # 提取活动内容
            act_match = re.search(r'活动[：:]\s*([^\n]+)', stage_text)
            if act_match:
                activity['mainActivities'] = act_match.group(1).strip()
            
            # 提取成果
            out_match = re.search(r'成果[：:]\s*([^\n]+)', stage_text)
            if out_match:
                activity['outcomes'] = out_match.group(1).strip()
            
            activities.append(activity)
            stage_num += 1
        
        return activities
    
    def _parse_assessment(self, text):
        """解析评估方案"""
        return {
            'formative': [],
            'summative': [],
            'description': text
        }
    
    def _parse_resources(self, text):
        """解析资源清单"""
        resources = {
            'materials': [],
            'technology': [],
            'human': [],
            'venue': [],
            'description': text
        }
        
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        current_type = None
        
        for line in lines:
            # 检测资源类型
            if '材料' in line:
                current_type = 'materials'
            elif '技术' in line or '设备' in line:
                current_type = 'technology'
            elif '人力' in line or '专家' in line:
                current_type = 'human'
            elif '场地' in line:
                current_type = 'venue'
            elif current_type and re.match(r'^[-•\d]', line):
                item = re.sub(r'^[-•\d]+[、\.\)：:]\s*', '', line)
                resources[current_type].append(item)
        
        return resources
    
    def _parse_timeline(self, text):
        """解析时间线"""
        return []
    
    def _parse_differentiation(self, text):
        """解析差异化策略"""
        return {'description': text}
    
    def _parse_implementation(self, text):
        """解析实施建议"""
        return {'description': text}
    
    def _extract_metadata(self, case):
        """提取元数据到顶层"""
        overview = case['structured']['projectOverview']
        
        case['title'] = overview.get('projectName', '未命名项目')
        case['grade'] = overview.get('grade', 0)
        case['subjects'] = overview.get('subjects', [])
        case['duration'] = overview.get('duration', '')
        
        # 推断主题
        case['theme'] = self._infer_theme(
            case['title'],
            case['fullContent']
        )
        
        return case
    
    def _infer_theme(self, title, content):
        """推断主题"""
        theme_keywords = {
            '环保': ['环保', '垃圾', '节能', '绿色', '生态', '污染'],
            '科技': ['科技', '创新', '发明', '机器人', '编程', '技术'],
            '传统文化': ['传统', '文化', '节日', '非遗', '民俗', '习俗'],
            '健康': ['健康', '运动', '营养', '饮食', '身体'],
            '安全': ['安全', '防护', '消防', '交通', '应急'],
            '艺术': ['艺术', '音乐', '美术', '绘画', '表演'],
            '社会': ['社会', '社区', '公民', '责任', '服务']
        }
        
        text = (title + content).lower()
        
        for theme, keywords in theme_keywords.items():
            if any(kw in text for kw in keywords):
                return theme
        
        return '综合'
    
    def _print_summary(self, case):
        """打印解析摘要"""
        print(f"\n解析结果摘要:")
        print(f"  标题: {case['title']}")
        print(f"  年级: {case['grade']}年级")
        print(f"  主题: {case['theme']}")
        print(f"  学科: {', '.join(case['subjects'])}")
        print(f"  时长: {case['duration']}")
        
        dq = case['structured']['drivingQuestion']
        if dq['core']:
            print(f"  核心问题: {dq['core'][:50]}...")
        
        activities = case['structured']['activities']
        print(f"  学习活动: {len(activities)}个阶段")


def batch_convert(word_dir, output_dir):
    """批量转换Word文档"""
    word_dir = Path(word_dir)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # 查找所有docx文件
    docx_files = list(word_dir.glob('*.docx'))
    docx_files = [f for f in docx_files if not f.name.startswith('~')]
    
    print(f"\n找到 {len(docx_files)} 个Word文档\n")
    
    if not docx_files:
        print("错误：未找到Word文档")
        return []
    
    parser = PBLCaseParser()
    all_cases = []
    
    for i, docx_file in enumerate(docx_files, 1):
        print(f"\n[{i}/{len(docx_files)}] 处理: {docx_file.name}")
        
        try:
            case = parser.parse_document(docx_file)
            
            # 添加ID和原始文件名
            case['_id'] = f"case_{i:03d}"
            case['originalFileName'] = docx_file.name
            
            # 保存单个JSON
            output_file = output_dir / f"{docx_file.stem}.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(case, f, ensure_ascii=False, indent=2)
            
            print(f"  ✓ 已保存: {output_file.name}")
            
            all_cases.append(case)
            
        except Exception as e:
            print(f"  ✗ 解析失败: {e}")
            import traceback
            traceback.print_exc()
            continue
    
    # 保存合并的JSON
    if all_cases:
        all_cases_file = output_dir / 'all_cases.json'
        with open(all_cases_file, 'w', encoding='utf-8') as f:
            json.dump(all_cases, f, ensure_ascii=False, indent=2)
        
        print(f"\n{'='*60}")
        print(f"✓ 全部完成！")
        print(f"  成功转换: {len(all_cases)} 个案例")
        print(f"  输出目录: {output_dir.absolute()}")
        print(f"  合并文件: {all_cases_file.name}")
        print(f"{'='*60}\n")
    
    return all_cases


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) < 2:
        print("""
用法: python parse_word_to_json.py <Word文档目录> [输出目录]

示例:
    python parse_word_to_json.py ./word_cases ./json_output
    python parse_word_to_json.py ../案例文档 ../json结果

说明:
    - Word文档目录: 包含.docx文件的文件夹
    - 输出目录: JSON文件保存位置（默认：./json_output）
        """)
        sys.exit(1)
    
    word_directory = sys.argv[1]
    output_directory = sys.argv[2] if len(sys.argv) > 2 else './json_output'
    
    if not Path(word_directory).exists():
        print(f"错误：目录不存在: {word_directory}")
        sys.exit(1)
    
    batch_convert(word_directory, output_directory)
