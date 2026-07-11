require('dotenv').config();

const prisma = require('../lib/prisma');
const { headObject, normalizeStoredFileValueToKey, destroyR2Client } = require('../lib/r2');

async function checkRows(label, rows, fields) {
  const missing = [];

  for (const row of rows) {
    for (const field of fields) {
      const raw = row[field];
      if (!raw) continue;
      const key = normalizeStoredFileValueToKey(raw);
      if (!key || /^https?:\/\//i.test(key)) continue;
      const exists = await headObject(key);
      if (!exists) {
        missing.push({
          model: label,
          id: row.id,
          field,
          key,
          title: row.title || null,
        });
      }
    }
  }

  return missing;
}

async function main() {
  const missing = [];

  missing.push(
    ...(await checkRows(
      'course',
      await prisma.course.findMany({
        select: { id: true, title: true, contentUrl: true, videoPath: true },
      }),
      ['contentUrl', 'videoPath']
    ))
  );

  missing.push(
    ...(await checkRows(
      'exercise',
      await prisma.exercise.findMany({
        select: { id: true, title: true, contentUrl: true },
      }),
      ['contentUrl']
    ))
  );

  missing.push(
    ...(await checkRows(
      'correction',
      await prisma.correction.findMany({
        select: { id: true, title: true, contentUrl: true },
      }),
      ['contentUrl']
    ))
  );

  missing.push(
    ...(await checkRows(
      'parascolaire',
      await prisma.parascolaire.findMany({
        select: { id: true, title: true, coverImage: true, pdfUrl: true },
      }),
      ['coverImage', 'pdfUrl']
    ))
  );

  missing.push(
    ...(await checkRows(
      'homeworkSubmission',
      await prisma.homeworkSubmission.findMany({
        select: { id: true, fileUrl: true, correctionUrl: true },
      }),
      ['fileUrl', 'correctionUrl']
    ))
  );

  missing.push(
    ...(await checkRows(
      'courseResource',
      await prisma.courseResource.findMany({
        select: { id: true, title: true, url: true },
      }),
      ['url']
    ))
  );

  missing.push(
    ...(await checkRows(
      'exerciseResource',
      await prisma.exerciseResource.findMany({
        select: { id: true, title: true, url: true },
      }),
      ['url']
    ))
  );

  missing.push(
    ...(await checkRows(
      'communicationAttachment',
      await prisma.communicationAttachment.findMany({
        select: { id: true, filePath: true },
      }),
      ['filePath']
    ))
  );

  console.log(JSON.stringify({ missingCount: missing.length, missing }, null, 2));
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
