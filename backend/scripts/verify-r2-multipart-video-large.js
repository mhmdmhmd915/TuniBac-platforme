require('dotenv').config();

const axios = require('axios');
const fs = require('fs/promises');
const https = require('https');
const path = require('path');
const request = require('supertest');

const app = require('../index');
const {
  extractKeyFromPublicUrl,
  headObject,
  deleteObject,
  destroyR2Client,
} = require('../lib/r2');

const PART_CONTENT_TYPE = 'video/mp4';
const ipv4Agent = new https.Agent({ family: 4, keepAlive: true });

async function login() {
  const response = await request(app).post('/api/auth/login').send({
    email: process.env.ADMIN_EMAIL || 'admin@gmail.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  });

  if (response.status !== 200 || !response.body?.token) {
    throw new Error(`Admin login failed with status ${response.status}`);
  }

  return response.body.token;
}

async function uploadMultipartVideo({ token, filePath, routePrefix, label }) {
  const stat = await fs.stat(filePath);
  const filename = path.basename(filePath);

  console.log(`START ${label}: ${filename} (${stat.size} bytes)`);

  const initiateResponse = await request(app)
    .post(`${routePrefix}/initiate`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      filename,
      contentType: PART_CONTENT_TYPE,
      sizeBytes: stat.size,
    });

  if (initiateResponse.status !== 200) {
    throw new Error(`${label} initiate failed with status ${initiateResponse.status}: ${JSON.stringify(initiateResponse.body)}`);
  }

  const { uploadId, key, publicUrl, partSize, totalParts } = initiateResponse.body;
  const fileHandle = await fs.open(filePath, 'r');
  const partNumbers = [];

  try {
    for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
      const start = (partNumber - 1) * partSize;
      const currentSize = Math.min(partSize, stat.size - start);
      const buffer = Buffer.allocUnsafe(currentSize);
      await fileHandle.read(buffer, 0, currentSize, start);

      const signResponse = await request(app)
        .post(`${routePrefix}/sign-part`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          key,
          uploadId,
          partNumber,
        });

      if (signResponse.status !== 200 || !signResponse.body?.uploadUrl) {
        throw new Error(`${label} sign-part ${partNumber} failed with status ${signResponse.status}`);
      }

      const putResponse = await axios.put(signResponse.body.uploadUrl, buffer, {
        headers: {
          'Content-Type': PART_CONTENT_TYPE,
        },
        httpsAgent: ipv4Agent,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 0,
        validateStatus: () => true,
      });

      if (putResponse.status < 200 || putResponse.status >= 300) {
        throw new Error(`${label} upload part ${partNumber} failed with status ${putResponse.status}`);
      }

      partNumbers.push(partNumber);
      console.log(`PART ${label}: ${partNumber}/${totalParts}`);
    }
  } catch (error) {
    await request(app)
      .post(`${routePrefix}/abort`)
      .set('Authorization', `Bearer ${token}`)
      .send({ key, uploadId });
    throw error;
  } finally {
    await fileHandle.close();
  }

  const completeResponse = await request(app)
    .post(`${routePrefix}/complete`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      key,
      uploadId,
      partNumbers,
      filename,
      contentType: PART_CONTENT_TYPE,
      sizeBytes: stat.size,
    });

  if (completeResponse.status !== 200) {
    throw new Error(`${label} complete failed with status ${completeResponse.status}: ${JSON.stringify(completeResponse.body)}`);
  }

  const finalUrl = completeResponse.body.videoPath || completeResponse.body.fileUrl || publicUrl;
  const finalKey = extractKeyFromPublicUrl(finalUrl);
  const exists = await headObject(finalKey);
  if (!exists) {
    throw new Error(`${label} uploaded object is missing from R2`);
  }

  const headResponse = await fetch(finalUrl, { method: 'HEAD' });
  const rangeResponse = await fetch(finalUrl, {
    headers: {
      Range: 'bytes=0-1048575',
    },
  });

  return {
    label,
    filename,
    sizeBytes: stat.size,
    key: finalKey,
    publicUrl: finalUrl,
    headStatus: headResponse.status,
    rangeStatus: rangeResponse.status,
    contentType: headResponse.headers.get('content-type') || rangeResponse.headers.get('content-type') || '',
  };
}

async function main() {
  const token = await login();
  const tmpDir = path.join(__dirname, '..', 'tmp-video-tests');
  const keepUploads = String(process.env.KEEP_MULTIPART_TEST_UPLOADS || '').toLowerCase() === 'true';

  const files = [
    {
      label: '500MB',
      filePath: path.join(tmpDir, 'verify-500mb.mp4'),
    },
    {
      label: '1GB',
      filePath: path.join(tmpDir, 'verify-1gb.mp4'),
    },
  ];

  const results = [];
  for (const item of files) {
    const result = await uploadMultipartVideo({
      token,
      filePath: item.filePath,
      routePrefix: '/api/admin/uploads/video/multipart',
      label: item.label,
    });
    results.push(result);
  }

  console.log(JSON.stringify({ results }, null, 2));

  if (!keepUploads) {
    for (const result of results) {
      await deleteObject(result.key);
    }
  }
}

main()
  .then(() => {
    destroyR2Client();
  })
  .catch((error) => {
    const details = {
      message: error?.message || String(error),
      stack: error?.stack || null,
      code: error?.code || null,
      cause: error?.cause
        ? {
            message: error.cause.message || String(error.cause),
            code: error.cause.code || null,
            stack: error.cause.stack || null,
          }
        : null,
      response: error?.response
        ? {
            status: error.response.status,
            data: error.response.data,
          }
        : null,
    };
    console.error(JSON.stringify(details, null, 2));
    destroyR2Client();
    process.exit(1);
  });
