require('dotenv').config();

const prisma = require('../lib/prisma');
const { toPublicUrlFromStoredValue, destroyR2Client } = require('../lib/r2');

async function checkUrl(url, mode) {
  if (!url) return null;

  if (mode === 'range') {
    const res = await fetch(url, {
      headers: {
        Range: 'bytes=0-0',
      },
    });
    return {
      status: res.status,
      ok: res.ok,
      url,
    };
  }

  const res = await fetch(url, { method: 'HEAD' });
  return {
    status: res.status,
    ok: res.ok,
    url,
  };
}

async function main() {
  const courses = await prisma.course.findMany({
    where: {
      OR: [{ contentUrl: { not: null } }, { videoPath: { not: null } }],
    },
    select: {
      id: true,
      title: true,
      contentUrl: true,
      videoPath: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const parascolaires = await prisma.parascolaire.findMany({
    where: {
      OR: [{ coverImage: { not: null } }, { pdfUrl: { not: null } }],
    },
    select: {
      id: true,
      title: true,
      coverImage: true,
      pdfUrl: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const results = [];

  for (const course of courses) {
    if (course.contentUrl) {
      results.push({
        type: 'course-pdf',
        id: course.id,
        title: course.title,
        ...(await checkUrl(toPublicUrlFromStoredValue(course.contentUrl), 'range')),
      });
    }
    if (course.videoPath) {
      results.push({
        type: 'course-video',
        id: course.id,
        title: course.title,
        ...(await checkUrl(toPublicUrlFromStoredValue(course.videoPath), 'range')),
      });
    }
  }

  for (const item of parascolaires) {
    if (item.coverImage) {
      results.push({
        type: 'parascolaire-image',
        id: item.id,
        title: item.title,
        ...(await checkUrl(toPublicUrlFromStoredValue(item.coverImage), 'head')),
      });
    }
    if (item.pdfUrl) {
      results.push({
        type: 'parascolaire-pdf',
        id: item.id,
        title: item.title,
        ...(await checkUrl(toPublicUrlFromStoredValue(item.pdfUrl), 'range')),
      });
    }
  }

  const failures = results.filter((item) => !item.ok);
  console.log(
    JSON.stringify(
      {
        totalChecked: results.length,
        failureCount: failures.length,
        failures,
        samples: results.filter((item) => item.ok).slice(0, 10),
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
