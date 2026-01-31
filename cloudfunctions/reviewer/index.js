// cloudfunctions/reviewer/index.js

/**
 * 审核员云函数
 * 处理审核员相关的所有后端逻辑
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const { action } = event;
  
  // 获取调用者的 openid
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    switch (action) {
      case 'login':
        return await handleLogin(event, openid);
      
      case 'checkToken':
        return await checkToken(event, openid);
      
      case 'logout':
        return await handleLogout(event, openid);
      
      case 'getPendingTasks':
        return await getPendingTasks(event, openid);
      
      case 'getTaskDetail':
        return await getPendingTasks(event, openid);
      
      case 'getTaskDetail':
        return await getTaskDetail(event, openid);
      
      case 'submitReview':
        return await submitReview(event, openid);
      
      case 'batchReject':
        return await batchReject(event, openid);
      
      case 'transferTask':
        return await transferTask(event, openid);
      
      case 'saveTempTask':
        return await saveTempTask(event, openid);
      
      case 'getTempTasks':
        return await getTempTasks(event, openid);
      
      case 'getReviewHistory':
        return await getReviewHistory(event, openid);
      
      case 'getStatistics':
        return await getStatistics(event, openid);
      
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
 * 处理登录
 */
async function handleLogin(event, openid) {
  const { account, password } = event;

  // 1. 验证参数
  if (!account || !password) {
    return {
      success: false,
      message: '账号和密码不能为空'
    };
  }

  try {
    // 2. 从数据库查询审核员信息
    const result = await db.collection('reviewers')
      .where({
        account: account,
        status: 'active' // 只查询激活状态的账号
      })
      .get();

    if (result.data.length === 0) {
      return {
        success: false,
        message: '账号不存在或已被禁用'
      };
    }

    const reviewer = result.data[0];

    // 3. 验证密码
    // ⚠️ 注意：实际生产环境应使用加密后的密码对比
    // 建议使用 bcrypt 或类似的加密库
    if (reviewer.password !== password) {
      // 记录登录失败次数
      await recordLoginFailure(reviewer._id);
      
      return {
        success: false,
        message: '密码错误'
      };
    }

    // 4. 检查账号是否被锁定（防暴力破解）
    if (reviewer.loginFailures >= 5) {
      return {
        success: false,
        message: '账号已被锁定，请联系管理员'
      };
    }

    // 5. 生成 Token
    const token = generateToken(reviewer._id, openid);

    // 6. 更新登录信息
    await db.collection('reviewers').doc(reviewer._id).update({
      data: {
        lastLoginTime: new Date(),
        lastLoginOpenid: openid,
        loginFailures: 0, // 重置失败次数
        currentToken: token
      }
    });

    // 7. 记录登录日志
    await db.collection('reviewer_logs').add({
      data: {
        reviewerId: reviewer._id,
        account: reviewer.account,
        action: 'login',
        openid: openid,
        timestamp: new Date(),
        success: true
      }
    });

    // 8. 返回成功信息
    return {
      success: true,
      data: {
        token: token,
        userInfo: {
          id: reviewer._id,
          account: reviewer.account,
          name: reviewer.name,
          role: reviewer.role || 'reviewer',
          permissions: reviewer.permissions || [],
          department: reviewer.department || '审核部'
        }
      }
    };

  } catch (error) {
    console.error('登录处理错误:', error);
    return {
      success: false,
      message: '登录失败，请稍后重试'
    };
  }
}

/**
 * 生成 Token
 * 格式: reviewer_{userId}_{timestamp}_{random}
 */
function generateToken(userId, openid) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `reviewer_${userId}_${timestamp}_${random}`;
}

/**
 * 记录登录失败
 */
async function recordLoginFailure(reviewerId) {
  try {
    await db.collection('reviewers').doc(reviewerId).update({
      data: {
        loginFailures: _.inc(1), // 失败次数 +1
        lastFailureTime: new Date()
      }
    });
  } catch (error) {
    console.error('记录登录失败错误:', error);
  }
}

/**
 * 验证 Token
 */
async function checkToken(event, openid) {
  const { token } = event;

  if (!token) {
    return {
      success: false,
      message: 'Token 不能为空'
    };
  }

  try {
    // 从 token 中提取 userId
    const parts = token.split('_');
    if (parts.length < 2) {
      return {
        success: false,
        message: 'Token 格式错误'
      };
    }

    const userId = parts[1];

    // 查询审核员信息
    const result = await db.collection('reviewers').doc(userId).get();
    
    if (!result.data || result.data.currentToken !== token) {
      return {
        success: false,
        message: 'Token 已失效'
      };
    }

    // Token 验证成功
    return {
      success: true,
      data: {
        userInfo: {
          id: result.data._id,
          account: result.data.account,
          name: result.data.name,
          role: result.data.role,
          permissions: result.data.permissions,
          department: result.data.department
        }
      }
    };

  } catch (error) {
    console.error('Token 验证错误:', error);
    return {
      success: false,
      message: 'Token 验证失败'
    };
  }
}

/**
 * 退出登录
 */
async function handleLogout(event, openid) {
  const { token } = event;

  try {
    // 从 token 中提取 userId
    const parts = token.split('_');
    if (parts.length >= 2) {
      const userId = parts[1];

      // 清除 token
      await db.collection('reviewers').doc(userId).update({
        data: {
          currentToken: ''
        }
      });

      // 记录退出日志
      await db.collection('reviewer_logs').add({
        data: {
          reviewerId: userId,
          action: 'logout',
          openid: openid,
          timestamp: new Date()
        }
      });
    }

    return {
      success: true,
      message: '退出成功'
    };

  } catch (error) {
    console.error('退出登录错误:', error);
    return {
      success: false,
      message: '退出失败'
    };
  }
}

/**
 * 获取审核员详细信息
 */
async function getProfile(event, openid) {
  const { token } = event;

  if (!token) {
    return {
      success: false,
      message: '未登录'
    };
  }

  try {
    // 从 token 中提取 userId
    const parts = token.split('_');
    if (parts.length < 2) {
      return {
        success: false,
        message: 'Token 格式错误'
      };
    }

    const userId = parts[1];

    // 查询审核员信息
    const result = await db.collection('reviewers').doc(userId).get();
    
    if (!result.data) {
      return {
        success: false,
        message: '用户不存在'
      };
    }

    return {
      success: true,
      data: {
        userInfo: {
          id: result.data._id,
          account: result.data.account,
          name: result.data.name,
          role: result.data.role,
          permissions: result.data.permissions,
          department: result.data.department,
          lastLoginTime: result.data.lastLoginTime
        }
      }
    };

  } catch (error) {
    console.error('获取用户信息错误:', error);
    return {
      success: false,
      message: '获取用户信息失败'
    };
  }
}

/**
 * 获取待审核任务列表
 */
async function getPendingTasks(event, openid) {
  const { token, taskType } = event;

  if (!token) {
    return { success: false, message: '未登录' };
  }

  try {
    // 验证token并获取审核员ID
    const reviewerInfo = await verifyTokenAndGetReviewer(token);
    if (!reviewerInfo) {
      return { success: false, message: 'Token无效' };
    }

    const results = {};
    
    // 获取待审核项目
    if (taskType === 'project' || taskType === 'all') {
      const projects = await db.collection('projects_pending')
        .where({
          status: 'pending',
          assignedTo: reviewerInfo._id
        })
        .orderBy('submitTime', 'desc')
        .get();
      
      results.projects = projects.data.map(item => ({
        ...item,
        urgent: isUrgent(item.submitTime)
      }));
    }

    // 获取待审核学校
    if (taskType === 'school' || taskType === 'all') {
      const schools = await db.collection('schools_pending')
        .where({
          status: 'pending',
          assignedTo: reviewerInfo._id
        })
        .orderBy('submitTime', 'desc')
        .get();
      
      results.schools = schools.data;
    }

    return { success: true, data: results };

  } catch (error) {
    console.error('获取待审核任务错误:', error);
    return { success: false, message: '获取任务列表失败' };
  }
}

/**
 * 验证Token并获取审核员信息
 */
async function verifyTokenAndGetReviewer(token) {
  try {
    const parts = token.split('_');
    if (parts.length < 2) return null;
    
    const userId = parts[1];
    const result = await db.collection('reviewers').doc(userId).get();
    
    if (!result.data || result.data.currentToken !== token) return null;
    
    return result.data;
  } catch (error) {
    console.error('验证Token错误:', error);
    return null;
  }
}

/**
 * 判断任务是否紧急（超过24小时）
 */
function isUrgent(submitTime) {
  if (!submitTime) return false;
  const now = new Date();
  const submit = new Date(submitTime);
  const hoursDiff = (now - submit) / (1000 * 60 * 60);
  return hoursDiff > 24;
}

