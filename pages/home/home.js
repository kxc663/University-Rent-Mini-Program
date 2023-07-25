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
    posts: {},
    allPosts: {},
    currentTab: 0,
    currentRentNumber: 5,
    currentSellNumber: 5,
    showMoreRent: true,
    showMoreSell: true
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
  /*
  onScrollToLower() {
    if (this.data.currentSellNumber < Object.keys(this.data.allPosts).length) {
      const tempSellNumber = this.data.currentSellNumber;
      console.log(1);
      this.setData({
        currentSellNumber: tempSellNumber + 5
      })
      this.loadNextPosts();
    }
  },
  loadMorePosts(){
    const currentPosts = this.data.posts;
    const followPosts = Object.fromEntries(Object.entries(this.data.allPosts).slice(0, this.data.currentSellNumber));
    this.setData({
      posts: followPosts
    });
    console.log(this.data.allPosts);
    console.log(this.data.posts);
  },*/
  onHigerTabsChange(event) {
    this.setData({
      currentTab: event.detail.value
    });
  },
  onLowerTabsChange(event) {
    console.log(event.detail);
  },
  floatButtonClicked(event) {
    if (this.data.isLogged) {
      wx.navigateTo({
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
      //this.loadMorePosts();
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