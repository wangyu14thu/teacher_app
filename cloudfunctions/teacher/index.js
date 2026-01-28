// cloudfunctions/teacher/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { action } = event

  try {
    switch (action) {
      case 'register':
        return await register(event)
      
      case 'getStats':
        return await getStats(event)
      
      case 'updatePoints':
        return await updatePoints(event)
      
      default:
        return {
          success: false,
          message: '无效的操作'
        }
    }
  } catch (err) {
    console.error('操作失败', err)
    return {
      success: false,
      message: err.message
    }
  }
}

// 注册教师
async function register(event) {
  const { openid, nickname, grade, subject, region, phone, points, registerTime } = event

  // 检查是否已注册
  const teacherResult = await db.collection('teachers')
    .where({ openid })
    .limit(1)
    .get()

  if (teacherResult.data.length > 0) {
    return {
      success: true,
      message: '已注册',
      teacherInfo: teacherResult.data[0]
    }
  }

  // 新注册
  await db.collection('teachers').add({
    data: {
      openid,
      nickname,
      grade,
      subject,
      region: region.join ? region.join(' ') : region,
      phone,
      points: points || 0,
      registerTime,
      createTime: db.serverDate()
    }
  })

  return {
    success: true,
    message: '注册成功',
    teacherInfo: {
      openid,
      nickname,
      grade,
      subject,
      region: region.join ? region.join(' ') : region,
      phone,
      points: points || 0
    }
  }
}

// 获取统计数据
async function getStats(event) {
  const { openid } = event

  // 获取上传作品数量
  const uploadsResult = await db.collection('works')
    .where({ openid })
    .count()

  // 获取已购资料数量
  const purchasedResult = await db.collection('purchases')
    .where({ openid })
    .count()

  return {
    success: true,
    stats: {
      uploads: uploadsResult.total,
      purchased: purchasedResult.total
    }
  }
}

// 更新积分
async function updatePoints(event) {
  const { openid, points } = event

  await db.collection('teachers')
    .where({ openid })
    .update({
      data: {
        points: db.command.inc(points)
      }
    })

  return {
    success: true,
    message: '积分更新成功'
  }
}

