import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input as UiInput } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Network } from '@/network'
import { Plus, Trash2, Upload, FileText, Send, CircleAlert } from 'lucide-react-taro'
import './index.css'

interface ReportItem {
  id: string
  content: string
}

interface Attachment {
  name: string
  key: string
  size: number
}

const CATEGORY_CONFIG = {
  deviation: { title: '暴露偏差的事项', required: false, color: '#ef4444' },
  collaboration: { title: '申请协同的事项', required: true, color: '#2563eb' },
  other: { title: '其他重要事项', required: false, color: '#f59e0b' },
} as const

type CategoryKey = keyof typeof CATEGORY_CONFIG

const createEmptyItem = (): ReportItem => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
  content: '',
})

export default function IndexPage() {
  const [submitterName, setSubmitterName] = useState('')
  const [deviationItems, setDeviationItems] = useState<ReportItem[]>([createEmptyItem()])
  const [collaborationItems, setCollaborationItems] = useState<ReportItem[]>([createEmptyItem()])
  const [otherItems, setOtherItems] = useState<ReportItem[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const itemsMap: Record<CategoryKey, ReportItem[]> = {
    deviation: deviationItems,
    collaboration: collaborationItems,
    other: otherItems,
  }

  const setItemsMap: Record<CategoryKey, React.Dispatch<React.SetStateAction<ReportItem[]>>> = {
    deviation: setDeviationItems,
    collaboration: setCollaborationItems,
    other: setOtherItems,
  }

  const addItem = (category: CategoryKey) => {
    setItemsMap[category](prev => [...prev, createEmptyItem()])
  }

  const removeItem = (category: CategoryKey, id: string) => {
    setItemsMap[category](prev => prev.filter(item => item.id !== id))
  }

  const updateItem = (category: CategoryKey, id: string, content: string) => {
    setItemsMap[category](prev => prev.map(item => item.id === id ? { ...item, content } : item))
  }

  const handleChooseFile = async () => {
    try {
      const res = await Taro.chooseMessageFile({ count: 5, type: 'all' })
      if (res.tempFiles?.length) {
        setUploadingFile(true)
        for (const file of res.tempFiles) {
          const uploadRes = await Network.uploadFile({
            url: '/api/weekly-report/upload',
            filePath: file.path,
            name: 'file',
          })
          console.log('upload response:', uploadRes.data)
          const data = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data
          if (data?.data) {
            setAttachments(prev => [...prev, {
              name: file.name,
              key: data.data.file_key,
              size: file.size,
            }])
          }
        }
        setUploadingFile(false)
        Taro.showToast({ title: '上传成功', icon: 'success' })
      }
    } catch (err) {
      setUploadingFile(false)
      console.error('文件选择失败:', err)
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const validateForm = (): string | null => {
    if (!submitterName.trim()) return '请填写提交人姓名'
    const validCollab = collaborationItems.filter(i => i.content.trim())
    if (validCollab.length === 0) return '申请协同的事项为必填项，请至少填写一项'
    return null
  }

  const handleSubmit = async () => {
    const error = validateForm()
    if (error) {
      Taro.showToast({ title: error, icon: 'none' })
      return
    }

    setSubmitting(true)
    try {
      const items: { category: string; content: string }[] = []
      for (const [category, list] of Object.entries(itemsMap)) {
        for (const item of list) {
          if (item.content.trim()) {
            items.push({ category, content: item.content.trim() })
          }
        }
      }

      const res = await Network.request({
        url: '/api/weekly-report/submit',
        method: 'POST',
        data: {
          submitter_name: submitterName.trim(),
          items,
          attachments: attachments.map(a => ({ file_key: a.key, file_name: a.name, file_size: a.size })),
        },
      })
      console.log('submit response:', res.data)
      const data = res.data?.data ?? res.data

      if (data?.status === 'rejected') {
        setRejectReason(data.reject_reason || '内容包含红线内容，请修改后重新提交')
        setShowRejectDialog(true)
        setSubmitting(false)
        return
      }

      Taro.showToast({ title: '提交成功', icon: 'success' })
      setSubmitting(false)
      setSubmitterName('')
      setDeviationItems([createEmptyItem()])
      setCollaborationItems([createEmptyItem()])
      setOtherItems([])
      setAttachments([])
    } catch (err) {
      setSubmitting(false)
      console.error('提交失败:', err)
      Taro.showToast({ title: '提交失败，请重试', icon: 'none' })
    }
  }

  const renderSection = (category: CategoryKey) => {
    const config = CATEGORY_CONFIG[category]
    const items = itemsMap[category]

    return (
      <View className="mb-4">
        {/* Section Header */}
        <View className="flex flex-row items-center justify-between mb-2 px-1">
          <View className="flex flex-row items-center gap-2">
            <View className="w-1 h-4 rounded-full" style={{ backgroundColor: config.color }} />
            <Text className="block text-sm font-semibold text-gray-800">{config.title}</Text>
            {config.required && <Badge variant="destructive" className="text-xs">必填</Badge>}
          </View>
          <Button variant="ghost" size="sm" onClick={() => addItem(category)}>
            <Plus size={14} color="#2563eb" />
            <Text className="text-blue-600 text-xs">新增</Text>
          </Button>
        </View>
        {/* Items */}
        {items.length === 0 && (
          <View className="py-3 flex items-center justify-center bg-gray-50 rounded-lg">
            <Text className="block text-xs text-gray-400">暂无事项，点击新增</Text>
          </View>
        )}
        {items.map((item, index) => (
          <View key={item.id} className="flex flex-row items-center gap-2 mb-2">
            <Text className="block text-xs text-gray-300 shrink-0">{index + 1}</Text>
            <View className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
              <UiInput
                className="w-full bg-transparent text-sm"
                placeholder="请输入事项内容"
                value={item.content}
                onInput={(e) => updateItem(category, item.id, e.detail.value)}
              />
            </View>
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removeItem(category, item.id)}>
              <Trash2 size={14} color="#ef4444" />
            </Button>
          </View>
        ))}
      </View>
    )
  }

  return (
    <View className="w-full min-h-full bg-gray-50 pb-6">
      {/* Header */}
      <View className="bg-blue-600 px-4 pt-4 pb-6">
        <Text className="block text-xl font-bold text-white">周报邮筒</Text>
        <Text className="block text-sm text-blue-100 mt-1">暴露偏差，申请协同</Text>
      </View>

      <View className="px-4 -mt-4 gap-3 flex flex-col">
        {/* Submitter Name */}
        <View className="bg-white rounded-xl p-4 shadow-sm">
          <Text className="block text-sm font-medium text-gray-700 mb-2">提交人姓名</Text>
          <View className="bg-gray-50 rounded-lg px-3 py-2">
            <UiInput
              className="w-full bg-transparent text-sm"
              placeholder="请输入您的姓名"
              value={submitterName}
              onInput={(e) => setSubmitterName(e.detail.value)}
            />
          </View>
        </View>

        {/* Red Line Reminder */}
        <Alert>
          <CircleAlert size={14} color="#f59e0b" className="shrink-0" />
          <AlertDescription>
            <Text className="block text-xs text-amber-700">
              红线：禁止提交纯流水账（如&ldquo;周一开会，周二整理资料&rdquo;）和已达成无风险的常规工作，触碰将自动退回
            </Text>
          </AlertDescription>
        </Alert>

        {/* Three Module Sections */}
        <View className="bg-white rounded-xl p-4 shadow-sm">
          {renderSection('deviation')}
          {renderSection('collaboration')}
          {renderSection('other')}
        </View>

        {/* Attachments */}
        <View className="bg-white rounded-xl p-4 shadow-sm">
          <View className="flex flex-row items-center justify-between mb-2">
            <View className="flex flex-row items-center gap-2">
              <FileText size={14} color="#6b7280" />
              <Text className="block text-sm font-semibold text-gray-800">附件</Text>
            </View>
            <Button variant="ghost" size="sm" onClick={handleChooseFile} disabled={uploadingFile}>
              <Upload size={14} color="#2563eb" />
              <Text className="text-blue-600 text-xs">{uploadingFile ? '上传中...' : '上传'}</Text>
            </Button>
          </View>
          {attachments.length === 0 && (
            <View className="py-3 flex items-center justify-center">
              <Text className="block text-xs text-gray-400">暂无附件</Text>
            </View>
          )}
          {attachments.map((att, index) => (
            <View key={index} className="flex flex-row items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
              <View className="flex flex-row items-center gap-2 flex-1 min-w-0">
                <FileText size={12} color="#9ca3af" className="shrink-0" />
                <Text className="block text-sm text-gray-700 truncate">{att.name}</Text>
              </View>
              <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removeAttachment(index)}>
                <Trash2 size={12} color="#ef4444" />
              </Button>
            </View>
          ))}
        </View>

        {/* Submit Button */}
        <Button
          className="w-full bg-blue-600 text-white rounded-xl py-3"
          size="lg"
          disabled={submitting}
          onClick={handleSubmit}
        >
          <Send size={16} color="#fff" />
          <Text className="text-white font-semibold">{submitting ? '提交中...' : '提交周报'}</Text>
        </Button>
      </View>

      {/* Red Line Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <View className="flex flex-row items-center gap-2">
                <CircleAlert size={20} color="#ef4444" />
                <Text className="text-red-600 font-bold">周报被退回</Text>
              </View>
            </DialogTitle>
          </DialogHeader>
          <View className="py-4">
            <Text className="block text-sm text-gray-700 mb-2">您的周报内容触碰了红线：</Text>
            <View className="bg-red-50 rounded-lg p-3">
              <Text className="block text-sm text-red-700">{rejectReason}</Text>
            </View>
          </View>
          <DialogFooter>
            <Button onClick={() => setShowRejectDialog(false)} className="bg-blue-600 text-white">
              <Text className="text-white">知道了，去修改</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  )
}
