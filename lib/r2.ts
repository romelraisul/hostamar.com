/**
 * Cloudflare R2 Storage Client Wrapper
 *
 * Uses @aws-sdk/client-s3 (S3-compatible API) to interact with Cloudflare R2.
 * Env vars: R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET, R2_PUBLIC_URL
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import path from 'path';

// --- Configuration ---

const R2_ENDPOINT = process.env.R2_ENDPOINT || '';
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY || '';
const R2_SECRET_KEY = process.env.R2_SECRET_KEY || '';
const R2_BUCKET = process.env.R2_BUCKET || 'hostamar-videos';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';
const R2_REGION = process.env.R2_REGION || 'auto';

// --- Client ---

let r2Client: S3Client | null = null;

function getClient(): S3Client {
  if (!r2Client) {
    if (!R2_ENDPOINT) {
      throw new Error(
        'R2_ENDPOINT environment variable is not set. ' +
        'Format: https://<account_id>.r2.cloudflarestorage.com'
      );
    }

    r2Client = new S3Client({
      endpoint: R2_ENDPOINT,
      region: R2_REGION,
      credentials: {
        accessKeyId: R2_ACCESS_KEY,
        secretAccessKey: R2_SECRET_KEY,
      },
      // R2 requires path-style addressing
      forcePathStyle: true,
    });
  }
  return r2Client;
}

// --- Helper: generate a unique key ---

function generateKey(fileName: string, folder: string = 'videos'): string {
  const ext = path.extname(fileName) || '.mp4';
  return `${folder}/${randomUUID()}${ext}`;
}

// --- Upload ---

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
}

/**
 * Upload a file (Buffer/Uint8Array) to R2.
 * Returns the public URL and object key.
 */
export async function uploadFile(
  file: Buffer | Uint8Array | Blob | string,
  fileName: string,
  mimeType?: string,
  folder: string = 'videos'
): Promise<UploadResult> {
  const client = getClient();
  const key = generateKey(fileName, folder);

  const body = typeof file === 'string'
    ? file // file path — but we handle Buffer uploads only
    : file instanceof Blob
      ? Buffer.from(await file.arrayBuffer())
      : file;

  const params: PutObjectCommandInput = {
    Bucket: R2_BUCKET,
    Key: key,
    Body: body,
    ContentType: mimeType || getMimeType(fileName),
  };

  await client.send(new PutObjectCommand(params));

  const url = buildPublicUrl(key);

  console.log(`[R2] Uploaded ${key} (${mimeType || 'unknown'})`);
  return { url, key, bucket: R2_BUCKET };
}

/**
 * Upload from a local file path by reading it into a Buffer.
 */
export async function uploadFromPath(
  filePath: string,
  folder: string = 'videos'
): Promise<UploadResult> {
  const fs = await import('fs/promises');
  const fileBuffer = await fs.readFile(filePath);
  const fileName = path.basename(filePath);
  const mimeType = getMimeType(fileName);
  return uploadFile(fileBuffer, fileName, mimeType, folder);
}

// --- Download ---

/**
 * Get a signed URL for temporary access to a private object.
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const client = getClient();
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Download an object as a Buffer.
 */
export async function downloadFile(key: string): Promise<Buffer> {
  const client = getClient();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    })
  );

  const stream = response.Body;
  if (!stream) {
    throw new Error(`No body returned for R2 object: ${key}`);
  }

  // Convert stream to Buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// --- Delete ---

export async function deleteFile(key: string): Promise<void> {
  const client = getClient();
  await client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    })
  );
  console.log(`[R2] Deleted ${key}`);
}

// --- List ---

export async function listFiles(
  folder: string = 'videos',
  limit: number = 100
): Promise<string[]> {
  const client = getClient();
  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix: folder.endsWith('/') ? folder : `${folder}/`,
      MaxKeys: limit,
    })
  );
  return (response.Contents || []).map((obj) => obj.Key || '');
}

// --- Utilities ---

function buildPublicUrl(key: string): string {
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${key}`;
  }
  // Fallback: use the R2 endpoint directly
  return `${R2_ENDPOINT}/${R2_BUCKET}/${key}`;
}

function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.json': 'application/json',
    '.zip': 'application/zip',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

export default {
  uploadFile,
  uploadFromPath,
  getSignedDownloadUrl,
  downloadFile,
  deleteFile,
  listFiles,
};
