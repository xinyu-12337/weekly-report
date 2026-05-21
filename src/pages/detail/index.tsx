import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea as UiTextarea } from '@/components/ui/textarea'
import { Network } from '@/network'
import { User, Clock, FileText, CircleAlert, MessageSquare, Download } from 'lucide-react-taro'

interface ReportItem {
  id: string
  category: string
  content: string
  manager_reply: string | null
}

interface Attachment {
  id: string
  file_key: string
  file_name: string
  file_size: number | null
}

interface Report {
  id: string
  submitter_name: string
  status: string
  reject_reason: string | null
  created_at: string
  items: ReportItem[]
  attachments: Attachment[]
}

const CATEGORY_MAP: Record<string, { title: string; color: string }> = {
  deviation: { title: '暴露偏差的事项', color: '#ef4444' },
  collaboration: { title: '申请协同的事项', color: '#2563eb' },
  other: { title: '其他重要事项', color: '#f59e0b' },
}

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }> = {
  submitted: { label: '已提交', variant: 'default' },
  rejected: { label: '已退回', variant: 'destructive' },
  reviewed: { label: '已批复', variant: 'secondary' },
}

export default function DetailPage() {
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)

  useEffect(() => {
    const params = Taro.getCurrentInstance().router?.params
    if (params?.id) {
      fetchReport(params.id)
    }
  }, [])

  const fetchReport = async (id: string) => {
    try {
      const res = await Network.request({ url: `/api/weekly-report/${id}` })
      console.log('detail response:', res.data)
      const data = res.data?.data ?? res.data
      setReport(data as Report)
    } catch (err) {
      console.error('获取周报详情失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitReply = async (itemId: string) => {
    if (!replyText.trim()) {
      Taro.showToast({ title: '请输入批复内容', icon: 'none' })
      return
    }
    setSubmittingReply(true)
    try {
      await Network.request({
        url: '/api/weekly-report/reply',
        method: 'POST',
        data: { item_id: itemId, manager_reply: replyText.trim() },
      })
      Taro.showToast({ title: '批复成功', icon: 'success' })
      setReplyingId(null)
      setReplyText('')
      // Refresh
      if (report) fetchReport(report.id)
    } catch (err) {
      console.error('批复失败:', err)
      Taro.showToast({ title: '批复失败', icon: 'none' })
    } finally {
      setSubmittingReply(false)
    }
  }

  const handleDownloadAttachment = async (fileKey: string, _fileName: string) => {
    try {
      const res = await Network.request({
        url: '/api/weekly-report/attachment-url',
        method: 'POST',
        data: { file_key: fileKey },
      })
      const data = res.data?.data ?? res.data
      if (data?.url) {
        Taro.navigateTo({ url: `/pages/webview/index?url=${encodeURIComponent(data.url)}` })
      }
    } catch (err) {
      console.error('获取附件链接失败:', err)
      Taro.showToast({ title: '获取附件失败', icon: 'none' })
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  if (loading) {
    return (
      <View className="w-full min-h-full bg-gray-50 p-4 gap-3 flex flex-col">
        <Skeleton className="w-full h-20 rounded-xl" />
        <Skeleton className="w-full h-40 rounded-xl" />
        <Skeleton className="w-full h-40 rounded-xl" />
      </View>
    )
  }

  if (!report) {
    return (
      <View className="w-full min-h-full bg-gray-50 flex items-center justify-center">
        <Text className="block text-gray-400">周报不存在</Text>
      </View>
    )
  }

  // Group items by category
  const groupedItems: Record<string, ReportItem[]> = {}
  for (const item of report.items || []) {
    if (!groupedItems[item.category]) groupedItems[item.category] = []
    groupedItems[item.category].push(item)
  }

  return (
    <View className="w-full min-h-full bg-gray-50 pb-6">
      {/* Header */}
      <View className="bg-blue-600 px-4 pt-3 pb-5">
        <View className="flex flex-row items-center gap-2">
          <User size={16} color="#fff" />
          <Text className="block text-lg font-bold text-white">{report.submitter_name}</Text>
          <Badge variant={STATUS_MAP[report.status]?.variant || 'default'}>
            {STATUS_MAP[report.status]?.label || '已提交'}
          </Badge>
        </View>
        <View className="flex flex-row items-center gap-1 mt-1">
          <Clock size={12} color="#bfdbfe" />
          <Text className="block text-xs text-blue-100">{formatDate(report.created_at)}</Text>
        </View>
      </View>

      <View className="px-4 -mt-3 gap-3 flex flex-col">
        {/* Rejection Notice */}
        {report.status === 'rejected' && report.reject_reason && (
          <Alert>
            <CircleAlert size={16} color="#ef4444" className="shrink-0" />
            <AlertDescription>
              <Text className="block text-sm text-red-700 font-semibold">退回原因</Text>
              <Text className="block text-sm text-red-600 mt-1">{report.reject_reason}</Text>
            </AlertDescription>
          </Alert>
        )}

        {/* Items by Category */}
        {Object.entries(CATEGORY_MAP).map(([category, config]) => {
          const items = groupedItems[category] || []
          if (items.length === 0) return null
          return (
            <Card key={category}>
              <CardHeader className="pb-3">
                <View className="flex flex-row items-center gap-2">
                  <View className="w-1 h-4 rounded-full" style={{ backgroundColor: config.color }} />
                  <CardTitle className="text-base">{config.title}</CardTitle>
                </View>
              </CardHeader>
              <CardContent className="gap-3">
                {items.map((item, index) => (
                  <View key={item.id} className="border-b border-gray-100 last:border-b-0 pb-3 last:pb-0">
                    <View className="flex flex-row items-start gap-2">
                      <Text className="block text-xs text-gray-400 shrink-0 mt-1">{index + 1}.</Text>
                      <Text className="block text-sm text-gray-800 flex-1">{item.content}</Text>
                    </View>

                    {/* Manager Reply */}
                    <View className="mt-2 ml-4">
                      <View className="flex flex-row items-center gap-1 mb-1">
                        <MessageSquare size={12} color="#6b7280" />
                        <Text className="block text-xs font-medium text-gray-500">总经理批复</Text>
                      </View>
                      {item.manager_reply ? (
                        <View className="bg-blue-50 rounded-lg p-2">
                          <Text className="block text-sm text-blue-800">{item.manager_reply}</Text>
                        </View>
                      ) : replyingId === item.id ? (
                        <View className="gap-2 flex flex-col">
                          <View className="bg-gray-50 rounded-lg p-2">
                            <UiTextarea
                              className="w-full bg-transparent"
                              placeholder="请输入批复内容..."
                              value={replyText}
                              onInput={(e) => setReplyText(e.detail.value)}
                              maxlength={500}
                            />
                          </View>
                          <View className="flex flex-row gap-2">
                            <Button size="sm" variant="outline" onClick={() => { setReplyingId(null); setReplyText('') }}>
                              <Text className="text-xs">取消</Text>
                            </Button>
                            <Button size="sm" className="bg-blue-600 text-white" disabled={submittingReply} onClick={() => handleSubmitReply(item.id)}>
                              <Text className="text-xs text-white">{submittingReply ? '提交中...' : '确认批复'}</Text>
                            </Button>
                          </View>
                        </View>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => { setReplyingId(item.id); setReplyText('') }}>
                          <MessageSquare size={12} color="#2563eb" />
                          <Text className="text-xs text-blue-600">添加批复</Text>
                        </Button>
                      )}
                    </View>
                  </View>
                ))}
              </CardContent>
            </Card>
          )
        })}

        {/* Attachments */}
        {report.attachments && report.attachments.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <View className="flex flex-row items-center gap-2">
                <FileText size={16} color="#6b7280" />
                <CardTitle className="text-base">附件</CardTitle>
              </View>
            </CardHeader>
            <CardContent>
              {report.attachments.map(att => (
                <View key={att.id} className="flex flex-row items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <View className="flex flex-row items-center gap-2 flex-1 min-w-0">
                    <FileText size={14} color="#6b7280" className="shrink-0" />
                    <Text className="block text-sm text-gray-700 truncate">{att.file_name}</Text>
                  </View>
                  <Button variant="ghost" size="sm" onClick={() => handleDownloadAttachment(att.file_key, att.file_name)}>
                    <Download size={14} color="#2563eb" />
                  </Button>
                </View>
              ))}
            </CardContent>
          </Card>
        )}
      </View>
    </View>
  )
}
