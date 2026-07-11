const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const {
  S3Client,
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetBucketCorsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  ListPartsCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
  UploadPartCommand,
} = require('@aws-sdk/client-s3');

const requiredEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

const getR2Client = () => {
  const endpoint = requiredEnv('R2_ENDPOINT');
  const accessKeyId = requiredEnv('R2_ACCESS_KEY_ID');
  const secretAccessKey = requiredEnv('R2_SECRET_ACCESS_KEY');

  return new S3Client({
    region: 'auto',
    endpoint,
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
};

const client = getR2Client();

const getBucket = () => requiredEnv('R2_BUCKET');

const normalizeKey = (key) => String(key || '').replace(/^\/+/, '');

const getPublicBaseUrl = () => requiredEnv('R2_PUBLIC_URL').replace(/\/+$/, '');

const toPublicUrlFromKey = (key) => {
  const normalized = normalizeKey(key);
  if (!normalized) return '';
  return `${getPublicBaseUrl()}/${normalized}`;
};

const extractKeyFromPublicUrl = (value) => {
  const str = String(value || '').trim();
  if (!str) return '';

  const publicBase = process.env.R2_PUBLIC_URL ? String(process.env.R2_PUBLIC_URL).replace(/\/+$/, '') : '';
  if (publicBase && str.startsWith(publicBase)) {
    return normalizeKey(str.slice(publicBase.length));
  }

  if (str.startsWith('/uploads/')) {
    return normalizeKey(str.slice('/uploads/'.length));
  }

  if (str.startsWith('uploads/')) {
    return normalizeKey(str.slice('uploads/'.length));
  }

  return normalizeKey(str);
};

const isHttpUrl = (value) => /^https?:\/\//i.test(String(value || ''));

const normalizeStoredFileValueToKey = (value) => {
  if (!value) return '';
  const str = String(value).trim();
  if (!str) return '';
  if (isHttpUrl(str)) {
    const key = extractKeyFromPublicUrl(str);
    const publicBase = process.env.R2_PUBLIC_URL ? String(process.env.R2_PUBLIC_URL).replace(/\/+$/, '') : '';
    if (publicBase && str.startsWith(publicBase)) {
      return key;
    }
    return str;
  }
  return extractKeyFromPublicUrl(str);
};

const toPublicUrlFromStoredValue = (value) => {
  if (!value) return '';
  const str = String(value).trim();
  if (!str) return '';
  if (isHttpUrl(str)) return str;
  return toPublicUrlFromKey(extractKeyFromPublicUrl(str));
};

const putObject = async ({ key, body, contentType }) => {
  const Bucket = getBucket();
  const Key = normalizeKey(key);
  const upload = new Upload({
    client,
    params: {
      Bucket,
      Key,
      Body: body,
      ContentType: contentType || undefined,
    },
    queueSize: 1,
    partSize: 10 * 1024 * 1024,
    leavePartsOnError: false,
  });
  await upload.done();
  return { key: Key, url: toPublicUrlFromKey(Key) };
};

const getMultipartPartSize = (sizeBytes) => {
  const minPartSize = 10 * 1024 * 1024;
  const maxPartCount = 500;
  const requestedSize = Number(sizeBytes || 0);

  if (!Number.isFinite(requestedSize) || requestedSize <= 0) {
    return minPartSize;
  }

  return Math.max(minPartSize, Math.ceil(requestedSize / maxPartCount));
};

const createPresignedUpload = async ({ key, contentType, expiresIn = 900 }) => {
  const Bucket = getBucket();
  const Key = normalizeKey(key);
  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket,
      Key,
      ContentType: contentType || undefined,
    }),
    { expiresIn }
  );

  return {
    key: Key,
    uploadUrl,
    publicUrl: toPublicUrlFromKey(Key),
  };
};

const streamToBuffer = async (stream) => {
  if (!stream) return Buffer.alloc(0);
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const inspectObject = async ({ key, byteLimit = 64 }) => {
  const Bucket = getBucket();
  const Key = normalizeKey(key);

  const head = await client.send(
    new HeadObjectCommand({
      Bucket,
      Key,
    })
  );

  const bodyResult = await client.send(
    new GetObjectCommand({
      Bucket,
      Key,
      Range: `bytes=0-${Math.max(0, Number(byteLimit || 64) - 1)}`,
    })
  );

  return {
    key: Key,
    contentType: String(head.ContentType || '').toLowerCase(),
    contentLength: Number(head.ContentLength || 0),
    sample: await streamToBuffer(bodyResult.Body),
  };
};

const createMultipartUpload = async ({ key, contentType, sizeBytes, expiresIn = 3600 }) => {
  const Bucket = getBucket();
  const Key = normalizeKey(key);
  const partSize = getMultipartPartSize(sizeBytes);
  const result = await client.send(
    new CreateMultipartUploadCommand({
      Bucket,
      Key,
      ContentType: contentType || undefined,
    })
  );

  return {
    key: Key,
    uploadId: String(result.UploadId || ''),
    publicUrl: toPublicUrlFromKey(Key),
    partSize,
    expiresIn,
  };
};

const createMultipartPartUploadUrl = async ({ key, uploadId, partNumber, expiresIn = 3600 }) => {
  const Bucket = getBucket();
  const Key = normalizeKey(key);
  const normalizedPartNumber = Number(partNumber || 0);

  if (!uploadId || !Key || !Number.isInteger(normalizedPartNumber) || normalizedPartNumber < 1 || normalizedPartNumber > 10000) {
    throw new Error('Invalid multipart upload parameters');
  }

  const uploadUrl = await getSignedUrl(
    client,
    new UploadPartCommand({
      Bucket,
      Key,
      UploadId: String(uploadId),
      PartNumber: normalizedPartNumber,
    }),
    { expiresIn }
  );

  return {
    uploadUrl,
    partNumber: normalizedPartNumber,
  };
};

const listAllMultipartParts = async ({ key, uploadId }) => {
  const Bucket = getBucket();
  const Key = normalizeKey(key);
  const parts = [];
  let partNumberMarker = undefined;
  let isTruncated = true;

  while (isTruncated) {
    const result = await client.send(
      new ListPartsCommand({
        Bucket,
        Key,
        UploadId: String(uploadId),
        PartNumberMarker: partNumberMarker,
      })
    );

    if (Array.isArray(result.Parts)) {
      parts.push(...result.Parts);
    }

    isTruncated = Boolean(result.IsTruncated);
    partNumberMarker = result.NextPartNumberMarker;
  }

  return parts;
};

const completeMultipartUpload = async ({ key, uploadId, partNumbers }) => {
  const Bucket = getBucket();
  const Key = normalizeKey(key);
  const uploadedParts = await listAllMultipartParts({ key: Key, uploadId });
  const expectedPartNumbers = Array.isArray(partNumbers)
    ? [...new Set(partNumbers.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))]
    : [];

  const completedParts = uploadedParts
    .filter((part) => expectedPartNumbers.length === 0 || expectedPartNumbers.includes(Number(part.PartNumber || 0)))
    .map((part) => ({
      ETag: part.ETag,
      PartNumber: Number(part.PartNumber || 0),
    }))
    .filter((part) => part.ETag && Number.isInteger(part.PartNumber) && part.PartNumber > 0)
    .sort((a, b) => a.PartNumber - b.PartNumber);

  if (completedParts.length === 0) {
    throw new Error('No uploaded parts found for multipart completion');
  }

  if (expectedPartNumbers.length > 0 && completedParts.length !== expectedPartNumbers.length) {
    throw new Error('Multipart upload is missing one or more parts');
  }

  await client.send(
    new CompleteMultipartUploadCommand({
      Bucket,
      Key,
      UploadId: String(uploadId),
      MultipartUpload: {
        Parts: completedParts,
      },
    })
  );

  return {
    key: Key,
    publicUrl: toPublicUrlFromKey(Key),
    partCount: completedParts.length,
  };
};

const abortMultipartUpload = async ({ key, uploadId }) => {
  const Bucket = getBucket();
  const Key = normalizeKey(key);

  if (!uploadId || !Key) {
    return;
  }

  await client.send(
    new AbortMultipartUploadCommand({
      Bucket,
      Key,
      UploadId: String(uploadId),
    })
  );
};

const deleteObject = async (key) => {
  const Bucket = getBucket();
  const Key = normalizeKey(key);
  if (!Key) return;
  await client.send(new DeleteObjectCommand({ Bucket, Key }));
};

const headObject = async (key) => {
  const Bucket = getBucket();
  const Key = normalizeKey(key);
  if (!Key) return null;
  try {
    return await client.send(new HeadObjectCommand({ Bucket, Key }));
  } catch {
    return null;
  }
};

const listObjects = async ({ prefix = '', continuationToken = null, maxKeys = 1000 }) => {
  const Bucket = getBucket();
  const Prefix = normalizeKey(prefix);
  const result = await client.send(
    new ListObjectsV2Command({
      Bucket,
      Prefix: Prefix || undefined,
      ContinuationToken: continuationToken || undefined,
      MaxKeys: maxKeys,
    })
  );
  return result;
};

const getRecommendedCorsRules = () => {
  const configuredOrigins = String(process.env.R2_CORS_ORIGINS || process.env.CORS_ORIGIN || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const allowedOrigins = [...new Set(configuredOrigins.length ? configuredOrigins : ['http://localhost:5173', 'http://localhost:5174'])];

  return [
    {
      AllowedOrigins: allowedOrigins,
      AllowedMethods: ['GET', 'HEAD', 'PUT'],
      AllowedHeaders: ['*'],
      ExposeHeaders: ['ETag', 'Content-Length', 'Content-Range', 'Accept-Ranges'],
      MaxAgeSeconds: 3600,
    },
  ];
};

const getBucketCors = async () => {
  const Bucket = getBucket();
  try {
    const result = await client.send(new GetBucketCorsCommand({ Bucket }));
    return Array.isArray(result.CORSRules) ? result.CORSRules : [];
  } catch (error) {
    const name = String(error?.name || '');
    if (name === 'NoSuchCORSConfiguration' || name === 'NoSuchCORSConfigurationError') {
      return [];
    }
    throw error;
  }
};

const putBucketCors = async (rules) => {
  const Bucket = getBucket();
  const CORSRules = Array.isArray(rules) ? rules : getRecommendedCorsRules();
  await client.send(
    new PutBucketCorsCommand({
      Bucket,
      CORSConfiguration: { CORSRules },
    })
  );
  return getBucketCors();
};

const destroyR2Client = () => {
  if (client && typeof client.destroy === 'function') {
    client.destroy();
  }
};

module.exports = {
  toPublicUrlFromKey,
  toPublicUrlFromStoredValue,
  extractKeyFromPublicUrl,
  normalizeStoredFileValueToKey,
  putObject,
  createPresignedUpload,
  inspectObject,
  createMultipartUpload,
  createMultipartPartUploadUrl,
  completeMultipartUpload,
  abortMultipartUpload,
  deleteObject,
  headObject,
  listObjects,
  getRecommendedCorsRules,
  getBucketCors,
  putBucketCors,
  destroyR2Client,
};
