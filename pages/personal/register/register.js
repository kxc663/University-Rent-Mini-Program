wx.cloud.init({
  env: 'cloud1-3gm1islrf702afb9'
});
const db = wx.cloud.database({
  env: 'cloud1-3gm1islrf702afb9'
});
Page({
  data: {
    username: '',
    password: '',
    options: ['@andrew.cmu.edu', '@case.edu'],
    selectedOptionIndex: 0
  },
  onPickerChange(event) {
    const index = event.detail.value;
    this.setData({
      selectedOptionIndex: index
    });
    console.log(index);
    console.log(this.data.options[index]);
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
  onRegister() {
    let {
      username,
      password
    } = this.data;
    username += this.data.options[this.data.selectedOptionIndex];
    console.log(username);
    db.collection('users').where({
      username: username
    }).get().then(res => {
      if (res.data.length > 0) {
        console.log('注意', '该用户已存在，请使用其他用户名注册');
      } else {
        if (password.length >= 8) {
          console.log('注册成功,返回去登录吧!');
          db.collection('users').add({
            data: {
              username: username,
              password: password
            }
          }).then(res => {
            console.log(res);
            wx.redirectTo({
              url: '/pages/personal/login/login',
            })
          });
        } else {
          console.log('密码长度需要至少8位');
        }
      }
    });
  },
})