Page({
  onLoad: function(options) {
    var post = JSON.parse(options.post);
    this.setData({
      post: post
    });
  }
});
