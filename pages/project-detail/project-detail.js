// pages/project-detail/project-detail.js
Page({
  data: {
    projectId: null,
    project: {},
    commentList: [
      {
        id: 1,
        userName: '张老师',
        content: '这个项目设计得很好，学生们很感兴趣！',
        time: '2天前',
        commentLikes: 12,
        liked: false
      },
      {
        id: 2,
        userName: '李老师',
        content: '已经在我的班级实施了，效果不错，孩子们积极性很高。',
        time: '5天前',
        commentLikes: 8,
        liked: false
      },
      {
        id: 3,
        userName: '王老师',
        content: '跨学科的设计很有创意，值得借鉴。',
        time: '1周前',
        commentLikes: 15,
        liked: false
      }
    ],
    commentSort: 'hot', // hot, new
    showCommentModal: false,
    commentInput: ''
  },

  onLoad(options) {
    const id = parseInt(options.id)
    this.setData({
      projectId: id
    })
    this.loadProjectDetail(id)
  },

  // 加载项目详情
  loadProjectDetail(id) {
    // 示例数据，实际应从云函数获取
    const project = {
      id: id,
      title: '《我的时间我做主》',
      subject: '综合',
      grade: 1,
      gradeName: '1年级',
      price: 10,
      likes: 45,
      favorites: 23,
      comments: 12,
      isLiked: false,
      isFavorited: false
    }

    this.setData({
      project: project
    })
  },

  // 切换点赞
  toggleLike() {
    const { project } = this.data
    const isLiked = !project.isLiked
    
    this.setData({
      'project.isLiked': isLiked,
      'project.likes': isLiked ? project.likes + 1 : project.likes - 1
    })

    wx.showToast({
      title: isLiked ? '点赞成功' : '取消点赞',
      icon: 'success'
    })

    // TODO: 调用云函数更新点赞状态
  },

  // 切换收藏
  toggleFavorite() {
    const { project } = this.data
    const isFavorited = !project.isFavorited
    
    this.setData({
      'project.isFavorited': isFavorited,
      'project.favorites': isFavorited ? project.favorites + 1 : project.favorites - 1
    })

    wx.showToast({
      title: isFavorited ? '收藏成功' : '取消收藏',
      icon: 'success'
    })

    // TODO: 调用云函数更新收藏状态
  },

  // 显示评论输入框
  showCommentInput() {
    this.setData({
      showCommentModal: true
    })
  },

  // 隐藏评论输入框
  hideCommentInput() {
    this.setData({
      showCommentModal: false,
      commentInput: ''
    })
  },

  // 阻止关闭
  preventClose() {
    // 空函数，阻止事件冒泡
  },

  // 评论输入
  onCommentInput(e) {
    this.setData({
      commentInput: e.detail.value
    })
  },

  // 提交评论
  submitComment() {
    const { commentInput, commentList } = this.data
    
    if (!commentInput.trim()) {
      wx.showToast({
        title: '请输入评论内容',
        icon: 'none'
      })
      return
    }

    // 添加新评论
    const newComment = {
      id: Date.now(),
      userName: '我',
      content: commentInput,
      time: '刚刚',
      commentLikes: 0,
      liked: false
    }

    this.setData({
      commentList: [newComment, ...commentList],
      'project.comments': this.data.project.comments + 1,
      showCommentModal: false,
      commentInput: ''
    })

    wx.showToast({
      title: '评论成功',
      icon: 'success'
    })

    // TODO: 调用云函数提交评论
  },

  // 点赞评论
  likeComment(e) {
    const id = e.currentTarget.dataset.id
    const { commentList } = this.data
    const index = commentList.findIndex(c => c.id === id)
    
    if (index !== -1) {
      const liked = !commentList[index].liked
      this.setData({
        [`commentList[${index}].liked`]: liked,
        [`commentList[${index}].commentLikes`]: liked ? 
          commentList[index].commentLikes + 1 : 
          commentList[index].commentLikes - 1
      })
    }
  },

  // 切换评论排序
  toggleCommentSort() {
    const newSort = this.data.commentSort === 'hot' ? 'new' : 'hot'
    this.setData({
      commentSort: newSort
    })
    
    // TODO: 重新排序评论列表
  },

  // 购买项目
  purchaseProject() {
    const { project } = this.data
    
    wx.showModal({
      title: '购买项目',
      content: `确认购买《${project.title}》？\n价格：¥${project.price}`,
      confirmText: '确认购买',
      success: (res) => {
        if (res.confirm) {
          // TODO: 调用微信支付
          wx.showLoading({
            title: '正在跳转支付...'
          })

          setTimeout(() => {
            wx.hideLoading()
            wx.showToast({
              title: '支付功能开发中',
              icon: 'none'
            })
          }, 1000)
        }
      }
    })
  }
})

