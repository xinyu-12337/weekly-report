export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '周报历史' })
  : { navigationBarTitleText: '周报历史' }
