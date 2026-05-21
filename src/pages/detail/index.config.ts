export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '周报详情' })
  : { navigationBarTitleText: '周报详情' }
