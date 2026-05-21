import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { LlmService } from '@/llm/llm.service';
import { DingTalkService } from '@/dingtalk/dingtalk.service';
import { StorageService } from '@/storage/object/storage.service';

@Injectable()
export class WeeklyReportService {
  constructor(
    private readonly llmService: LlmService,
    private readonly dingTalkService: DingTalkService,
    private readonly storageService: StorageService,
  ) {}

  private getSupabase() {
    return getSupabaseClient();
  }

  async submit(params: {
    submitterName: string;
    items: { category: string; content: string }[];
    attachments: { file_key: string; file_name: string; file_size?: number }[];
  }) {
    // Step 1: Check red line using LLM
    const redLineResult = await this.llmService.checkRedLine(params.items);
    console.log('[WeeklyReportService] red line check result:', redLineResult);

    if (redLineResult.isRedLine) {
      return {
        code: 200,
        msg: 'red_line_rejected',
        data: {
          status: 'rejected',
          reject_reason: redLineResult.reason,
        },
      };
    }

    // Step 2: Save to database using Supabase client
    const supabase = this.getSupabase();

    // Insert report
    const { data: report, error: reportError } = await supabase
      .from('weekly_reports')
      .insert({
        submitter_name: params.submitterName,
        status: 'submitted',
      })
      .select()
      .single();

    if (reportError) {
      console.error('[WeeklyReportService] insert report error:', reportError);
      throw new Error('保存周报失败: ' + reportError.message);
    }

    console.log('[WeeklyReportService] inserted report:', report);

    // Insert items
    if (params.items.length > 0) {
      const itemValues = params.items.map((item, index) => ({
        report_id: report.id,
        category: item.category,
        content: item.content,
        sort_order: index,
      }));
      const { error: itemsError } = await supabase
        .from('weekly_report_items')
        .insert(itemValues);

      if (itemsError) {
        console.error('[WeeklyReportService] insert items error:', itemsError);
        throw new Error('保存周报事项失败: ' + itemsError.message);
      }
    }

    // Insert attachments
    if (params.attachments.length > 0) {
      const attachmentValues = params.attachments.map(att => ({
        report_id: report.id,
        file_key: att.file_key,
        file_name: att.file_name,
        file_size: att.file_size || null,
      }));
      const { error: attError } = await supabase
        .from('weekly_report_attachments')
        .insert(attachmentValues);

      if (attError) {
        console.error('[WeeklyReportService] insert attachments error:', attError);
        throw new Error('保存附件失败: ' + attError.message);
      }
    }

    // Step 3: Send DingTalk notification
    const submitTime = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    await this.dingTalkService.sendWeeklyReportNotification({
      submitterName: params.submitterName,
      submitTime,
      reportId: report.id,
    });

    return {
      code: 200,
      msg: 'success',
      data: {
        id: report.id,
        status: 'submitted',
      },
    };
  }

  async list() {
    const supabase = this.getSupabase();
    const { data, error } = await supabase
      .from('weekly_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[WeeklyReportService] list error:', error);
      throw new Error('获取周报列表失败: ' + error.message);
    }

    return {
      code: 200,
      msg: 'success',
      data: data || [],
    };
  }

  async getDetail(id: string) {
    const supabase = this.getSupabase();

    const { data: report, error: reportError } = await supabase
      .from('weekly_reports')
      .select('*')
      .eq('id', id)
      .single();

    if (reportError || !report) {
      console.error('[WeeklyReportService] getDetail error:', reportError);
      return {
        code: 404,
        msg: '周报不存在',
        data: null,
      };
    }

    const { data: items, error: itemsError } = await supabase
      .from('weekly_report_items')
      .select('*')
      .eq('report_id', id)
      .order('sort_order', { ascending: true });

    if (itemsError) {
      console.error('[WeeklyReportService] getDetail items error:', itemsError);
    }

    const { data: attachments, error: attError } = await supabase
      .from('weekly_report_attachments')
      .select('*')
      .eq('report_id', id);

    if (attError) {
      console.error('[WeeklyReportService] getDetail attachments error:', attError);
    }

    return {
      code: 200,
      msg: 'success',
      data: {
        ...report,
        items: items || [],
        attachments: attachments || [],
      },
    };
  }

  async reply(itemId: string, managerReply: string) {
    const supabase = this.getSupabase();

    // Get the item to find report_id
    const { data: item, error: itemError } = await supabase
      .from('weekly_report_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (itemError || !item) {
      return {
        code: 404,
        msg: '事项不存在',
        data: null,
      };
    }

    // Update the item's reply
    const { error: updateError } = await supabase
      .from('weekly_report_items')
      .update({ manager_reply: managerReply })
      .eq('id', itemId);

    if (updateError) {
      console.error('[WeeklyReportService] reply update error:', updateError);
      throw new Error('批复保存失败: ' + updateError.message);
    }

    // Check if all items in the report have replies
    const { data: allItems } = await supabase
      .from('weekly_report_items')
      .select('id, manager_reply')
      .eq('report_id', item.report_id);

    const allReplied = (allItems || []).every(i => i.manager_reply || i.id === itemId);

    if (allReplied) {
      await supabase
        .from('weekly_reports')
        .update({ status: 'reviewed' })
        .eq('id', item.report_id);
    }

    return {
      code: 200,
      msg: 'success',
      data: { item_id: itemId, manager_reply: managerReply },
    };
  }

  async uploadFile(file: Express.Multer.File) {
    let content: Buffer;
    if (file.buffer) {
      content = file.buffer;
    } else {
      throw new Error('无法获取文件内容');
    }

    const fileKey = await this.storageService.upload({
      buffer: content,
      filename: file.originalname,
      mimetype: file.mimetype,
    });

    return {
      code: 200,
      msg: 'success',
      data: {
        file_key: fileKey,
        file_name: file.originalname,
        file_size: file.size,
      },
    };
  }

  async getAttachmentUrl(fileKey: string) {
    const url = await this.storageService.getPublicUrl(fileKey);
    return {
      code: 200,
      msg: 'success',
      data: { url },
    };
  }
}
