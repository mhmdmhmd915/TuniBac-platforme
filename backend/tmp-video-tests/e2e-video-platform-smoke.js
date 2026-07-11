require('dotenv').config();

const path = require('path');
const fs = require('fs/promises');
const axios = require('axios');
const https = require('https');
const request = require('supertest');

const app = require('../index');
const { extractKeyFromPublicUrl, headObject, destroyR2Client } = require('../lib/r2');

const PART_CONTENT_TYPE = 'video/mp4';
const ipv4Agent = new https.Agent({ family: 4, keepAlive: true });

async function login() {
  const response = await request(app).post('/api/auth/login').send({
    email: process.env.ADMIN_EMAIL || 'admin@gmail.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  });

  if (response.status !== 200 || !response.body?.token) {
    throw new Error(`Admin login failed: ${response.status}`);
  }

  return response.body.token;
}

async function uploadMultipartVideo({ token, filePath, routePrefix, responseKind }) {
  const stat = await fs.stat(filePath);
  const filename = path.basename(filePath);

  const initiateResponse = await request(app)
    .post(`${routePrefix}/initiate`)
    .set('Authorization', `Bearer ${token}`)
    .send({ filename, contentType: PART_CONTENT_TYPE, sizeBytes: stat.size });

  if (initiateResponse.status !== 200) {
    throw new Error(`initiate failed ${routePrefix}: ${initiateResponse.status} ${JSON.stringify(initiateResponse.body)}`);
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
        .send({ key, uploadId, partNumber });

      if (signResponse.status !== 200 || !signResponse.body?.uploadUrl) {
        throw new Error(`sign-part failed ${routePrefix}: ${partNumber}`);
      }

      const putResponse = await axios.put(signResponse.body.uploadUrl, buffer, {
        headers: { 'Content-Type': PART_CONTENT_TYPE },
        httpsAgent: ipv4Agent,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 0,
        validateStatus: () => true,
      });

      if (putResponse.status < 200 || putResponse.status >= 300) {
        throw new Error(`upload part failed ${routePrefix}: ${partNumber} => ${putResponse.status}`);
      }

      partNumbers.push(partNumber);
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
    .send({ key, uploadId, partNumbers, filename, contentType: PART_CONTENT_TYPE, sizeBytes: stat.size });

  if (completeResponse.status !== 200) {
    throw new Error(`complete failed ${routePrefix}: ${completeResponse.status} ${JSON.stringify(completeResponse.body)}`);
  }

  const url = responseKind === 'attachment'
    ? completeResponse.body?.attachment?.filePath
    : completeResponse.body?.videoPath || completeResponse.body?.fileUrl || publicUrl;

  const finalKey = extractKeyFromPublicUrl(url || publicUrl);
  const exists = await headObject(finalKey);
  if (!exists) {
    throw new Error(`R2 object missing for ${routePrefix}`);
  }

  const headResponse = await fetch(url, { method: 'HEAD' });
  const rangeResponse = await fetch(url, { headers: { Range: 'bytes=0-1048575' } });

  return {
    uploadId,
    key: finalKey,
    url,
    totalParts,
    headStatus: headResponse.status,
    rangeStatus: rangeResponse.status,
    contentType: headResponse.headers.get('content-type') || rangeResponse.headers.get('content-type') || '',
    raw: completeResponse.body,
  };
}

async function main() {
  const token = await login();
  const filePath = path.join(__dirname, 'verify-32mb.mp4');

  const subjectsResponse = await request(app)
    .get('/api/admin/subjects')
    .set('Authorization', `Bearer ${token}`);

  if (subjectsResponse.status !== 200 || !Array.isArray(subjectsResponse.body) || !subjectsResponse.body[0]?.id) {
    throw new Error(`Unable to load subjects: ${subjectsResponse.status}`);
  }

  const subjectId = subjectsResponse.body[0].id;

  const communicationUpload = await uploadMultipartVideo({
    token,
    filePath,
    routePrefix: '/api/admin/communications/uploads/video/multipart',
    responseKind: 'attachment',
  });

  const createCommunication = await request(app)
    .post('/api/admin/communications')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: `Smoke communication video ${Date.now()}`,
      contentHtml: '<p>Smoke communication video</p>',
      type: 'GENERAL_INFORMATION',
      priority: 'LOW',
      status: 'DRAFT',
      attachments: [communicationUpload.raw.attachment],
    });

  if (createCommunication.status !== 201) {
    throw new Error(`Communication create failed: ${createCommunication.status} ${JSON.stringify(createCommunication.body)}`);
  }

  const createdCommunicationId = createCommunication.body.id;
  const verifyCommunication = await request(app)
    .get(`/api/admin/communications/${createdCommunicationId}`)
    .set('Authorization', `Bearer ${token}`);

  const savedCommunicationVideo = Array.isArray(verifyCommunication.body?.attachments)
    ? verifyCommunication.body.attachments.find((item) => item.kind === 'VIDEO')
    : null;

  const adminVideoUpload = await uploadMultipartVideo({
    token,
    filePath,
    routePrefix: '/api/admin/uploads/video/multipart',
    responseKind: 'video',
  });

  const createCourse = await request(app)
    .post('/api/courses')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: `Smoke video course ${Date.now()}`,
      description: 'Video upload smoke course',
      subjectId,
      difficulty: 'BEGINNER',
      tags: ['smoke', 'video'],
      videoPath: adminVideoUpload.url,
      videoUrl: '',
      contentUrl: '',
    });

  if (createCourse.status !== 201) {
    throw new Error(`Course create failed: ${createCourse.status} ${JSON.stringify(createCourse.body)}`);
  }

  const createdCourseId = createCourse.body.id;
  const verifyCourse = await request(app)
    .get(`/api/courses/${createdCourseId}`)
    .set('Authorization', `Bearer ${token}`);

  const result = {
    communication: {
      upload: communicationUpload,
      createdId: createdCommunicationId,
      savedAttachment: savedCommunicationVideo,
    },
    course: {
      upload: adminVideoUpload,
      createdId: createdCourseId,
      savedVideoPath: verifyCourse.body?.videoPath || null,
      subjectId,
    },
  };

  console.log(JSON.stringify(result, null, 2));

  await request(app)
    .delete(`/api/admin/communications/${createdCommunicationId}`)
    .set('Authorization', `Bearer ${token}`);

  await request(app)
    .delete(`/api/courses/${createdCourseId}`)
    .set('Authorization', `Bearer ${token}`);
}

main()
  .then(() => destroyR2Client())
  .catch((error) => {
    console.error(JSON.stringify({ message: error.message, stack: error.stack }, null, 2));
    destroyR2Client();
    process.exit(1);
  });
