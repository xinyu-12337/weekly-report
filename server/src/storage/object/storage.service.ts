import { Injectable } from '@nestjs/common';
import { S3Storage } from 'coze-coding-dev-sdk';

@Injectable()
export class StorageService {
  private client: S3Storage;

  constructor() {
    this.client = new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
      accessKey: '',
      secretKey: '',
      bucketName: process.env.COZE_BUCKET_NAME,
      region: 'cn-beijing',
    });
  }

  async upload(params: { buffer: Buffer; filename: string; mimetype: string }): Promise<string> {
    const key = await this.client.uploadFile({
      fileContent: params.buffer,
      fileName: params.filename,
      contentType: params.mimetype,
    });
    console.log('[StorageService] upload result key:', key);
    return key;
  }

  async getPublicUrl(key: string): Promise<string> {
    const url = await this.client.generatePresignedUrl({
      key,
      expireTime: 86400 * 7, // 7 days
    });
    console.log('[StorageService] generated presigned url for key:', key);
    return url;
  }
}
