import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const BUCKET = process.env.AWS_S3_BUCKET || '';
const REGION = process.env.AWS_REGION || 'ap-northeast-1';
const CDN_BASE_URL =
  process.env.AWS_CDN_BASE_URL || (BUCKET ? `https://${BUCKET}.s3.${REGION}.amazonaws.com` : '');

function getS3Client() {
  if (!BUCKET) {
    throw new Error('AWS_S3_BUCKET is not configured');
  }
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS credentials are not configured');
  }

  return new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

export interface UploadResult {
  path: string;
  url: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
}

/**
 * S3にファイルをアップロード
 */
export async function uploadToS3(
  buffer: Buffer,
  options: {
    folder: string;
    originalName: string;
    mimeType: string;
    width?: number;
    height?: number;
  }
): Promise<UploadResult> {
  const ext = options.originalName.split('.').pop()?.toLowerCase() || 'bin';
  const filename = `${uuidv4()}.${ext}`;
  const path = `${options.folder}/${filename}`;

  const s3Client = getS3Client();
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: path,
      Body: buffer,
      ContentType: options.mimeType,
    })
  );

  return {
    path,
    url: `${CDN_BASE_URL}/${path}`,
    size: buffer.length,
    mimeType: options.mimeType,
    width: options.width,
    height: options.height,
  };
}

/**
 * S3からファイルを削除
 */
export async function deleteFromS3(path: string): Promise<void> {
  const s3Client = getS3Client();
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: path,
    })
  );
}

/**
 * S3からファイルをダウンロード
 */
export async function downloadFromS3(path: string): Promise<Buffer> {
  const s3Client = getS3Client();
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: path,
    })
  );
  const stream = response.Body;
  if (!stream) throw new Error('Empty response body from S3');
  const chunks: Uint8Array[] = [];
  // @ts-expect-error - S3 Body is a readable stream
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * S3パスからURLを生成
 */
export function getFileUrl(path: string): string {
  return `${CDN_BASE_URL}/${path}`;
}
