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
    detail: ''
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
    wx.chooseMedia({
      count: 1,
      mediaType: ['image', 'video'],
      sourceType: ['album', 'camera'],
      maxDuration: 15,
      success: (res) => {
        this.uploadMedia(res.tempFiles[0]);
      },
      fail: (error) => {
        console.error(error);
      }
    });
  },
  uploadMedia(fileToUpload){
    
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