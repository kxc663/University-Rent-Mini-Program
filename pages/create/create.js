wx.cloud.init({
  env: 'cloud1-3gm1islrf702afb9'
});
const db = wx.cloud.database({
  env: 'cloud1-3gm1islrf702afb9'
});
const app = getApp();

Page({
  data: {
    title: '',
    detail: '',
    imageList: [],
    tempImageList: []
  },
  inputTitle(e) {
    this.setData({
      title: e.detail.value,
    });
  },
  inputDetail(e) {
    this.setData({
      detail: e.detail.value,
    });
  },
  chooseImage() {
    const images = this.data.tempImageList;
    if (images.length >= 6) {
      wx.showModal({
        title: '注意',
        content: '最多只能上传6张图片和视频',
        showCancel: false
      });
      return;
    }
    wx.chooseMedia({
      count: 6 - images.length,
      mediaType: ['image', 'video'],
      sourceType: ['album', 'camera'],
      maxDuration: 15,
      success: (res) => {
        const tempFile = res.tempFiles[0];
        const images = this.data.tempImageList;
        images.push(tempFile.tempFilePath);
        this.setData({
          tempImageList: images
        });
        this.uploadMedia(tempFile.tempFilePath);
      },
      fail: (error) => {
        console.error(error);
      }
    });
  },
  uploadMedia(fileToUpload) {
    let fileName = this.getRandomFileName();
    wx.cloud.uploadFile({
      filePath: fileToUpload,
      cloudPath: 'imageUpload/' + fileName + '.png',
      success(res) {
        console.log('图片上传成功');
      },
      fail(error) {
        console.error('图片上传失败', error);
      }
    })
    let images = this.data.imageList;
    images.push(fileName);
    this.setData({
      imageList: images
    });
  },
  submitData() {
    const {
      title,
      detail,
      imageList
    } = this.data;
    let username = app.globalData.username;
    db.collection('posts').add({
      data: {
        username: username,
        title: title,
        detail: detail,
        images: imageList
      }
    }).then(res => console.log(res));
    wx.reLaunch({
      url: '/pages/home/home',
    });
  },
  getRandomFileName() {
    let str = '';
    let chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < 15; i++) {
      str += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    str += Date.now().toString(36);
    return str.slice(0, 15);
  }
})