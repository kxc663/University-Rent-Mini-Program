wx.cloud.init({
  env: 'cloud1-3gm1islrf702afb9'
});
const db = wx.cloud.database({
  env: 'cloud1-3gm1islrf702afb9'
});
const app = getApp();
Page({
  data: {
    username: '',
    password: '',
    rememberPassword: false
  },
  onLoad(options) {

  },
  onShow() {
    const username = wx.getStorageSync('username');
    const password = wx.getStorageSync('password');
    const rememberPassword = wx.getStorageSync('rememberPassword');
    if (rememberPassword) {
      this.setData({
        username,
        password,
        rememberPassword: true,
      });
    }
    if (app.globalData.isLogged) {
      wx.redirectTo({
        url: '/pages/personal/profile/profile',
      })
    }
  },
  inputUsername(event) {
    this.setData({
      username: event.detail.value,
    });
  },
  inputPassword(event) {
    this.setData({
      password: event.detail.value,
    });
  },
  onRememberPasswordTap(event) {
    console.log(this.data.rememberPassword)
    this.setData({
      rememberPassword: !this.data.rememberPassword,
    });

  },
  onLogin() {
    const {
      username,
      password
    } = this.data;
    console.log('用户名：', username);
    console.log('密码：', password);
    db.collection('users').where({
      username: username
    }).get().then(res => {
      if (res.data.length > 0) {
        if (res.data[0].password === password) {
          app.globalData.isLogged = true;
          app.globalData.username = username;
          app.globalData.following = res.data[0].following;
          app.globalData.follower = res.data[0].follower;
          app.globalData.userId = res.data[0]._id;
          wx.reLaunch({
            url: '/pages/home/home',
          });
          wx.showToast({
            title: '登陆成功',
            icon: 'none',
          });
          if (this.data.rememberPassword) {
            wx.setStorageSync('username', username);
            wx.setStorageSync('password', password);
            wx.setStorageSync('rememberPassword', true);
          } else {
            wx.removeStorageSync('username');
            wx.removeStorageSync('password');
            wx.removeStorageSync('rememberPassword');
          }
        } else {
          this.showPopUp('注意', '用户名或密码错误，请重试', false);
        }
      } else {
        this.showPopUp('注意', '用户名或密码错误，请重试', false);
      }
    });
  },
  onRegister() {
    wx.navigateTo({
      url: '/pages/personal/register/register',
    });
  },
  showPopUp(title, content, hasCancel) {
    wx.showModal({
      title: title,
      content: content,
      showCancel: hasCancel
    });
  }
})