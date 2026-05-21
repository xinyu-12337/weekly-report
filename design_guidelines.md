# 周报邮筒 - 设计指南

## 品牌定位
- 应用类型：企业内部工具
- 设计风格：简洁、专业、高效
- 目标用户：公司员工提交周报，总经理查看批复

## 配色方案
- 主色：`bg-blue-600` / `text-blue-600`（信任感、专业感）
- 辅色：`bg-orange-500`（重要操作、警示）
- 中性色：`text-gray-900`（标题）、`text-gray-600`（正文）、`text-gray-400`（提示）
- 语义色：`text-red-500`（红线退回）、`text-green-600`（已提交）
- 背景：`bg-gray-50`（页面底色）、`bg-white`（卡片）

## 字体规范
- 页面标题：`text-xl font-bold`
- 模块标题：`text-base font-semibold`
- 正文：`text-sm`
- 辅助文字：`text-xs text-gray-400`

## 间距系统
- 页面边距：`p-4`
- 卡片内边距：`p-4`
- 模块间距：`gap-4`
- 列表项间距：`gap-2`

## 组件使用原则
- 通用 UI 组件优先使用 `@/components/ui/*`
- Button、Input、Card、Alert、Dialog、Badge 等从组件库导入
- 容器样式使用圆角 `rounded-xl`、阴影 `shadow-sm`

## 导航结构
- 无 TabBar，单页操作流
- 首页：周报提交表单
- 历史页：周报提交历史
- 详情页：周报详情与批复

## 状态展示
- 已提交：绿色 Badge
- 已退回：红色 Badge
- 已批复：蓝色 Badge
- 加载态：Skeleton
- 空状态：居中提示文字
