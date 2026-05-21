export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/review/index',
    'pages/history/index',
    'pages/detail/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: '周报邮筒',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#2563eb',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '提交',
        iconPath: './assets/tabbar/send.png',
        selectedIconPath: './assets/tabbar/send-active.png',
      },
      {
        pagePath: 'pages/review/index',
        text: '查看',
        iconPath: './assets/tabbar/file-text.png',
        selectedIconPath: './assets/tabbar/file-text-active.png',
      }
    ]
  }
})
