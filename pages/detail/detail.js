wx.cloud.init({
  env: 'cloud1-3gm1islrf702afb9'
});
const db = wx.cloud.database({
  env: 'cloud1-3gm1islrf702afb9'
});
const app = getApp();

Page({
  data: {
    post: {},
    istPostCollected: false
  },
  onLoad: function (options) {
    var post = JSON.parse(options.post);
    this.setData({
      post: post
    });
    if (app.globalData.isLogged) {
      this.checkIfPostCollected();
    }
  },
  checkIfPostCollected: function () {
    db.collection('users').doc(app.globalData.userId).get().then(res => {
      const collectList = res.data.collect_list || [];
      this.setData({
        isPostCollected: collectList.includes(this.data.post._id)
      });
    }).catch(err => console.error('获取用户信息失败', err));
  },
  clickCollect() {
    if (!app.globalData.isLogged) {
      this.showPopUp('请先登陆', '收藏功能仅限登陆用户', false);
    } else {
      const postId = this.data.post._id;
      db.collection('users').where({
        username: app.globalData.username
      }).get().then(res => {
        const collectList = res.data[0].collect_list || [];
        if (collectList.includes(postId)) {
          const updatedCollectList = collectList.filter(id => id !== postId);
          db.collection('users').doc(app.globalData.userId).update({
            data: {
              collect_list: updatedCollectList
            },
            success: res => {
              this.setData({
                isPostCollected: false
              });
              console.log('收藏移除成功');
            },
            fail: err => console.error('收藏移除失败', err)
          });
        } else {
          collectList.push(postId);
          db.collection('users').doc(app.globalData.userId).update({
            data: {
              collect_list: collectList
            },
            success: res => {
              this.setData({
                isPostCollected: true
              });
              console.log('帖子收藏成功');
            },
            fail: err => console.error('帖子收藏失败', err)
          });
        }
      });
    }
  },
  clickMessage() {
    if (!app.globalData.isLogged) {
      this.showPopUp('请先登陆', '私信功能仅限登陆用户', false);
    }
  },
  clickFollow() {
    if (!app.globalData.isLogged) {
      this.showPopUp('请先登陆', '关注功能仅限登陆用户', false);
    }
  },
  showPopUp(title, content, hasCancel) {
    wx.showModal({
      title: title,
      content: content,
      showCancel: hasCancel
    });
  }
});