require('dotenv').config();

const fs = require('fs');
const path = require('path');
const request = require('supertest');

const app = require('../index');
const prisma = require('../lib/prisma');
const {
  extractKeyFromPublicUrl,
  headObject,
  listObjects,
  toPublicUrlFromStoredValue,
  destroyR2Client,
} = require('../lib/r2');

const ROOT = path.join(__dirname, '..');
const UPLOADS_ROOT = path.join(ROOT, 'uploads');
const PUBLIC_BASE = String(process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');

const ensure = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const logStep = (label) => {
  console.log(`STEP: ${label}`);
};

const isStoredAsKey = (value) =>
  typeof value === 'string' &&
  value.length > 0 &&
  !/^https?:\/\//i.test(value) &&
  !value.startsWith('/uploads/');

const assertPublicUrl = (value, label) => {
  ensure(typeof value === 'string' && value.startsWith(PUBLIC_BASE), `${label} did not return R2 public URL`);
  return extractKeyFromPublicUrl(value);
};

const assertObjectExists = async (key, label) => {
  const head = await headObject(key);
  ensure(!!head, `${label} key not found in R2: ${key}`);
};

const assertObjectMissing = async (key, label) => {
  const head = await headObject(key);
  ensure(!head, `${label} key still exists in R2: ${key}`);
};

const fetchPublic = async (url, label) => {
  const res = await fetch(url, { method: 'HEAD' });
  ensure(res.ok, `${label} public URL returned ${res.status}`);
};

const findFirstFile = (dir) => {
  const entries = fs.readdirSync(dir);
  ensure(entries.length > 0, `No sample file found in ${dir}`);
  return path.join(dir, entries[0]);
};

async function login(email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  ensure(res.status === 200, `Login failed for ${email} with status ${res.status}`);
  ensure(res.body?.token, `Missing token for ${email}`);
  return res.body.token;
}

async function main() {
  const samplePdf = fs.existsSync(path.join(UPLOADS_ROOT, 'communications', 'pdfs'))
    ? findFirstFile(path.join(UPLOADS_ROOT, 'communications', 'pdfs'))
    : findFirstFile(path.join(UPLOADS_ROOT, 'courses'));
  const sampleImage = fs.existsSync(path.join(UPLOADS_ROOT, 'communications', 'images'))
    ? findFirstFile(path.join(UPLOADS_ROOT, 'communications', 'images'))
    : findFirstFile(path.join(UPLOADS_ROOT, 'parascolaires', 'covers'));
  const sampleVideo = fs.existsSync(path.join(UPLOADS_ROOT, 'communications', 'videos'))
    ? findFirstFile(path.join(UPLOADS_ROOT, 'communications', 'videos'))
    : findFirstFile(path.join(UPLOADS_ROOT, 'videos'));

  const adminToken = await login(process.env.ADMIN_EMAIL || 'admin@gmail.com', process.env.ADMIN_PASSWORD || 'admin123');
  const studentToken = await login(process.env.STUDENT_EMAIL || 'student@gmail.com', process.env.STUDENT_PASSWORD || 'student123');

  const subject = await prisma.subject.findFirst({ orderBy: { createdAt: 'asc' } });
  ensure(subject, 'No subject found to create course/exercise');

  const results = [];
  const track = (name, passed, details = '') => results.push({ name, passed, details });

  const created = {
    courseId: null,
    exerciseId: null,
    correctionId: null,
    parascolaireId: null,
    communicationId: null,
    homeworkId: null,
    communicationKeys: [],
    parascolaireKeys: [],
  };

  try {
    logStep('Course PDF upload');
    const coursePdfRes = await request(app)
      .post('/api/admin/courses/upload-pdf')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('pdf', samplePdf);
    ensure(coursePdfRes.status === 200, `Course PDF upload failed: ${coursePdfRes.status}`);
    const coursePdfKey = assertPublicUrl(coursePdfRes.body.fileUrl, 'Course PDF upload');
    await assertObjectExists(coursePdfKey, 'Course PDF upload');
    await fetchPublic(coursePdfRes.body.fileUrl, 'Course PDF upload');
    track('Course PDF upload', true, coursePdfKey);

    logStep('Create course with PDF');
    const courseRes = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `R2 Course ${Date.now()}`,
        description: 'R2 verification course',
        contentUrl: coursePdfRes.body.fileUrl,
        videoUrl: null,
        videoPath: null,
        difficulty: 'BEGINNER',
        tags: ['r2', 'upload'],
        subjectId: subject.id,
      });
    ensure(courseRes.status === 201, `Course create failed: ${courseRes.status}`);
    created.courseId = courseRes.body.id;
    const courseDb = await prisma.course.findUnique({ where: { id: created.courseId } });
    ensure(isStoredAsKey(courseDb.contentUrl), 'Course contentUrl is not stored as key');
    ensure(courseRes.body.contentUrl.startsWith(PUBLIC_BASE), 'Course API did not return public URL');

    logStep('Video upload');
    const videoRes = await request(app)
      .post('/api/admin/uploads/video')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('video', sampleVideo);
    ensure(videoRes.status === 200, `Video upload failed: ${videoRes.status}`);
    const videoKey = assertPublicUrl(videoRes.body.videoPath, 'Video upload');
    await assertObjectExists(videoKey, 'Video upload');
    await fetchPublic(videoRes.body.videoPath, 'Video upload');
    track('Video upload', true, videoKey);

    logStep('Attach video to course');
    const courseUpdateRes = await request(app)
      .put(`/api/courses/${created.courseId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: courseRes.body.title,
        description: courseRes.body.description,
        contentUrl: courseRes.body.contentUrl,
        videoUrl: null,
        videoPath: videoRes.body.videoPath,
        difficulty: 'BEGINNER',
        tags: ['r2', 'upload'],
        subjectId: subject.id,
      });
    ensure(courseUpdateRes.status === 200, `Course update with video failed: ${courseUpdateRes.status}`);
    const courseDbAfterVideo = await prisma.course.findUnique({ where: { id: created.courseId } });
    ensure(isStoredAsKey(courseDbAfterVideo.videoPath), 'Course videoPath is not stored as key');
    ensure(courseUpdateRes.body.videoPath.startsWith(PUBLIC_BASE), 'Course API videoPath did not return public URL');

    logStep('Exercise PDF upload');
    const exercisePdfRes = await request(app)
      .post('/api/admin/exercises/upload-pdf')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('pdf', samplePdf);
    ensure(exercisePdfRes.status === 200, `Exercise PDF upload failed: ${exercisePdfRes.status}`);
    const exercisePdfKey = assertPublicUrl(exercisePdfRes.body.fileUrl, 'Exercise PDF upload');
    await assertObjectExists(exercisePdfKey, 'Exercise PDF upload');
    await fetchPublic(exercisePdfRes.body.fileUrl, 'Exercise PDF upload');
    track('Exercise PDF upload', true, exercisePdfKey);

    logStep('Create exercise with PDF');
    const exerciseRes = await request(app)
      .post('/api/exercises')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `R2 Exercise ${Date.now()}`,
        description: 'R2 verification exercise',
        contentUrl: exercisePdfRes.body.fileUrl,
        difficulty: 'BEGINNER',
        subjectId: subject.id,
      });
    ensure(exerciseRes.status === 201, `Exercise create failed: ${exerciseRes.status}`);
    created.exerciseId = exerciseRes.body.id;
    const exerciseDb = await prisma.exercise.findUnique({ where: { id: created.exerciseId } });
    ensure(isStoredAsKey(exerciseDb.contentUrl), 'Exercise contentUrl is not stored as key');
    ensure(exerciseRes.body.contentUrl.startsWith(PUBLIC_BASE), 'Exercise API did not return public URL');

    logStep('Exercise correction PDF upload');
    const correctionRes = await request(app)
      .post('/api/admin/exercise-correction')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('exerciseId', created.exerciseId)
      .field('title', `Correction ${Date.now()}`)
      .attach('pdf', samplePdf);
    ensure(correctionRes.status === 200, `Exercise correction upload failed: ${correctionRes.status}`);
    created.correctionId = correctionRes.body.id;
    const correctionKey = assertPublicUrl(correctionRes.body.contentUrl, 'Exercise correction upload');
    await assertObjectExists(correctionKey, 'Exercise correction upload');
    await fetchPublic(correctionRes.body.contentUrl, 'Exercise correction upload');
    const correctionDb = await prisma.correction.findUnique({ where: { id: created.correctionId } });
    ensure(isStoredAsKey(correctionDb.contentUrl), 'Correction contentUrl is not stored as key');
    track('Exercise correction PDF upload', true, correctionKey);

    logStep('Platform Offer image upload');
    const offerImageRes = await request(app)
      .post('/api/admin/settings/upload/offer-banner')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', sampleImage);
    ensure(offerImageRes.status === 200, `Platform Offer image upload failed: ${offerImageRes.status}`);
    const offerImageKey = assertPublicUrl(offerImageRes.body.fileUrl, 'Platform Offer image upload');
    await assertObjectExists(offerImageKey, 'Platform Offer image upload');
    await fetchPublic(offerImageRes.body.fileUrl, 'Platform Offer image upload');
    const setting = await prisma.appSetting.findUnique({ where: { key: 'platformOfferBannerImage' } });
    ensure(isStoredAsKey(setting.value), 'Platform Offer image setting is not stored as key');
    track('Platform Offer image upload', true, offerImageKey);

    logStep('Communication attachment uploads');
    const commImageUpload = await request(app)
      .post('/api/admin/communications/uploads/image')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', sampleImage);
    ensure(commImageUpload.status === 200, `Communication image upload failed: ${commImageUpload.status}`);
    const commPdfUpload = await request(app)
      .post('/api/admin/communications/uploads/pdf')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', samplePdf);
    ensure(commPdfUpload.status === 200, `Communication PDF upload failed: ${commPdfUpload.status}`);
    const commVideoUpload = await request(app)
      .post('/api/admin/communications/uploads/video')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', sampleVideo);
    ensure(commVideoUpload.status === 200, `Communication video upload failed: ${commVideoUpload.status}`);

    logStep('Create communication with attachments');
    const communicationRes = await request(app)
      .post('/api/admin/communications')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `R2 Communication ${Date.now()}`,
        description: 'R2 communication',
        contentHtml: '<p>R2 communication body</p>',
        type: 'GENERAL_INFORMATION',
        priority: 'MEDIUM',
        status: 'DRAFT',
        audience: 'ALL_STUDENTS',
        attachments: [
          commImageUpload.body.attachment,
          commPdfUpload.body.attachment,
          commVideoUpload.body.attachment,
        ],
      });
    ensure(communicationRes.status === 201, `Communication create failed: ${communicationRes.status}`);
    created.communicationId = communicationRes.body.item.id;
    const communicationDb = await prisma.communication.findUnique({
      where: { id: created.communicationId },
      include: { attachments: true },
    });
    ensure(communicationDb.attachments.length === 3, 'Communication attachments were not saved');
    for (const attachment of communicationDb.attachments) {
      ensure(isStoredAsKey(attachment.filePath), 'Communication attachment filePath is not stored as key');
      await assertObjectExists(attachment.filePath, 'Communication attachment');
      await fetchPublic(toPublicUrlFromStoredValue(attachment.filePath), 'Communication attachment');
      created.communicationKeys.push(attachment.filePath);
    }
    track('Announcement attachments upload', true, created.communicationKeys.join(', '));

    logStep('Parascolaire uploads');
    const paraCoverUpload = await request(app)
      .post('/api/parascolaires/upload-cover')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('cover', sampleImage);
    ensure(paraCoverUpload.status === 200, `Parascolaire cover upload failed: ${paraCoverUpload.status}`);

    const paraPdfUpload = await request(app)
      .post('/api/parascolaires/upload-pdf')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('pdf', samplePdf);
    ensure(paraPdfUpload.status === 200, `Parascolaire PDF upload failed: ${paraPdfUpload.status}`);

    logStep('Create parascolaire');
    const parascolaireRes = await request(app)
      .post('/api/parascolaires')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `R2 Parascolaire ${Date.now()}`,
        description: 'R2 parascolaire',
        bacSection: subject.bacSection,
        coverImage: paraCoverUpload.body.fileUrl,
        category: 'BOOK',
        isFree: false,
        hasPdf: true,
        pdfUrl: paraPdfUpload.body.fileUrl,
        pdfPrice: 10,
        hasPaperBook: false,
      });
    ensure(parascolaireRes.status === 201, `Parascolaire create failed: ${parascolaireRes.status}`);
    created.parascolaireId = parascolaireRes.body.id;
    const parascolaireDb = await prisma.parascolaire.findUnique({ where: { id: created.parascolaireId } });
    ensure(isStoredAsKey(parascolaireDb.coverImage), 'Parascolaire coverImage is not stored as key');
    ensure(isStoredAsKey(parascolaireDb.pdfUrl), 'Parascolaire pdfUrl is not stored as key');
    await assertObjectExists(parascolaireDb.coverImage, 'Parascolaire cover');
    await assertObjectExists(parascolaireDb.pdfUrl, 'Parascolaire PDF');
    await fetchPublic(parascolaireRes.body.coverImage, 'Parascolaire cover');
    await fetchPublic(parascolaireRes.body.pdfUrl, 'Parascolaire PDF');
    created.parascolaireKeys = [parascolaireDb.coverImage, parascolaireDb.pdfUrl];
    track('Parascolaire image upload', true, parascolaireDb.coverImage);
    track('Parascolaire PDF upload', true, parascolaireDb.pdfUrl);

    logStep('Homework upload');
    const homeworkUploadRes = await request(app)
      .post('/api/homework/upload')
      .set('Authorization', `Bearer ${studentToken}`)
      .attach('homework', samplePdf);
    ensure(homeworkUploadRes.status === 200, `Homework upload failed: ${homeworkUploadRes.status}`);
    created.homeworkId = homeworkUploadRes.body.id;
    const homeworkKey = assertPublicUrl(homeworkUploadRes.body.fileUrl, 'Homework upload');
    await assertObjectExists(homeworkKey, 'Homework upload');
    await fetchPublic(homeworkUploadRes.body.fileUrl, 'Homework upload');
    const homeworkDb = await prisma.homeworkSubmission.findUnique({ where: { id: created.homeworkId } });
    ensure(isStoredAsKey(homeworkDb.fileUrl), 'Homework fileUrl is not stored as key');
    track('Homework upload', true, homeworkKey);

    const deletionBefore = await prisma.parascolaire.findUnique({ where: { id: created.parascolaireId } });
    ensure(!!deletionBefore, 'Parascolaire not found before delete verification');
    logStep('Delete parascolaire and verify R2 cleanup');
    const deleteParaRes = await request(app)
      .delete(`/api/parascolaires/${created.parascolaireId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    ensure(deleteParaRes.status === 200, `Parascolaire delete failed: ${deleteParaRes.status}`);
    const deletionAfter = await prisma.parascolaire.findUnique({ where: { id: created.parascolaireId } });
    ensure(!deletionAfter, 'Parascolaire still exists in DB after delete');
    await Promise.all(created.parascolaireKeys.map((key) => assertObjectMissing(key, 'Deleted parascolaire object')));
    track('Delete file from DB and R2', true, created.parascolaireKeys.join(', '));
    created.parascolaireId = null;

    const badRefs = {
      course: await prisma.course.count({ where: { OR: [{ contentUrl: { startsWith: 'http' } }, { contentUrl: { startsWith: '/uploads/' } }, { videoPath: { startsWith: 'http' } }, { videoPath: { startsWith: '/uploads/' } }] } }),
      exercise: await prisma.exercise.count({ where: { contentUrl: { startsWith: '/uploads/' } } }),
      correction: await prisma.correction.count({ where: { contentUrl: { startsWith: '/uploads/' } } }),
      parascolaire: await prisma.parascolaire.count({ where: { OR: [{ coverImage: { startsWith: '/uploads/' } }, { pdfUrl: { startsWith: '/uploads/' } }] } }),
      homework: await prisma.homeworkSubmission.count({ where: { OR: [{ fileUrl: { startsWith: '/uploads/' } }, { correctionUrl: { startsWith: '/uploads/' } }] } }),
      courseResource: await prisma.courseResource.count({ where: { url: { startsWith: '/uploads/' } } }),
      exerciseResource: await prisma.exerciseResource.count({ where: { url: { startsWith: '/uploads/' } } }),
      communicationAttachment: await prisma.communicationAttachment.count({ where: { filePath: { startsWith: '/uploads/' } } }),
      appSetting: await prisma.appSetting.count({ where: { value: { startsWith: '/uploads/' } } }),
    };
    const badTotal = Object.values(badRefs).reduce((sum, value) => sum + value, 0);
    ensure(badTotal === 0, `Found legacy /uploads references in DB: ${JSON.stringify(badRefs)}`);

    logStep('Bucket listing and legacy DB reference checks');
    const bucketList = await listObjects({ prefix: '', maxKeys: 50 });
    ensure(Array.isArray(bucketList.Contents), 'Could not list R2 bucket contents');

    console.log(JSON.stringify({ ok: true, checklist: results }, null, 2));
  } finally {
    try {
      if (created.communicationId) {
        await request(app)
          .delete(`/api/admin/communications/${created.communicationId}`)
          .set('Authorization', `Bearer ${adminToken}`);
      }
      if (created.courseId) {
        await request(app)
          .delete(`/api/courses/${created.courseId}`)
          .set('Authorization', `Bearer ${adminToken}`);
      }
      if (created.exerciseId) {
        await request(app)
          .delete(`/api/exercises/${created.exerciseId}`)
          .set('Authorization', `Bearer ${adminToken}`);
      }
    } catch (cleanupError) {
      console.error('Cleanup warning:', cleanupError.message);
    }
    await prisma.$disconnect();
    destroyR2Client();
  }
}

main().catch(async (error) => {
  console.error(error.stack || error.message || error);
  await prisma.$disconnect();
  destroyR2Client();
  process.exit(1);
});
