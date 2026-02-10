import { promises as fs } from 'fs';
import nodePath from 'path';
import { v4 as uuidv4 } from 'uuid';
import { uploadToS3, downloadFromS3, deleteFromS3, getFileUrl } from './s3';

export type { UploadResult } from './s3';
import type { UploadResult } from './s3';

export interface StorageProvider {
  upload(
    buffer: Buffer,
    options: {
      folder: string;
      originalName: string;
      mimeType: string;
      width?: number;
      height?: number;
    }
  ): Promise<UploadResult>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
}

const UPLOADS_DIR = nodePath.resolve(process.cwd(), 'uploads');

class LocalStorageProvider implements StorageProvider {
  private resolveSafe(filePath: string): string {
    if (!filePath || filePath.trim() === '') {
      throw new Error('File path must not be empty');
    }
    const fullPath = nodePath.resolve(UPLOADS_DIR, filePath);
    if (!fullPath.startsWith(UPLOADS_DIR + nodePath.sep)) {
      throw new Error('Invalid file path');
    }
    return fullPath;
  }

  async upload(
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
    const filePath = `${options.folder}/${filename}`;
    const fullPath = this.resolveSafe(filePath);

    await fs.mkdir(nodePath.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);

    return {
      path: filePath,
      url: `/api/files/${filePath}`,
      size: buffer.length,
      mimeType: options.mimeType,
      width: options.width,
      height: options.height,
    };
  }

  async download(filePath: string): Promise<Buffer> {
    const fullPath = this.resolveSafe(filePath);
    try {
      return await fs.readFile(fullPath);
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found in storage: ${filePath}`);
      }
      throw new Error(`Failed to read file from storage: ${filePath}`, { cause: err });
    }
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = this.resolveSafe(filePath);
    try {
      await fs.unlink(fullPath);
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
        return; // Already deleted, idempotent like S3
      }
      throw err;
    }
  }

  getUrl(filePath: string): string {
    return `/api/files/${filePath}`;
  }
}

class S3StorageProvider implements StorageProvider {
  async upload(
    buffer: Buffer,
    options: {
      folder: string;
      originalName: string;
      mimeType: string;
      width?: number;
      height?: number;
    }
  ): Promise<UploadResult> {
    return uploadToS3(buffer, options);
  }

  async download(filePath: string): Promise<Buffer> {
    return downloadFromS3(filePath);
  }

  async delete(filePath: string): Promise<void> {
    return deleteFromS3(filePath);
  }

  getUrl(filePath: string): string {
    return getFileUrl(filePath);
  }
}

let storageInstance: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (storageInstance) return storageInstance;

  const provider = process.env.STORAGE_PROVIDER;

  if (provider && provider !== 's3' && provider !== 'local') {
    throw new Error(`Invalid STORAGE_PROVIDER: "${provider}". Must be "s3" or "local".`);
  }

  if (provider === 's3' || (!provider && process.env.AWS_S3_BUCKET)) {
    console.log('[Storage] Using S3StorageProvider');
    storageInstance = new S3StorageProvider();
  } else {
    console.log('[Storage] Using LocalStorageProvider');
    storageInstance = new LocalStorageProvider();
  }

  return storageInstance;
}
