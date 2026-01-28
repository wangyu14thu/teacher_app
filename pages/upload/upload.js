// pages/upload/upload.js
const app = getApp()

Page({
  data: {
    formData: {
      title: '',
      grade: '',
      subject: '',
      description: '',
      files: []
    },
    gradeList: [
      '一年级', '二年级', '三年级', '四年级', '五年级', '六年级',
      '初一', '初二', '初三',
      '高一', '高二', '高三'
    ],
    gradeIndex: -1,
    subjectList: [
      '语文', '数学', '英语', '物理', '化学', '生物',
      '历史', '地理', '政治', '音乐', '体育', '美术',
      '信息技术', '通用技术', '科学', '综合实践', '其他'
    ],
    subjectIndex: -1,
    maxFiles: 9,
    canSubmit: false
  },

  onLoad() {
    // 页面加载
  },

  // 标题输入
  onTitleInput(e) {
    this.setData({
      'formData.title': e.detail.value
    }, () => {
      this.checkCanSubmit()
    })
  },

  // 年级选择
  onGradeChange(e) {
    const index = e.detail.value
    this.setData({
      gradeIndex: index,
      'formData.grade': this.data.gradeList[index]
    }, () => {
      this.checkCanSubmit()
    })
  },

  // 学科选择
  onSubjectChange(e) {
    const index = e.detail.value
    this.setData({
      subjectIndex: index,
      'formData.subject': this.data.subjectList[index]
    }, () => {
      this.checkCanSubmit()
    })
  },

  // 描述输入
  onDescInput(e) {
    this.setData({
      'formData.description': e.detail.value
    }, () => {
      this.checkCanSubmit()
    })
  },

  // 选择文件
  chooseFiles() {
    const remainingSlots = this.data.maxFiles - this.data.formData.files.length
    
    if (remainingSlots <= 0) {
      wx.showToast({
        title: `最多上传${this.data.maxFiles}个文件`,
        icon: 'none'
      })
      return
    }

    wx.chooseMessageFile({
      count: remainingSlots,
      type: 'file',
      success: (res) => {
        const files = res.tempFiles.map(file => ({
          name: file.name,
          path: file.path,
          size: file.size
        }))

        this.setData({
          'formData.files': this.data.formData.files.concat(files)
        }, () => {
          this.checkCanSubmit()
        })
      }
    })
  },

  // 删除文件
  removeFile(e) {
    const index = e.currentTarget.dataset.index
    const files = this.data.formData.files
    files.splice(index, 1)
    
    this.setData({
      'formData.files': files
    }, () => {
      this.checkCanSubmit()
    })
  },

  // 检查是否可以提交
  checkCanSubmit() {
    const { title, grade, subject, description, files } = this.data.formData
    const canSubmit = title.trim() !== '' &&
                     grade !== '' &&
                     subject !== '' &&
                     description.trim() !== '' &&
                     files.length > 0
    this.setData({ canSubmit })
  },

  // 提交作品
  async submitWork() {
    if (!this.data.canSubmit) {
      return
    }

    wx.showLoading({
      title: '上传中...',
      mask: true
    })

    try {
      // TODO: 上传文件到云存储
      // TODO: 调用云函数保存作品信息
      
      // 模拟上传
      setTimeout(() => {
        wx.hideLoading()
        wx.showToast({
          title: '提交成功，等待审核',
          icon: 'success',
          duration: 2000
        })

        setTimeout(() => {
          wx.navigateBack()
        }, 2000)
      }, 1500)

    } catch (err) {
      wx.hideLoading()
      console.error('上传失败', err)
      wx.showToast({
        title: '上传失败，请重试',
        icon: 'none'
      })
    }
  }
})

