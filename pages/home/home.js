Page({
  data: {
    tabList: [{"text": "0", "key": 0}, {"text": "1", "key": 1}],
    stickyProps: {
      zIndex: 2,
    },
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
  }
});