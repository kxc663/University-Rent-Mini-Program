wx.cloud.init({
  env: 'cloud1-3gm1islrf702afb9'
});
const db = wx.cloud.database({
  env: 'cloud1-3gm1islrf702afb9'
});

Page({
  data: {
    username: '',
    postList: []
  },
  onLoad(options) {
    var username = JSON.parse(options.user);
    this.setData({
      username: username
    });
  },
  onShow() {
    this.updatePosts();
  },
  updatePosts() {
    const username = this.data.username;
    db.collection('posts').where({
      username: username
    }).get().then(res => {
      this.setData({
        postList: res.data
      });
    }).catch(err => {
      console.error('获取发布的帖子失败', err);
    });
  },
  viewPostDetail(event) {
    wx.navigateTo({
      url: '/pages/detail/detail?post=' + JSON.stringify(this.data.postList[event.currentTarget.dataset.postId])
    });
  }
})