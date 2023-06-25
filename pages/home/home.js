wx.cloud.init({
  env: 'cloud1-3gm1islrf702afb9'
});
const db = wx.cloud.database({
  env: 'cloud1-3gm1islrf702afb9'
});
const app = getApp();
Page({
  data: {
    tabList: [{
      "text": "0",
      "key": 0
    }, {
      "text": "1",
      "key": 1
    }],
    stickyProps: {
      zIndex: 2,
    },
    isLogged: false,
    username: '',
    posts: {}
  },
  onLoad() {
    this.getPosts();
    let isLogged = app.globalData.isLogged;
    if (isLogged) {
      this.setData({
        isLogged: true,
        username: app.globalData.username
      });
    } else {
      this.setData({
        isLogged: false,
        username: ''
      });
    }
  },
  onHigerTabsChange(event) {
    console.log(`Change tab, tab-panel value is ${event.detail.value}.`);
  },
  onHigerTabsClick(event) {
    console.log(`Click tab, tab-panel value is ${event.detail.value}.`);
  },
  onStickyScroll(event) {
    console.log(event.detail);
  },
  onLowerTabsChange(event) {
    console.log(event.detail);
  },
  floatButtonClicked(event) {
    if (this.data.isLogged) {
      wx.reLaunch({
        url: '/pages/create/create',
      })
    } else {
      wx.showModal({
        title: '请先登陆',
        content: '发布功能仅限登陆用户',
        showCancel: false
      });
    }
    console.log("+ clicked");
  },
  getPosts() {
    db.collection('posts').get().then(res => {
      this.setData({
        posts: res.data
      });
    }).catch(err => {
      console.error(err);
    });
  },
  viewPostDetail: function(event) {
    wx.navigateTo({
      url: '/pages/detail/detail?post=' + JSON.stringify(this.data.posts[event.currentTarget.dataset.postId])
    });
  }
});