wx.cloud.init({
  env: 'cloud1-3gm1islrf702afb9'
});
const db = wx.cloud.database({
  env: 'cloud1-3gm1islrf702afb9'
});
const app = getApp();

Page({
  data: {
    followingList: []
  },
  onShow() {
    db.collection('users').where({
      username: app.globalData.username
    }).get().then(res => {
      this.setData({
        followingList: res.data[0].following_list
      })
    });
  },
  onProfileClick(event) {
    wx.navigateTo({
      url: '../profile_view/profile_view?user=' + JSON.stringify(this.data.followingList[event.currentTarget.dataset.postId])
    })
  }
})