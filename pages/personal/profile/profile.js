const app = getApp();
Page({
  onShow(){ 
    if(!app.globalData.isLogged){
      wx.reLaunch({
        url: '/pages/personal/login/login',
      })
    }
  }
})