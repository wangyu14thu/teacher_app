// cloudfunctions/school-application/index.js

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 学校申请云函数
 */
exports.main = async (event, context) => {
  const { action } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    switch (action) {
      case 'submitApplication':
        return await submitApplication(event, openid);
      
      case 'submitProject':
        return await submitProject(event, openid);
      
      case 'getMyApplication':
        return await getMyApplication(event, openid);
      
      case 'getMySchool':
        return await getMySchool(event, openid);
      
      default:
        return {
          success: false,
          message: '未知操作'
        };
    }
  } catch (error) {
    console.error('云函数执行错误:', error);
    return {
      success: false,
      message: error.message || '服务器错误'
    };
  }
};

/**
 * 提交学校申请
 */
async function submitApplication(event, openid) {
  const { schoolData } = event;

  if (!schoolData) {
    return {
      success: false,
      message: '申请数据不能为空'
    };
  }

  try {
    // 1. 检查是否已有待审核的申请
    const existingApp = await db.collection('schools_pending')
      .where({
        applicantOpenid: openid,
        status: 'pending'
      })
      .get();

    if (existingApp.data.length > 0) {
      return {
        success: false,
        message: '您有正在审核中的申请，请等待审核完成'
      };
    }

    // 2. 获取当前用户信息
    const teacherInfo = schoolData.teacherInfo || {};

    // 3. 自动分配审核员（简单轮询策略）
    const assignedReviewerId = await assignReviewer();

    // 4. 创建待审核记录
    const submitTime = new Date();
    const result = await db.collection('schools_pending').add({
      data: {
        // 学校信息
        schoolName: schoolData.schoolName,
        schoolAddress: schoolData.schoolAddress,
        schoolSize: schoolData.schoolSize || '',
        
        // 联系人信息
        contactName: schoolData.contactName,
        contactPhone: schoolData.contactPhone,
        position: schoolData.position,
        description: schoolData.description || '',
        
        // 申请人信息
        applicantOpenid: openid,
        applicantId: teacherInfo.userId || openid,
        applicantName: teacherInfo.nickname || schoolData.contactName,
        
        // 审核状态
        status: 'pending',
        assignedTo: assignedReviewerId,
        submitTime: submitTime,
        
        // 初始化审核相关字段
        reviewerId: '',
        reviewerName: '',
        reviewTime: null,
        opinions: {},
        inviteCode: ''
      }
    });

    // 5. 记录提交日志
    await db.collection('application_logs').add({
      data: {
        applicantOpenid: openid,
        applicationType: 'school',
        applicationId: result._id,
        action: 'submit',
        timestamp: submitTime
      }
    });

    console.log(`学校申请已创建: ${result._id}, 分配给审核员: ${assignedReviewerId}`);

    return {
      success: true,
      data: {
        applicationId: result._id,
        message: '申请提交成功'
      }
    };

  } catch (error) {
    console.error('提交学校申请错误:', error);
    return {
      success: false,
      message: '提交失败，请稍后重试'
    };
  }
}

/**
 * 获取我的申请状态
 */
async function getMyApplication(event, openid) {
  try {
    const result = await db.collection('schools_pending')
      .where({
        applicantOpenid: openid
      })
      .orderBy('submitTime', 'desc')
      .limit(1)
      .get();

    if (result.data.length === 0) {
      return {
        success: true,
        data: null
      };
    }

    return {
      success: true,
      data: result.data[0]
    };

  } catch (error) {
    console.error('获取申请状态错误:', error);
    return {
      success: false,
      message: '获取申请状态失败'
    };
  }
}

/**
 * 自动分配审核员
 * 简单策略：轮询分配给活跃的审核员
 */
async function assignReviewer() {
  try {
    // 获取所有活跃的审核员
    const reviewers = await db.collection('reviewers')
      .where({
        status: 'active'
      })
      .get();

    if (reviewers.data.length === 0) {
      console.warn('没有可用的审核员');
      return '';
    }

    // 获取每个审核员当前的待审核任务数
    const reviewerWorkloads = await Promise.all(
      reviewers.data.map(async (reviewer) => {
        const schoolCount = await db.collection('schools_pending')
          .where({
            assignedTo: reviewer._id,
            status: 'pending'
          })
          .count();

        const projectCount = await db.collection('projects_pending')
          .where({
            assignedTo: reviewer._id,
            status: 'pending'
          })
          .count();

        return {
          reviewerId: reviewer._id,
          totalTasks: schoolCount.total + projectCount.total
        };
      })
    );

    // 选择任务最少的审核员
    const selectedReviewer = reviewerWorkloads.reduce((min, current) => {
      return current.totalTasks < min.totalTasks ? current : min;
    });

    console.log(`分配给审核员: ${selectedReviewer.reviewerId}, 当前任务数: ${selectedReviewer.totalTasks}`);

    return selectedReviewer.reviewerId;

  } catch (error) {
    console.error('分配审核员错误:', error);
    // 如果分配失败，返回空字符串，后续可以手动分配
    return '';
  }
}

/**
 * 提交项目审核/评估申请
 */
async function submitProject(event, openid) {
  const { projectData } = event;

  if (!projectData) {
    return {
      success: false,
      message: '项目数据不能为空'
    };
  }

  try {
    const submitType = projectData.submitType; // 'evaluate' 或 'publish'
    const teacherInfo = projectData.teacherInfo || {};

    // 1. 自动分配审核员
    const assignedReviewerId = await assignReviewerByGrade(projectData.grade);

    // 2. 创建待审核项目记录
    const submitTime = new Date();
    const result = await db.collection('projects_pending').add({
      data: {
        // 项目基本信息
        projectName: projectData.projectName,
        subjects: projectData.subjects,
        grade: projectData.grade,
        classHours: projectData.classHours,
        projectOverview: projectData.projectOverview,
        
        // 立项依据
        realWorldBasis: projectData.realWorldBasis,
        curriculumBasis: projectData.curriculumBasis,
        studentBasis: projectData.studentBasis,
        
        // 跨学科概念与项目框架
        interdisciplinaryConcept: projectData.interdisciplinaryConcept,
        drivingQuestion: projectData.drivingQuestion,
        subQuestions: projectData.subQuestions,
        finalProduct: projectData.finalProduct,
        presentationForm: projectData.presentationForm,
        
        // 项目启动
        launchGoals: projectData.launchGoals,
        launchHours: projectData.launchHours,
        launchActivity: projectData.launchActivity,
        launchOutcome: projectData.launchOutcome,
        launchAssessment: projectData.launchAssessment,
        
        // 项目探究阶段
        inquiryPhases: projectData.inquiryPhases || [],
        
        // 项目目标
        projectGoals: projectData.projectGoals,
        
        // 提交人信息
        applicantOpenid: openid,
        applicantId: teacherInfo.userId || openid,
        applicantName: teacherInfo.nickname || '教师',
        
        // 提交类型：evaluate=申请评估, publish=发布项目
        submitType: submitType,
        
        // 审核状态
        status: 'pending',
        assignedTo: assignedReviewerId,
        submitTime: submitTime,
        
        // 初始化审核相关字段
        reviewerId: '',
        reviewerName: '',
        reviewTime: null,
        reviewOpinions: [],
        approvalPoints: 0
      }
    });

    console.log(`项目申请已创建: ${result._id}, 类型: ${submitType}, 分配给审核员: ${assignedReviewerId}`);

    return {
      success: true,
      data: {
        projectId: result._id,
        message: submitType === 'evaluate' ? '评估申请提交成功' : '发布申请提交成功'
      }
    };

  } catch (error) {
    console.error('提交项目申请错误:', error);
    return {
      success: false,
      message: '提交失败，请稍后重试'
    };
  }
}

/**
 * 根据年级分配审核员（按学段匹配）
 */
async function assignReviewerByGrade(grade) {
  try {
    // 年级映射到学段
    const gradeToSegment = {
      '1年级': '1-2年级',
      '2年级': '1-2年级',
      '3年级': '3-4年级',
      '4年级': '3-4年级',
      '5年级': '5-6年级',
      '6年级': '5-6年级'
    };

    const segment = gradeToSegment[grade] || '';

    // 1. 优先匹配学段专长的审核员
    let reviewers = await db.collection('reviewers')
      .where({
        status: 'active',
        gradeLevel: db.command.or(
          db.command.in([segment]),
          db.command.in(['全学段'])
        )
      })
      .get();

    // 2. 如果没有匹配的，获取所有活跃审核员
    if (reviewers.data.length === 0) {
      reviewers = await db.collection('reviewers')
        .where({
          status: 'active'
        })
        .get();
    }

    if (reviewers.data.length === 0) {
      console.warn('没有可用的审核员');
      return '';
    }

    // 3. 负载均衡：选择待审核任务最少的审核员
    const reviewerWorkloads = await Promise.all(
      reviewers.data.map(async (reviewer) => {
        const projectCount = await db.collection('projects_pending')
          .where({
            assignedTo: reviewer._id,
            status: 'pending'
          })
          .count();

        return {
          reviewerId: reviewer._id,
          totalTasks: projectCount.total
        };
      })
    );

    const selectedReviewer = reviewerWorkloads.reduce((min, current) => {
      return current.totalTasks < min.totalTasks ? current : min;
    });

    console.log(`项目分配给审核员: ${selectedReviewer.reviewerId}, 当前任务数: ${selectedReviewer.totalTasks}`);

    return selectedReviewer.reviewerId;

  } catch (error) {
    console.error('分配项目审核员错误:', error);
    return '';
  }
}

/**
 * 获取当前用户创建或加入的学校
 */
async function getMySchool(event, openid) {
  try {
    console.log('获取学校信息, openid:', openid);
    
    // 1. 首先查找用户是否是学校管理员（创建者）
    const adminSchools = await db.collection('schools')
      .where({
        adminOpenid: openid,
        status: 'active'
      })
      .limit(1)
      .get();
    
    if (adminSchools.data.length > 0) {
      console.log('找到管理员学校:', adminSchools.data[0].schoolName);
      return {
        success: true,
        data: adminSchools.data[0]
      };
    }
    
    // 2. 如果不是管理员，查找是否是学校成员（未来扩展）
    // TODO: 实现学校成员表查询
    
    // 3. 没有找到学校
    console.log('用户没有学校');
    return {
      success: true,
      data: null
    };
    
  } catch (error) {
    console.error('获取学校信息错误:', error);
    return {
      success: false,
      message: '获取学校信息失败'
    };
  }
}


