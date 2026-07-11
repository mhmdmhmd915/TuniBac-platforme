require('dotenv').config();

const fs = require('fs');
const path = require('path');
const request = require('supertest');

const app = require('../index');
const prisma = require('../lib/prisma');
const { extractKeyFromPublicUrl, headObject, destroyR2Client } = require('../lib/r2');

const ROOT = path.join(__dirname, '..');
const UPLOADS_ROOT = path.join(ROOT, 'uploads');

function findFirstFile(dir) {
  const entries = fs.readdirSync(dir);
  if (!entries.length) {
    throw new Error(`No sample file found in ${dir}`);
  }
  return path.join(dir, entries[0]);
}

async function login() {
  const res = await request(app)
    .post('/api/auth/login')
    .send({
      email: process.env.ADMIN_EMAIL || 'admin@gmail.com',
      password: process.env.ADMIN_PASSWORD || 'admin123',
    });

  if (res.status !== 200 || !res.body?.token) {
    throw new Error(`Admin login failed: ${res.status}`);
  }

  return res.body.token;
}

async function main() {
  const adminToken = await login();
  const samplePdf = fs.existsSync(path.join(UPLOADS_ROOT, 'communications', 'pdfs'))
    ? findFirstFile(path.join(UPLOADS_ROOT, 'communications', 'pdfs'))
    : findFirstFile(path.join(UPLOADS_ROOT, 'courses'));

  const uploadRes = await request(app)
    .post('/api/admin/courses/upload-pdf')
    .set('Authorization', `Bearer ${adminToken}`)
    .attach('pdf', samplePdf);

  if (uploadRes.status !== 200) {
    throw new Error(`Initial upload failed: ${uploadRes.status}`);
  }

  const publicUrl = uploadRes.body.fileUrl;
  const key = extractKeyFromPublicUrl(publicUrl);
  if (!(await headObject(key))) {
    throw new Error(`Uploaded object missing in R2: ${key}`);
  }

  const replaceRes = await request(app)
    .post('/api/admin/uploads/replace')
    .set('Authorization', `Bearer ${adminToken}`)
    .field('targetPath', key)
    .attach('file', samplePdf);

  if (replaceRes.status !== 200) {
    throw new Error(`Replace failed: ${replaceRes.status}`);
  }

  const afterReplace = await headObject(key);
  if (!afterReplace) {
    throw new Error(`Replaced object missing in R2: ${key}`);
  }

  const deleteRes = await request(app)
    .delete('/api/admin/uploads')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ path: key });

  if (deleteRes.status !== 200) {
    throw new Error(`Delete after replace failed: ${deleteRes.status}`);
  }

  const afterDelete = await headObject(key);
  if (afterDelete) {
    throw new Error(`Deleted replaced object still exists in R2: ${key}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        uploadStatus: uploadRes.status,
        replaceStatus: replaceRes.status,
        deleteStatus: deleteRes.status,
        key,
      },
      null,
      2
    )
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
    destroyR2Client();
  })
  .catch(async (error) => {
    console.error(error.stack || error.message || error);
    await prisma.$disconnect();
    destroyR2Client();
    process.exit(1);
  });
