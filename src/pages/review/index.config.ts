export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '周报查看' })
  : { navigationBarTitleText: '周报查看' }
