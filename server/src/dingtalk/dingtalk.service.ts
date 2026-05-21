import * as crypto from 'crypto';
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
   * Sign the DingTalk webhook request for security
   * Reference: https://open.dingtalk.com/document/robots/customize-robot-security-settings
   */
  private sign(timestamp: number, secret: string): string {
    const stringToSign = `${timestamp}\n${secret}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(stringToSign);
    return encodeURIComponent(hmac.digest('base64'));
  }

  /**
   * Send a notification to DingTalk group robot
   * Required env vars:
   * - DINGTALK_WEBHOOK_URL: Webhook URL from DingTalk robot
   * - DINGTALK_SECRET (optional): Secret for signing, if the robot uses sign verification
   * - PROJECT_DOMAIN (optional): Public domain for generating report links
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

    // Build report link
    const domain = process.env.PROJECT_DOMAIN || '';
    const reportPath = `/pages/detail/index?id=${params.reportId}`;
    const reportLink = domain
      ? `${domain}${reportPath}`
      : reportPath;

    console.log('[DingTalkService] report link:', reportLink);

    const message: DingTalkMessage = {
      msgtype: 'markdown',
      markdown: {
        title: '新周报提交通知',
        text:
          `## 新周报提交通知\n\n` +
          `**提交人：** ${params.submitterName}\n\n` +
          `**提交时间：** ${params.submitTime}\n\n` +
          `**周报链接：** [点击查看周报详情](${reportLink})\n\n` +
          `请及时查看并批复。`,
      },
    };

    try {
      // Build final URL with optional signing
      let finalUrl = webhookUrl;
      const secret = process.env.DINGTALK_SECRET;
      if (secret) {
        const timestamp = Date.now();
        const sign = this.sign(timestamp, secret);
        const separator = webhookUrl.includes('?') ? '&' : '?';
        finalUrl = `${webhookUrl}${separator}timestamp=${timestamp}&sign=${sign}`;
      }

      const response = await fetch(finalUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      const result = (await response.json()) as any;
      console.log('[DingTalkService] notification result:', JSON.stringify(result));

      if (result?.errcode === 0) {
        console.log('[DingTalkService] notification sent successfully');
        return true;
      } else {
        console.error('[DingTalkService] notification failed:', result?.errmsg || result);
        return false;
      }
    } catch (error) {
      console.error('[DingTalkService] error sending notification:', error);
      return false;
    }
  }
}
