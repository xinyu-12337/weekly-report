import { Controller, Get, Post, Body, Param, UploadedFile, UseInterceptors, HttpCode, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { WeeklyReportService } from './weekly-report.service';

@Controller('weekly-report')
export class WeeklyReportController {
  constructor(private readonly weeklyReportService: WeeklyReportService) {}

  @Post('submit')
  @HttpCode(200)
  async submit(@Body() body: {
    submitter_name: string;
    items: { category: string; content: string }[];
    attachments?: { file_key: string; file_name: string; file_size?: number }[];
  }) {
    console.log('[WeeklyReportController] submit body:', JSON.stringify(body));

    if (!body.submitter_name?.trim()) {
      throw new BadRequestException('提交人姓名不能为空');
    }
    if (!body.items || body.items.length === 0) {
      throw new BadRequestException('请至少填写一项周报内容');
    }

    const validItems = body.items.filter(i => i.content?.trim());
    if (validItems.length === 0) {
      throw new BadRequestException('请至少填写一项有效内容');
    }

    // Check if any collaboration items exist (required)
    const collabItems = validItems.filter(i => i.category === 'collaboration');
    if (collabItems.length === 0) {
      throw new BadRequestException('申请协同的事项为必填项');
    }

    return await this.weeklyReportService.submit({
      submitterName: body.submitter_name.trim(),
      items: validItems,
      attachments: body.attachments || [],
    });
  }

  @Get('list')
  async list() {
    console.log('[WeeklyReportController] list');
    return await this.weeklyReportService.list();
  }

  @Get(':id')
  async getDetail(@Param('id') id: string) {
    console.log('[WeeklyReportController] getDetail id:', id);
    if (!id) {
      throw new BadRequestException('周报ID不能为空');
    }
    return await this.weeklyReportService.getDetail(id);
  }

  @Post('reply')
  @HttpCode(200)
  async reply(@Body() body: { item_id: string; manager_reply: string }) {
    console.log('[WeeklyReportController] reply body:', JSON.stringify(body));

    if (!body.item_id) {
      throw new BadRequestException('事项ID不能为空');
    }
    if (!body.manager_reply?.trim()) {
      throw new BadRequestException('批复内容不能为空');
    }

    return await this.weeklyReportService.reply(body.item_id, body.manager_reply.trim());
  }

  @Post('upload')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  }))
  async upload(@UploadedFile() file: Express.Multer.File) {
    console.log('[WeeklyReportController] upload file:', file?.originalname, file?.mimetype, file?.size);

    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    return await this.weeklyReportService.uploadFile(file);
  }

  @Post('attachment-url')
  @HttpCode(200)
  async getAttachmentUrl(@Body() body: { file_key: string }) {
    console.log('[WeeklyReportController] getAttachmentUrl file_key:', body.file_key);

    if (!body.file_key) {
      throw new BadRequestException('文件key不能为空');
    }

    return await this.weeklyReportService.getAttachmentUrl(body.file_key);
  }
}
