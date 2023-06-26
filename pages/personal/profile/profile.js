const app = getApp();
Page({
  data: {
    username: 'Test',
    followingNumber: 0,
    followerNumber: 0
  },
  onShow() {
    if (!app.globalData.isLogged) {
      wx.reLaunch({
        url: '/pages/personal/login/login',
      })
    } else{
      this.setData({
        username: app.globalData.username,
        followingNumber: app.globalData.following,
        followerNumber: app.globalData.follower,
      });
    }
  },
  clickFollowing() {
    wx.navigateTo({
      url: './following/following',
    })
  },
  clickFollower() {
    wx.navigateTo({
      url: './follower/follower',
    })
  },
  onTabsClick(event) {
    console.log(`Click tab, tab-panel value is ${event.detail.value}.`);
  },
  onTabsChange(event) {
    console.log(`Change tab, tab-panel value is ${event.detail.value}.`);
  },
})
/*
Page({
  
  }
})*/