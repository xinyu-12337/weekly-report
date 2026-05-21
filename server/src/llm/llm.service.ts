import { Injectable } from '@nestjs/common';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

interface RedLineCheckResult {
  isRedLine: boolean;
  reason: string;
}

@Injectable()
export class LlmService {
  private client: LLMClient;

  constructor() {
    const config = new Config();
    this.client = new LLMClient(config);
  }

  async checkRedLine(items: { category: string; content: string }[]): Promise<RedLineCheckResult> {
    if (!items || items.length === 0) {
      return { isRedLine: false, reason: '' };
    }

    const contentText = items
      .map(item => `[${item.category}] ${item.content}`)
      .join('\n');

    const prompt = `你是一个周报内容审核助手。请审核以下周报内容是否触碰红线。

## 红线规则（触碰任意一条即退回）：
1. 纯过程流水账：只汇报什么时间做了什么事情，没有暴露偏差、不需要协同、也没有重要事项需要关注
2. 已达成且无风险的常规工作：仅描述完成的常规工作，没有偏差、协同需求或重要事项

## 绿线规则（符合以下内容的应该通过）：
1. 暴露偏差的事项：对目标理解可能存在的偏差
2. 申请协同的事项：需要其他部门协同的事项
3. 其他重要事项：需要关注的重要事项

## 待审核内容：
${contentText}

## 请严格按照以下JSON格式返回（不要返回其他内容）：
{"isRedLine": true/false, "reason": "退回原因说明，如果不触碰红线则为空字符串"}`;

    try {
      const response = await this.client.invoke(
        [{ role: 'user', content: prompt }],
        {
          model: 'doubao-seed-2-0-mini-260215',
          temperature: 0.1,
        },
      );

      console.log('[LlmService] red line check response:', response.content);

      const text = response.content || '';

      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*?"isRedLine"[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          isRedLine: !!parsed.isRedLine,
          reason: parsed.reason || '',
        };
      }

      // If no JSON found, default to not red line
      console.warn('[LlmService] Could not parse LLM response as JSON, defaulting to not red line');
      return { isRedLine: false, reason: '' };
    } catch (error) {
      console.error('[LlmService] Error checking red line:', error);
      // If LLM fails, allow submission to go through (fail open)
      return { isRedLine: false, reason: '' };
    }
  }
}
