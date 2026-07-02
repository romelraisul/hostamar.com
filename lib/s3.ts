// MinIO S3 upload helper — replaces Uploadthing
// Self-hosted on remote Windows at 192.168.1.2:9000
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
// @ts-expect-error - runtime export exists but TS type barrel is broken in v3.577.0
import { DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import path from "path";

const S3_ENDPOINT = process.env.S3_ENDPOINT || "http://192.168.1.2:9000";
const S3_REGION = process.env.S3_REGION || "auto";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || "minioadmin";
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || "minioadmin";
const S3_BUCKET = process.env.S3_BUCKET || "hostamar";
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL || "http://192.168.1.2:9000";

const s3Client = new S3Client({
  endpoint: S3_ENDPOINT,
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
  },
  forcePathStyle: true,
});

export async function uploadFile(
  file: Buffer | Uint8Array,
  fileName: string,
  mimeType: string,
  folder: string = "uploads"
): Promise<{ url: string; key: string }> {
  const ext = path.extname(fileName);
  const key = `${folder}/${randomUUID()}${ext}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: file,
      ContentType: mimeType,
      ACL: "public-read",
    })
  );

  const url = `${S3_PUBLIC_URL}/${S3_BUCKET}/${key}`;
  return { url, key };
}

export async function deleteFile(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    })
  );
}

export async function listFiles(folder: string = "uploads"): Promise<string[]> {
  const response = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: folder,
    })
  );
  return (response.Contents || []).map((obj) => obj.Key || "");
}

export async function getDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });
  return getSignedUrl(s3Client as any, command as any, { expiresIn });
}

export { s3Client };
