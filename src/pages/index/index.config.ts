export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '周报邮筒' })
  : { navigationBarTitleText: '周报邮筒' }
