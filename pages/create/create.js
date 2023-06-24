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
    images: []
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
    const images = this.data.images;
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
        const images = this.data.images;
        images.push(tempFile.tempFilePath);
        this.setData({
          images: images
        });
        this.uploadMedia(tempFile);
      },
      fail: (error) => {
        console.error(error);
      }
    });
  },
  uploadMedia(fileToUpload) {

  },
  submitData() {
    const {
      title,
      detail
    } = this.data;
    let username = app.globalData.username;
    db.collection('posts').add({
      data: {
        username: username,
        title: title,
        detail: detail
      }
    }).then(res => console.log(res));
    wx.reLaunch({
      url: '/pages/home/home',
    });
  }
})