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
      if (res.data.length > 0) {
        if (res.data[0].password === password) {
          app.globalData.isLogged = true;
          app.globalData.username = username;
          wx.reLaunch({
            url: '/pages/home/home',
          });
          console.log('登录成功');
        } else {
          this.showPopUp('注意', '用户名或密码错误，请重试', false);
        }
      } else {
        this.showPopUp('注意', '用户名或密码错误，请重试', false);
      }
    });
  },
  register() {
    const {
      username,
      password
    } = this.data;
    db.collection('users').where({
      username: username
    }).get().then(res => {
      if (res.data.length > 0) {
        this.showPopUp('注意', '该用户已存在，请使用其他用户名注册', false);
      } else {
        if (username.includes('@andrew.cmu.edu') && password.length >= 8) {
          this.showPopUp('注册成功', '返回去登录吧！', false);
          db.collection('users').add({
            data: {
              username: username,
              password: password
            }
          }).then(res => console.log(res));
        } else if (!username.includes('@andrew.cmu.edu')) {
          this.showPopUp('注意', '邮箱必须是CMU.edu的邮箱', false);
        } else {
          this.showPopUp('注意', '密码长度需要至少8位', false);
        }
      }
    });
  },

  onLoad(options) {

  },

  onShow() {
    if (app.globalData.isLogged) {
      wx.reLaunch({
        url: '/pages/personal/profile/profile',
      })
    }
  },

  showPopUp(title, content, hasCancel) {
    wx.showModal({
      title: title,
      content: content,
      showCancel: hasCancel
    });
  }
})