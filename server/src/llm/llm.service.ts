import { Injectable } from '@nestjs/common';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

interface RedLineCheckResult {
  shouldReject: boolean;
  rejectReason: string;
  filteredItems: { category: string; content: string; originalIndex: number }[];
  removedItems: { category: string; content: string; reason: string }[];
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
      return { shouldReject: false, rejectReason: '', filteredItems: [], removedItems: [] };
    }

    const contentText = items
      .map((item, index) => `[${index}] [${item.category}] ${item.content}`)
      .join('\n');

    const prompt = `你是一个周报内容审核助手。请逐条审核以下周报事项，执行两个判断：

## 一、整体退回判断
如果所有事项都是"纯流水账"（只汇报什么时间做了什么事情，例如"周一开会、周二整理文档、周三代码review"），没有暴露偏差、不需要协同、也没有重要事项，则整体退回。

## 二、逐条删除判断
如果某个事项属于"已达成且无风险的常规工作"（仅描述完成了某项常规工作，没有偏差、没有协同需求、不是重要事项），则标记为需要删除。

## 审核规则说明：
- 纯流水账 = 按时间顺序罗列做了什么事，没有暴露问题、不需要帮助、没有重要信息
- 已达成无风险的常规工作 = 完成了日常性工作，没有偏差、风险或需要关注的地方
- 以下内容应保留：暴露偏差、申请协同、有风险/有重要影响的事项

## 待审核内容：
${contentText}

## 请严格按照以下JSON格式返回（不要返回其他内容）：
{
  "shouldReject": true/false,
  "rejectReason": "整体退回原因，如果不退回则为空字符串",
  "itemResults": [
    {"index": 0, "shouldRemove": true/false, "removeReason": "删除原因，如果不删除则为空字符串"},
    {"index": 1, "shouldRemove": true/false, "removeReason": "删除原因，如果不删除则为空字符串"}
  ]
}`;

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

      // Try to extract JSON from the response - find the outermost balanced braces
      let jsonStr: string | null = null;
      const startIndex = text.indexOf('{');
      if (startIndex !== -1) {
        let depth = 0;
        for (let i = startIndex; i < text.length; i++) {
          if (text[i] === '{') depth++;
          else if (text[i] === '}') depth--;
          if (depth === 0) {
            jsonStr = text.substring(startIndex, i + 1);
            break;
          }
        }
      }

      if (jsonStr) {
        const parsed = JSON.parse(jsonStr);

        // If should reject entirely
        if (parsed.shouldReject) {
          return {
            shouldReject: true,
            rejectReason: parsed.rejectReason || '提交内容为纯流水账，请重新填写',
            filteredItems: [],
            removedItems: [],
          };
        }

        // Otherwise, filter out items that should be removed
        const itemResults: { index: number; shouldRemove: boolean; removeReason: string }[] = parsed.itemResults || [];
        const removedIndices = new Set(
          itemResults.filter(r => r.shouldRemove).map(r => r.index)
        );

        const filteredItems = items
          .map((item, index) => ({ ...item, originalIndex: index }))
          .filter((_, index) => !removedIndices.has(index));

        const removedItems = items
          .map((item, index) => {
            const result = itemResults.find(r => r.index === index);
            if (result?.shouldRemove) {
              return { category: item.category, content: item.content, reason: result.removeReason || '' };
            }
            return null;
          })
          .filter(Boolean) as { category: string; content: string; reason: string }[];

        return {
          shouldReject: false,
          rejectReason: '',
          filteredItems,
          removedItems,
        };
      }

      // If no JSON found, default to pass through
      console.warn('[LlmService] Could not parse LLM response as JSON, defaulting to pass through');
      return {
        shouldReject: false,
        rejectReason: '',
        filteredItems: items.map((item, index) => ({ ...item, originalIndex: index })),
        removedItems: [],
      };
    } catch (error) {
      console.error('[LlmService] Error checking red line:', error);
      // If LLM fails, allow submission to go through (fail open)
      return {
        shouldReject: false,
        rejectReason: '',
        filteredItems: items.map((item, index) => ({ ...item, originalIndex: index })),
        removedItems: [],
      };
    }
  }
}
