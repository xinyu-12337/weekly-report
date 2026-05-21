import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Network } from '@/network'
import { FileText, ChevronRight, Clock, User, List } from 'lucide-react-taro'

interface Report {
  id: string
  submitter_name: string
  status: string
  reject_reason: string | null
  created_at: string
  item_count: number
}

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }> = {
  submitted: { label: '待批复', variant: 'default' },
  rejected: { label: '已退回', variant: 'destructive' },
  reviewed: { label: '已批复', variant: 'secondary' },
}

export default function ReviewPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      const res = await Network.request({ url: '/api/weekly-report/list' })
      console.log('review list response:', res.data)
      const data = res.data?.data ?? res.data
      setReports(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('获取周报列表失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const goToDetail = (id: string) => {
    Taro.navigateTo({ url: `/pages/detail/index?id=${id}` })
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  if (loading) {
    return (
      <View className="w-full min-h-full bg-gray-50 p-4 gap-3 flex flex-col">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="w-full h-24 rounded-xl" />
        ))}
      </View>
    )
  }

  return (
    <View className="w-full min-h-full bg-gray-50 pb-4">
      {/* Header */}
      <View className="bg-blue-600 px-4 pt-3 pb-5">
        <Text className="block text-lg font-bold text-white">周报查看</Text>
        <Text className="block text-sm text-blue-100 mt-1">共 {reports.length} 份周报</Text>
      </View>

      <View className="px-4 -mt-3 gap-3 flex flex-col">
        {reports.length === 0 && (
          <View className="flex items-center justify-center py-20">
            <View className="flex flex-col items-center gap-2">
              <FileText size={48} color="#d1d5db" />
              <Text className="block text-gray-400 text-sm">暂无周报记录</Text>
            </View>
          </View>
        )}

        {reports.map(report => {
          const statusConfig = STATUS_MAP[report.status] || STATUS_MAP.submitted
          return (
            <Card key={report.id}>
              <CardContent className="p-4">
                <View className="flex flex-row items-center justify-between">
                  <View className="flex-1 min-w-0">
                    {/* Row 1: Submitter + Status */}
                    <View className="flex flex-row items-center gap-2 mb-2">
                      <User size={14} color="#6b7280" className="shrink-0" />
                      <Text className="block text-sm font-semibold text-gray-900">{report.submitter_name}</Text>
                      <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                    </View>
                    {/* Row 2: Time + Item count */}
                    <View className="flex flex-row items-center gap-3">
                      <View className="flex flex-row items-center gap-1">
                        <Clock size={12} color="#9ca3af" className="shrink-0" />
                        <Text className="block text-xs text-gray-400">{formatDate(report.created_at)}</Text>
                      </View>
                      <View className="flex flex-row items-center gap-1">
                        <List size={12} color="#9ca3af" className="shrink-0" />
                        <Text className="block text-xs text-gray-400">{report.item_count ?? 0} 项事项</Text>
                      </View>
                    </View>
                  </View>
                  {/* View Detail Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 ml-3"
                    onClick={() => goToDetail(report.id)}
                  >
                    <Text className="text-xs text-blue-600">查看详情</Text>
                    <ChevronRight size={14} color="#2563eb" />
                  </Button>
                </View>
              </CardContent>
            </Card>
          )
        })}
      </View>
    </View>
  )
}
