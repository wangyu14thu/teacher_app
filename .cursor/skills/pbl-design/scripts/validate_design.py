#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PBL设计方案质量验证工具

检查设计方案是否完整、合理、符合标准
"""

import json
import sys
try:
    from typing import Dict, List, Tuple
except ImportError:
    # Python 2 compatibility
    Dict = dict
    List = list
    Tuple = tuple


class PBLDesignValidator:
    """PBL设计质量验证器"""
    
    def __init__(self):
        self.issues = []
        self.warnings = []
        self.suggestions = []
    
    def validate(self, design_content):
        """
        验证设计内容
        
        参数:
            design_content: 设计内容字典
        
        返回: (是否通过, 错误列表, 警告列表, 建议列表)
        """
        self.issues = []
        self.warnings = []
        self.suggestions = []
        
        # 必填项检查
        self._check_required_fields(design_content)
        
        # 学习目标检查
        self._check_learning_objectives(design_content.get('learning_objectives', {}))
        
        # 驱动性问题检查
        self._check_driving_questions(design_content.get('driving_questions', {}))
        
        # 活动设计检查
        self._check_activities(design_content.get('learning_activities', {}))
        
        # 评估方案检查
        self._check_assessment(design_content.get('assessment', {}))
        
        # 时间安排检查
        self._check_timeline(design_content.get('timeline', {}))
        
        # 学科融合检查
        self._check_subject_integration(design_content)
        
        is_valid = len(self.issues) == 0
        return is_valid, self.issues, self.warnings, self.suggestions
    
    def _check_required_fields(self, content):
        """检查必填字段"""
        required_sections = [
            ('project_info', '项目基本信息'),
            ('project_basis', '项目依据'),
            ('learning_objectives', '学习目标'),
            ('driving_questions', '驱动性问题'),
            ('learning_activities', '学习活动'),
            ('assessment', '评估方案'),
            ('resources', '资源清单'),
            ('timeline', '时间线')
        ]
        
        for key, name in required_sections:
            if key not in content or not content[key]:
                self.issues.append(f"缺少必填部分：{name}")
        
        # 检查项目基本信息
        project_info = content.get('project_info', {})
        required_info = ['project_name', 'grade', 'subjects', 'duration']
        
        for field in required_info:
            if field not in project_info or not project_info[field]:
                self.issues.append(f"项目信息缺少：{field}")
    
    def _check_learning_objectives(self, objectives):
        """检查学习目标"""
        if not objectives:
            return
        
        # 检查是否有学科知识目标
        knowledge_goals = objectives.get('knowledge_goals', {})
        if not knowledge_goals:
            self.issues.append("缺少学科知识目标")
        else:
            # 检查每个学科是否有具体目标
            for subject, goals in knowledge_goals.items():
                if not goals or len(goals) == 0:
                    self.warnings.append(f"{subject}学科缺少具体学习目标")
                elif len(goals) < 2:
                    self.suggestions.append(f"{subject}学科建议设置2-4个具体目标")
        
        # 检查能力目标
        ability_goals = objectives.get('ability_goals', [])
        if not ability_goals:
            self.issues.append("缺少跨学科能力目标")
        
        # 检查核心素养目标
        competency_goals = objectives.get('competency_goals', [])
        if not competency_goals:
            self.warnings.append("建议明确核心素养发展目标")
        
        # SMART原则检查
        self._check_smart_objectives(objectives)
    
    def _check_smart_objectives(self, objectives):
        """检查目标是否符合SMART原则"""
        # 简单检查：目标中是否包含可测量的动词
        measurable_verbs = [
            '能够', '掌握', '理解', '应用', '分析', '设计', '创作', 
            '解决', '制作', '完成', '达到', '提高', '评估'
        ]
        
        all_goals = []
        knowledge_goals = objectives.get('knowledge_goals', {})
        for goals in knowledge_goals.values():
            all_goals.extend(goals)
        all_goals.extend(objectives.get('ability_goals', []))
        
        vague_goals = []
        for goal in all_goals:
            if not any(verb in goal for verb in measurable_verbs):
                vague_goals.append(goal)
        
        if vague_goals:
            self.suggestions.append(
                f"以下目标可能不够具体可测量，建议使用明确的行为动词：\n" +
                "\n".join(f"  - {goal}" for goal in vague_goals[:3])
            )
    
    def _check_driving_questions(self, questions):
        """检查驱动性问题"""
        if not questions:
            self.issues.append("缺少驱动性问题")
            return
        
        # 检查核心问题
        core_question = questions.get('core', '')
        if not core_question or core_question == '[核心驱动性问题]':
            self.issues.append("缺少核心驱动性问题")
        else:
            # 检查问题质量
            self._check_question_quality(core_question, '核心问题')
        
        # 检查子问题
        sub_questions = questions.get('sub_questions', [])
        if not sub_questions or len(sub_questions) == 0:
            self.warnings.append("建议设置2-5个子问题，引导探究过程")
        elif len(sub_questions) > 6:
            self.warnings.append(f"子问题过多（{len(sub_questions)}个），建议控制在2-5个")
    
    def _check_question_quality(self, question, question_type):
        """检查问题质量"""
        # 检查是否是开放性问题
        closed_starters = ['什么是', '是不是', '对不对', '有没有', '是否']
        if any(question.startswith(starter) for starter in closed_starters):
            self.warnings.append(
                f"{question_type}可能是封闭式问题，建议改为开放性问题（如：如何、怎样、什么样）"
            )
        
        # 检查问题长度
        if len(question) < 10:
            self.warnings.append(f"{question_type}可能过于简单")
        elif len(question) > 100:
            self.warnings.append(f"{question_type}可能过于复杂，建议精炼")
        
        # 检查是否包含行动导向词
        action_words = ['如何', '怎样', '设计', '制作', '策划', '解决', '创造']
        if not any(word in question for word in action_words):
            self.suggestions.append(
                f"{question_type}建议包含行动导向词（如：如何、怎样设计、如何解决）"
            )
    
    def _check_activities(self, activities):
        """检查学习活动"""
        activity_list = activities.get('activities', [])
        
        if not activity_list or len(activity_list) == 0:
            self.issues.append("缺少学习活动设计")
            return
        
        # 检查活动数量
        if len(activity_list) < 3:
            self.warnings.append("活动阶段较少，建议3-5个阶段")
        elif len(activity_list) > 6:
            self.warnings.append(f"活动阶段过多（{len(activity_list)}个），可能导致时间管理困难")
        
        # 检查每个活动的完整性
        for i, activity in enumerate(activity_list, 1):
            required_fields = ['name', 'objectives', 'main_activities', 'outcomes']
            missing = [f for f in required_fields if not activity.get(f)]
            
            if missing:
                self.warnings.append(
                    f"阶段{i}（{activity.get('name', '未命名')}）缺少：{', '.join(missing)}"
                )
            
            # 检查学科融合
            if 'subject_integration' not in activity or not activity['subject_integration']:
                self.warnings.append(f"阶段{i}未明确学科融合点")
    
    def _check_assessment(self, assessment):
        """检查评估方案"""
        # 检查形成性评估
        formative = assessment.get('formative_assessment', [])
        if not formative:
            self.warnings.append("建议增加形成性评估方式")
        
        # 检查总结性评估
        summative = assessment.get('summative_assessment', [])
        if not summative:
            self.issues.append("缺少总结性评估方案")
        else:
            # 检查权重总和
            total_weight = 0
            for item in summative:
                weight_str = item.get('weight', '0%')
                try:
                    weight = int(weight_str.replace('%', ''))
                    total_weight += weight
                except:
                    pass
            
            if total_weight > 0 and total_weight != 100:
                self.warnings.append(
                    f"评估权重总和为{total_weight}%，应该等于100%"
                )
        
        # 检查评估多样性
        if len(formative) + len(summative) < 3:
            self.suggestions.append("建议采用多元化评估方式（自评、互评、师评等）")
    
    def _check_timeline(self, timeline):
        """检查时间安排"""
        timeline_list = timeline.get('timeline', [])
        
        if not timeline_list:
            self.warnings.append("建议制定详细的时间线")
            return
        
        # 检查时间分配合理性
        if len(timeline_list) < 3:
            self.suggestions.append("时间规划较粗略，建议细化")
        
        # 检查是否每个阶段都有明确任务和成果
        for i, item in enumerate(timeline_list, 1):
            if not item.get('tasks'):
                self.warnings.append(f"时间线第{i}项缺少具体任务")
            if not item.get('outcomes'):
                self.warnings.append(f"时间线第{i}项缺少预期成果")
    
    def _check_subject_integration(self, content):
        """检查学科融合"""
        # 获取声明的学科
        declared_subjects = content.get('project_info', {}).get('subjects', '')
        if not declared_subjects:
            return
        
        # 统计在学习目标中出现的学科
        objectives = content.get('learning_objectives', {})
        knowledge_goals = objectives.get('knowledge_goals', {})
        objective_subjects = set(knowledge_goals.keys())
        
        # 统计在活动中出现的学科
        activities = content.get('learning_activities', {}).get('activities', [])
        activity_subjects = set()
        for activity in activities:
            integration = activity.get('subject_integration', {})
            activity_subjects.update(integration.keys())
        
        # 检查一致性
        if len(objective_subjects) < 2:
            self.warnings.append("跨学科项目应至少整合2个学科的知识目标")
        
        # 检查学科是否在活动中得到体现
        missing_in_activities = objective_subjects - activity_subjects
        if missing_in_activities:
            self.warnings.append(
                f"以下学科在学习目标中出现但在活动中未充分体现：{', '.join(missing_in_activities)}"
            )


def print_validation_report(is_valid, issues, warnings, suggestions):
    """打印验证报告"""
    print("\n" + "="*60)
    print("PBL设计方案质量验证报告")
    print("="*60)
    
    if is_valid:
        print("\n✓ 验证通过：设计方案符合基本要求")
    else:
        print("\n✗ 验证失败：发现严重问题")
    
    if issues:
        print("\n【严重问题】必须修复：")
        for i, issue in enumerate(issues, 1):
            print(f"  {i}. {issue}")
    
    if warnings:
        print("\n【警告】建议改进：")
        for i, warning in enumerate(warnings, 1):
            print(f"  {i}. {warning}")
    
    if suggestions:
        print("\n【建议】优化方向：")
        for i, suggestion in enumerate(suggestions, 1):
            print(f"  {i}. {suggestion}")
    
    if not issues and not warnings and not suggestions:
        print("\n✓ 优秀！未发现任何问题。")
    
    print("\n" + "="*60)
    
    # 质量评分
    score = 100
    score -= len(issues) * 20
    score -= len(warnings) * 5
    score -= len(suggestions) * 2
    score = max(0, score)
    
    print(f"\n质量评分：{score}/100")
    
    if score >= 90:
        print("等级：优秀 ⭐⭐⭐⭐⭐")
    elif score >= 80:
        print("等级：良好 ⭐⭐⭐⭐")
    elif score >= 70:
        print("等级：合格 ⭐⭐⭐")
    elif score >= 60:
        print("等级：需改进 ⭐⭐")
    else:
        print("等级：待完善 ⭐")
    
    print()


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='验证PBL设计方案质量'
    )
    parser.add_argument(
        '--input', '-i',
        help='输入JSON文件路径（可选，如不提供则提示输入）'
    )
    
    args = parser.parse_args()
    
    # 示例内容（实际使用时由AI助手提供）
    example_content = {
        'project_info': {
            'project_name': '校园垃圾分类大作战',
            'grade': '三年级',
            'subjects': '科学、数学、美术、语文',
            'duration': '4周'
        },
        'project_basis': {
            'real_world_context': '学校推行垃圾分类政策',
            'curriculum_standards': {
                '科学': ['认识材料', '了解环境保护'],
                '数学': ['数据收集与统计']
            },
            'student_analysis': '三年级学生对环保有初步认识'
        },
        'learning_objectives': {
            'knowledge_goals': {
                '科学': ['理解垃圾分类的原理', '掌握不同材料的特性'],
                '数学': ['能够收集和整理数据', '会制作统计图表']
            },
            'ability_goals': [
                '培养问题解决能力',
                '提高数据分析能力'
            ],
            'competency_goals': [
                '批判性思维：能够分析垃圾分类存在的问题',
                '创造力：设计创新的分类标识'
            ]
        },
        'driving_questions': {
            'core': '我们如何让校园垃圾分类变得更容易、更有趣？',
            'sub_questions': [
                '现在学校垃圾分类存在什么问题？',
                '垃圾应该如何正确分类？',
                '怎样设计让同学们一看就懂的分类标识？'
            ]
        },
        'learning_activities': {
            'activities': [
                {
                    'name': '问题发现',
                    'duration': '1周',
                    'objectives': '发现校园垃圾分类问题',
                    'main_activities': '观察、采访、统计',
                    'subject_integration': {
                        '科学': '垃圾分类知识',
                        '数学': '数据统计',
                        '语文': '采访记录'
                    },
                    'outcomes': '问题调查报告'
                }
            ]
        },
        'assessment': {
            'formative_assessment': [
                {'method': '学习日志', 'frequency': '每周', 'focus': '反思'}
            ],
            'summative_assessment': [
                {'content': '科学知识', 'weight': '30%', 'criteria': '掌握分类原理'},
                {'content': '数据分析', 'weight': '20%', 'criteria': '准确统计'},
                {'content': '创意设计', 'weight': '20%', 'criteria': '标识创新性'},
                {'content': '团队合作', 'weight': '30%', 'criteria': '协作表现'}
            ]
        },
        'resources': {
            'materials': ['垃圾样品', '统计表格'],
            'technology': ['平板电脑', '相机']
        },
        'timeline': {
            'timeline': [
                {'week': '第1周', 'stage': '问题发现', 'tasks': '调查', 'outcomes': '报告'},
                {'week': '第2周', 'stage': '知识探究', 'tasks': '学习', 'outcomes': '手册'}
            ]
        }
    }
    
    # 加载内容
    if args.input:
        try:
            with open(args.input, 'r', encoding='utf-8') as f:
                content = json.load(f)
        except Exception as e:
            print(f"无法读取文件：{e}")
            sys.exit(1)
    else:
        content = example_content
        print("提示：使用示例内容进行验证")
        print("实际使用时，AI助手会提供完整的设计内容进行验证\n")
    
    # 验证
    validator = PBLDesignValidator()
    is_valid, issues, warnings, suggestions = validator.validate(content)
    
    # 打印报告
    print_validation_report(is_valid, issues, warnings, suggestions)
    
    # 返回状态码
    sys.exit(0 if is_valid else 1)


if __name__ == '__main__':
    main()
