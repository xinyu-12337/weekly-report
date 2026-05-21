import { Injectable } from '@nestjs/common';

interface DingTalkMessage {
  msgtype: string;
  markdown: {
    title: string;
    text: string;
  };
}

@Injectable()
export class DingTalkService {
  /**
   * Send a notification to DingTalk group robot
   * The webhook URL will be configured via environment variable DINGTALK_WEBHOOK_URL
   */
  async sendWeeklyReportNotification(params: {
    submitterName: string;
    submitTime: string;
    reportId: string;
  }): Promise<boolean> {
    const webhookUrl = process.env.DINGTALK_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn('[DingTalkService] DINGTALK_WEBHOOK_URL not configured, skipping notification');
      return false;
    }

    // TODO: Replace with actual mini-program link when AppID is available
    const reportLink = `pages/detail/index?id=${params.reportId}`;

    const message: DingTalkMessage = {
      msgtype: 'markdown',
      markdown: {
        title: '新周报提交通知',
        text: `## 新周报提交通知\n\n` +
          `**提交人：** ${params.submitterName}\n\n` +
          `**提交时间：** ${params.submitTime}\n\n` +
          `**周报链接：** [点击查看周报](${reportLink})\n\n` +
          `请及时查看并批复。`,
      },
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      const result = await response.json() as any;
      console.log('[DingTalkService] notification sent:', result);

      if (result?.errcode === 0) {
        return true;
      } else {
        console.error('[DingTalkService] notification failed:', result);
        return false;
      }
    } catch (error) {
      console.error('[DingTalkService] error sending notification:', error);
      return false;
    }
  }
}
