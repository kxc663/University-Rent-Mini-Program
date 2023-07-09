wx.cloud.init({
  env: 'cloud1-3gm1islrf702afb9'
});
const db = wx.cloud.database({
  env: 'cloud1-3gm1islrf702afb9'
});
const app = getApp();

Page({
  data: {
    followerList: []
  },
  onShow() {
    db.collection('users').where({
      username: app.globalData.username
    }).get().then(res => {
      this.setData({
        followerList: res.data[0].follower_list
      })
    });
  },
  onProfileClick(event) {
    wx.navigateTo({
      url: '../profile_view/profile_view?user=' + JSON.stringify(this.data.followerList[event.currentTarget.dataset.postId])
    })
  }
})