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
    followingList: [],
    followerList: [],
    collectList: [],
    postList: [],
    currentTab: 0,
  },
  onShow() {
    if (!app.globalData.isLogged) {
      wx.reLaunch({
        url: '/pages/personal/login/login',
      })
    } else {
      db.collection('users').where({
        username: app.globalData.username
      }).get().then(res => {
        let followingList = [];
        let followerList = [];
        followingList = res.data[0].following_list;
        followerList = res.data[0].follower_list;
        this.setData({
          username: app.globalData.username,
          followingList: followingList,
          followerList: followerList,
        });
      });
      this.updateCollects();
      this.updatePosts();
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
    if (currentTab === "0") {
      this.updatePosts();
    } else if (currentTab === "1") {
      this.updateCollects();
    }
    console.log(`Change tab, tab-panel value is ${event.detail.value}.`);
  },
  viewCollectDetail(event) {
    console.log(event.currentTarget.dataset);
    wx.navigateTo({
      url: '/pages/detail/detail?post=' + JSON.stringify(this.data.collectList[event.currentTarget.dataset.postId])
    });
  },
  viewPostDetail(event) {
    wx.navigateTo({
      url: '/pages/detail/detail?post=' + JSON.stringify(this.data.postList[event.currentTarget.dataset.postId])
    });
  },
  updatePosts() {
    const username = app.globalData.username;
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
        const validCollectList = res.data.map(post => post._id);
        const hasNoneExistId = collectList.filter(id => !validCollectList.includes(id));
        if (hasNoneExistId.length > 0) {
          const updatedCollectList = collectList.filter(id => !hasNoneExistId.includes(id));
          user.collect_list = updatedCollectList;
          db.collection('users').doc(user._id).update({
            data: {
              collect_list: updatedCollectList
            }
          }).then(() => {
            console.log('更新收藏列表成功');
          }).catch(err => {
            console.error('更新收藏列表失败', err);
          });
        }
        this.setData({
          collectList: res.data
        });
      }).catch(err => {
        console.error('获取收藏的帖子失败', err);
      });
    });
  }
})