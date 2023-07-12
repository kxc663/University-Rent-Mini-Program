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
    comments: [],
    commentInput: '',
    istPostCollected: false,
    isUserFollowed: false,
    isSelf: false,
    isLogged: false
  },
  onLoad(options) {
    var post = JSON.parse(options.post);
    this.setData({
      post: post
    });
    if (app.globalData.isLogged) {
      this.setData({
        isLogged: true
      })
      this.checkIfPostCollected();
      this.checkIfUserFollowed();
    }
  },
  checkIfPostCollected() {
    db.collection('users').doc(app.globalData.userId).get().then(res => {
      const collectList = res.data.collect_list || [];
      this.setData({
        isPostCollected: collectList.includes(this.data.post._id)
      });
    }).catch(err => console.error('获取用户信息失败', err));
  },
  checkIfUserFollowed() {
    db.collection('users').where({
      username: app.globalData.username
    }).get().then(res => {
      const followList = res.data[0].following_list || [];
      if (this.data.post.username == app.globalData.username) {
        this.setData({
          isSelf: true,
          isUserFollowed: true
        })
      } else {
        this.setData({
          isUserFollowed: followList.includes(this.data.post.username)
        })
      }
    }).catch(err => console.error('获取用户信息失败', err));
  },
  onClickCollect() {
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
  onClickCopy() {
    if (!app.globalData.isLogged) {
      this.showPopUp('请先登陆', '复制功能仅限登陆用户', false);
    } else {
      const username = this.data.post.username;

      wx.setClipboardData({
        data: username,
        success: function () {
          wx.showToast({
            title: '已复制到剪贴板',
            icon: 'success',
            duration: 2000
          });
        }
      });
    }
  },
  onClickFollow() {
    if (!app.globalData.isLogged) {
      this.showPopUp('请先登陆', '关注功能仅限登陆用户', false);
    } else {
      db.collection('users').where({
        username: app.globalData.username
      }).get().then(res => {
        const currentUser = res.data[0];
        const followList = res.data[0].following_list || [];
        if (followList.includes(this.data.post.username)) {
          const updatedFollowList = followList.filter(followedUsername => followedUsername !== this.data.post.username);
          db.collection('users').doc(app.globalData.userId).update({
            data: {
              following_list: updatedFollowList
            },
            success: res => {
              this.setData({
                isUserFollowed: false
              });
              console.log('取消关注成功');
              this.updateFollowerList(this.data.post.username, currentUser.username, false);
            },
            fail: err => console.error('取消关注失败', err)
          });
        } else {
          followList.push(this.data.post.username);
          db.collection('users').doc(app.globalData.userId).update({
            data: {
              following_list: followList
            },
            success: res => {
              this.setData({
                isUserFollowed: true
              });
              console.log('关注成功');
              this.updateFollowerList(this.data.post.username, currentUser.username, true);
            },
            fail: err => console.error('关注失败', err)
          });
        }
      });
      this.checkIfUserFollowed();
    }
  },
  onClickUsername() {
    wx.navigateTo({
      url: '/pages/personal/profile/profile_view/profile_view?user=' + JSON.stringify(this.data.post.username)
    })
  },
  updateFollowerList(followedUsername, followerUsername, isFollowing) {
    console.log(1);
    db.collection('users').where({
      username: followedUsername
    }).get().then(res => {
      const followedUser = res.data[0];
      const followerList = followedUser.follower_list || [];
      if (isFollowing) {
        followerList.push(followerUsername);
      } else {
        const updatedFollowerList = followerList.filter(username => username !== followerUsername);
        followedUser.follower_list = updatedFollowerList;
      }
      db.collection('users').doc(followedUser._id).update({
        data: {
          follower_list: followerList
        },
        success: res => {
          console.log('更新成功');
        },
        fail: err => console.error('更新失败', err)
      });
    });
  },
  deletePost() {
    const postId = this.data.post._id;
    const postImage = this.data.post.images;

    db.collection('posts').doc(postId).remove()
      .then(() => {
        postImage.forEach(imageName => {
          const imagePath = '/imageUpload/' + imageName + '.png';
          wx.cloud.deleteFile({
            fileList: [imagePath],
            success: res => {
              console.log('图片储存更新成功', imagePath);
            },
            fail: error => {
              console.error('图片储存更新失败', imagePath, error);
            }
          });
        });
        console.log('删除成功');
        wx.reLaunch({
          url: '/pages/home/home',
        });
      })
      .catch(error => {
        console.error('删除失败', error);
      });
  },
  onCommentInput(event) {
    this.setData({
      commentInput: event.detail.value,
    });
  },
  onCommentSubmit() {
    const { commentInput } = this.data;
    const newComment = {
      username: app.globalData.username,
      content: commentInput,
    };
    const { comments } = this.data;
    comments.push(newComment);
    this.setData({
      comments,
      commentInput: '',
    });
  },
  showPopUp(title, content, hasCancel) {
    wx.showModal({
      title: title,
      content: content,
      showCancel: hasCancel
    });
  }
});