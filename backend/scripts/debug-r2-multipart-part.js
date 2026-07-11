require('dotenv').config();

const { spawnSync } = require('child_process');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const request = require('supertest');

const app = require('../index');
const { destroyR2Client } = require('../lib/r2');

const PART_CONTENT_TYPE = 'video/mp4';

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

async function main() {
  const token = await login();
  const filePath = path.join(__dirname, '..', 'tmp-video-tests', 'verify-500mb.mp4');
  const stat = await fs.stat(filePath);

  const initiateResponse = await request(app)
    .post('/api/admin/uploads/video/multipart/initiate')
    .set('Authorization', `Bearer ${token}`)
    .send({
      filename: path.basename(filePath),
      contentType: PART_CONTENT_TYPE,
      sizeBytes: stat.size,
    });

  if (initiateResponse.status !== 200) {
    throw new Error(`Initiate failed: ${initiateResponse.status} ${JSON.stringify(initiateResponse.body)}`);
  }

  const { key, uploadId, partSize } = initiateResponse.body;
  const firstPartSize = Math.min(Number(partSize || 0), stat.size);
  const buffer = Buffer.allocUnsafe(firstPartSize);
  const handle = await fs.open(filePath, 'r');
  await handle.read(buffer, 0, firstPartSize, 0);
  await handle.close();

  const signResponse = await request(app)
    .post('/api/admin/uploads/video/multipart/sign-part')
    .set('Authorization', `Bearer ${token}`)
    .send({
      key,
      uploadId,
      partNumber: 1,
    });

  if (signResponse.status !== 200 || !signResponse.body?.uploadUrl) {
    throw new Error(`Sign-part failed: ${signResponse.status} ${JSON.stringify(signResponse.body)}`);
  }

  console.log(
    JSON.stringify(
      {
        key,
        uploadId,
        partSize: firstPartSize,
        uploadUrlHost: new URL(signResponse.body.uploadUrl).host,
      },
      null,
      2
    )
  );

  const startedAt = Date.now();
  const tempPartPath = path.join(os.tmpdir(), `r2-debug-part-${Date.now()}.bin`);
  await fs.writeFile(tempPartPath, buffer);
  const curlResult = spawnSync(
    'curl.exe',
    [
      '--http1.1',
      '--silent',
      '--show-error',
      '--output',
      'NUL',
      '--write-out',
      '%{http_code}',
      '-X',
      'PUT',
      '-H',
      `Content-Type: ${PART_CONTENT_TYPE}`,
      '-H',
      'Expect:',
      '--upload-file',
      tempPartPath,
      signResponse.body.uploadUrl,
    ],
    {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
    }
  );
  const elapsedMs = Date.now() - startedAt;
  await fs.unlink(tempPartPath).catch(() => {});

  if (curlResult.error) {
    throw curlResult.error;
  }

  const status = Number.parseInt(String(curlResult.stdout || '').trim(), 10);

  console.log(
    JSON.stringify(
      {
        status,
        elapsedMs,
        stderr: String(curlResult.stderr || '').trim() || null,
      },
      null,
      2
    )
  );

  if (!Number.isFinite(status) || status < 200 || status >= 300) {
    throw new Error(`Signed PUT failed with status ${status}`);
  }

  await request(app)
    .post('/api/admin/uploads/video/multipart/abort')
    .set('Authorization', `Bearer ${token}`)
    .send({ key, uploadId });
}

main()
  .then(() => {
    destroyR2Client();
  })
  .catch((error) => {
    console.error(
      JSON.stringify(
        {
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
        },
        null,
        2
      )
    );
    destroyR2Client();
    process.exit(1);
  });
