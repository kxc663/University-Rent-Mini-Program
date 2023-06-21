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
    if(username == "test" && password == "test123"){
      console.log("登陆成功");
    } else{
      console.log("登陆失败");
    }
  },
  register() {
    const {
      username,
      password
    } = this.data;
    if(username.includes("@andrew.cmu.edu")&&password.length >= 8){
      console.log("合法邮箱和密码");
    }else if (!username.includes("@andrew.cmu.edu")){
      console.log("非法邮箱");
    } else{
      console.log("密码未符合长度要求")
    }
  },
  onLoad(options) {

  },

  onReady() {

  },

  onShow() {

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