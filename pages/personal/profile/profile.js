wx.cloud.init({
  env: 'cloud1-3gm1islrf702afb9'
});
const db = wx.cloud.database({
  env: 'cloud1-3gm1islrf702afb9'
});
const app = getApp();
Page({
  data: {
    username: 'Test',
    followingNumber: 0,
    followerNumber: 0,
    collectList: [],
    currentTab: 0
  },
  onShow() {
    if (!app.globalData.isLogged) {
      wx.reLaunch({
        url: '/pages/personal/login/login',
      })
    } else {
      this.setData({
        username: app.globalData.username,
        followingNumber: app.globalData.following,
        followerNumber: app.globalData.follower,
      });
      this.updateCollects();
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

  onTabsChange(event) {
    const currentTab = event.detail.value;
    this.setData({
      currentTab: currentTab
    });
    console.log(currentTab);
    if (currentTab === "1") {
      this.updateCollects();
    }
    console.log(`Change tab, tab-panel value is ${event.detail.value}.`);
  },
  viewCollectDetail(event) {
    console.log( event.currentTarget.dataset);
    wx.navigateTo({
      url: '/pages/detail/detail?post=' + JSON.stringify(this.data.collectList[event.currentTarget.dataset.postId])
    });
  },
  updateCollects() {
    const username = app.globalData.username;
    db.collection('users').where({
      username: username
    }).get().then(res => {
      const user = res.data[0];
      const collectList = user.collect_list || [];
      if (collectList.length === 0) {
        this.setData({
          collectList: []
        });
        return;
      }
      const query = db.collection('posts').where({
        _id: db.command.in(collectList)
      });
      query.get().then(res => {
        this.setData({
          collectList: res.data
        });
      }).catch(err => {
        console.error('获取收藏的帖子失败', err);
      });
    });
  }
})
/*
Page({
  
  }
})*/