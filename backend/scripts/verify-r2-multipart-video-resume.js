require('dotenv').config();

const { S3Client, UploadPartCommand } = require('@aws-sdk/client-s3');
const fs = require('fs/promises');
const path = require('path');
const {
  abortMultipartUpload,
  completeMultipartUpload,
  createMultipartUpload,
  deleteObject,
  destroyR2Client,
  headObject,
  listMultipartParts,
  toPublicUrlFromKey,
} = require('../lib/r2');

const TEST_SIZE_BYTES = 2300 * 1024 * 1024;
const INTERRUPT_AFTER_PARTS = 3;
const RETRY_PART_NUMBER = 4;
const TEST_CONTENT_TYPE = 'video/mp4';
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const ensure = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};


const bucket = () => {
  ensure(process.env.R2_BUCKET, 'Missing R2_BUCKET');
  return process.env.R2_BUCKET;
};

const ensureSparseMp4 = async (filePath, sizeBytes) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const handle = await fs.open(filePath, 'w');

  try {
    const header = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
    await handle.write(header, 0, header.length, 0);
    await handle.truncate(sizeBytes);
  } finally {
    await handle.close();
  }
};

const readChunk = async (fileHandle, start, size) => {
  const buffer = Buffer.allocUnsafe(size);
  await fileHandle.read(buffer, 0, size, start);
  return buffer;
};

const uploadChunk = async ({ key, uploadId, partNumber, chunk }) => {
  const response = await r2Client.send(
    new UploadPartCommand({
      Bucket: bucket(),
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
      Body: chunk,
      ContentType: TEST_CONTENT_TYPE,
    })
  );

  ensure(!!response.ETag, `Chunk upload did not return ETag for part ${partNumber}`);
};

async function main() {
  const tmpDir = path.join(__dirname, '..', 'tmp-video-tests');
  const filePath = path.join(tmpDir, 'verify-2300mb-resume.mp4');
  const keepUpload = String(process.env.KEEP_MULTIPART_TEST_UPLOADS || '').toLowerCase() === 'true';

  await ensureSparseMp4(filePath, TEST_SIZE_BYTES);

  const multipart = await createMultipartUpload({
    key: `videos/verify-${Date.now()}-2300mb.mp4`,
    contentType: TEST_CONTENT_TYPE,
    sizeBytes: TEST_SIZE_BYTES,
  });

  const uploadId = multipart.uploadId;
  const key = multipart.key;
  const partSize = multipart.partSize;
  const totalParts = Math.ceil(TEST_SIZE_BYTES / partSize);
  const fileHandle = await fs.open(filePath, 'r');
  const uploadedPartNumbers = [];
  let simulatedRetryFailures = 0;

  ensure(partSize >= 50 * 1024 * 1024 && partSize <= 100 * 1024 * 1024, `Unexpected part size ${partSize}`);
  ensure(totalParts > INTERRUPT_AFTER_PARTS, 'Test file did not produce enough multipart chunks');

  try {
    for (let partNumber = 1; partNumber <= INTERRUPT_AFTER_PARTS; partNumber += 1) {
      const start = (partNumber - 1) * partSize;
      const currentSize = Math.min(partSize, TEST_SIZE_BYTES - start);
      const chunk = await readChunk(fileHandle, start, currentSize);
      await uploadChunk({ key, uploadId, partNumber, chunk });
      uploadedPartNumbers.push(partNumber);
    }

    const interruptedParts = await listMultipartParts({ key, uploadId });
    ensure(
      interruptedParts.length === INTERRUPT_AFTER_PARTS,
      `Expected ${INTERRUPT_AFTER_PARTS} persisted parts after interruption, got ${interruptedParts.length}`
    );

    for (let partNumber = INTERRUPT_AFTER_PARTS + 1; partNumber <= totalParts; partNumber += 1) {
      const start = (partNumber - 1) * partSize;
      const currentSize = Math.min(partSize, TEST_SIZE_BYTES - start);
      const chunk = await readChunk(fileHandle, start, currentSize);

      if (partNumber === RETRY_PART_NUMBER) {
        try {
          await uploadChunk({ key, uploadId: `${uploadId}-broken`, partNumber, chunk });
        } catch {
          simulatedRetryFailures += 1;
        }
      }

      await uploadChunk({ key, uploadId, partNumber, chunk });
      uploadedPartNumbers.push(partNumber);
      console.log(`PART ${partNumber}/${totalParts}`);
    }

    ensure(simulatedRetryFailures === 1, `Expected one simulated retry failure, got ${simulatedRetryFailures}`);

    const completed = await completeMultipartUpload({
      key,
      uploadId,
      partNumbers: uploadedPartNumbers,
    });

    const head = await headObject(completed.key);
    ensure(!!head, 'Completed multipart object not found in R2');
    ensure(Number(head.ContentLength || 0) === TEST_SIZE_BYTES, `Unexpected final object size ${head?.ContentLength || 0}`);

    const publicUrl = toPublicUrlFromKey(completed.key);
    const headResponse = await fetch(publicUrl, { method: 'HEAD' });
    const rangeResponse = await fetch(publicUrl, { headers: { Range: 'bytes=0-1048575' } });

    ensure(headResponse.ok, `Public HEAD failed with ${headResponse.status}`);
    ensure(rangeResponse.ok || rangeResponse.status === 206, `Public range fetch failed with ${rangeResponse.status}`);

    console.log(
      JSON.stringify(
        {
          filePath,
          sizeBytes: TEST_SIZE_BYTES,
          uploadId,
          key: completed.key,
          publicUrl,
          partSize,
          totalParts,
          interruptionVerifiedAt: INTERRUPT_AFTER_PARTS,
          retryPartNumber: RETRY_PART_NUMBER,
          simulatedRetryFailures,
          headStatus: headResponse.status,
          rangeStatus: rangeResponse.status,
        },
        null,
        2
      )
    );

    if (!keepUpload) {
      await deleteObject(completed.key);
    }
  } catch (error) {
    await abortMultipartUpload({ key, uploadId }).catch(() => {});
    throw error;
  } finally {
    await fileHandle.close();
  }
}

main()
  .then(() => {
    r2Client.destroy();
    destroyR2Client();
  })
  .catch((error) => {
    console.error(
      JSON.stringify(
        {
          message: error?.message || String(error),
          stack: error?.stack || null,
          response: error?.response
            ? {
                status: error.response.status,
                data: error.response.data,
              }
            : null,
        },
        null,
        2
      )
    );
    r2Client.destroy();
    destroyR2Client();
    process.exit(1);
  });
