wx.cloud.init({
  env: 'cloud1-3gm1islrf702afb9'
})
const db = wx.cloud.database({
  env: 'cloud1-3gm1islrf702afb9'
})
const app = getApp();
Page({
  data: {
    username: '',
    password: ''
  },
  inputUsername(e) {
    this.setData({
      username: e.detail.value,
    });
  },
  inputPassword(e) {
    this.setData({
      password: e.detail.value,
    });
  },
  login() {
    const {
      username,
      password
    } = this.data;
    console.log('用户名：', username);
    console.log('密码：', password);
    db.collection('users').where({
      username: username
    }).get().then(res => {
      if(res.data[0].password == password){
        app.globalData.isLogged = true;
        app.globalData.username = username;
        wx.reLaunch({
          url: '/pages/home/home',
        });
        console.log('登陆成功');
      } else{
        console.log('登陆失败');
      }
    });
  },
  register() {
    const {
      username,
      password
    } = this.data;
    if (username.includes('@andrew.cmu.edu') && password.length >= 8) {
      console.log('合法邮箱和密码');
      db.collection('users').add({
        data: {
          username: username,
          password: password
        }
      }).then(res => console.log(res));
    } else if (!username.includes('@andrew.cmu.edu')) {
      console.log('非法邮箱');
    } else {
      console.log('密码未符合长度要求')
    }
  },
  onLoad(options) {

  },

  onReady() {

  },

  onShow() {
    if(app.globalData.isLogged){
      wx.reLaunch({
        url: '/pages/personal/profile/profile',
      })
    }
  },

  onHide() {

  },

  onUnload() {

  },

  onPullDownRefresh() {

  },

  onReachBottom() {

  }
})