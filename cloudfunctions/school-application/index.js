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
      
      case 'getMyApplication':
        return await getMyApplication(event, openid);
      
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

