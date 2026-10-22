// ponytail: minimal S3 client for Backblaze B2 — SigV4 over native fetch.
// Exists because importing @aws-sdk/client-s3 in the OpenNext worker's eager
// module graph burns the Workers CPU limit on EVERY cold isolate (the ~10MB
// bundle is parsed at startup, killing even /api/health). This file imports
// nothing — crypto.subtle + fetch are workerd natives — so cold isolates stay
// cheap. Upgrade path: if more S3 verbs are ever needed here, reconsider a
// lazy-chunked SDK import, never an eager one.

const sha256hex = async (data) => {
  const buf = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

export { sha256hex };

const enc = new TextEncoder();

const hmac = async (key, msg) => {
  const k = key instanceof CryptoKey
    ? key
    : await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, enc.encode(msg));
};

/**
 * Signed S3 request to B2.
 * @param cfg {{endpoint:string, region:string, keyId:string, appKey:string, bucket:string}}
 * @param {string} method GET | PUT | DELETE
 * @param {string} key object key (no leading slash)
 * @param {string|undefined} body request body (PUT)
 * @returns {Promise<Response>}
 */
export async function b2S3Fetch(cfg, method, key, body = undefined, query = undefined) {
  const url = new URL(cfg.endpoint);
  const host = url.host;
  const canonicalUri = `/${cfg.bucket}/${key}`;
  // Optional signed query (ListObjectsV2 etc.). Sorted k=v pairs, as SigV4 requires.
  const qs = query
    ? Object.keys(query).sort().map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`).join('&')
    : '';
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''); // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = await sha256hex(body ?? '');

  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = `${method}\n${canonicalUri}\n${qs}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const scope = `${dateStamp}/${cfg.region}/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${await sha256hex(canonicalRequest)}`;

  const kDate = await crypto.subtle.importKey('raw', enc.encode(`AWS4${cfg.appKey}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const kSigning = await hmac(
    await hmac(
      await hmac(
        await hmac(kDate, dateStamp),
        cfg.region
      ),
      's3'
    ),
    'aws4_request'
  );
  const signature = [...new Uint8Array(await hmac(kSigning, stringToSign))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const res = await fetch(`https://${host}${canonicalUri}`, {
    method,
    headers: {
      Host: host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      Authorization: `AWS4-HMAC-SHA256 Credential=${cfg.keyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body } : {}),
  });
  return res;
}
