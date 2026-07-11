require('dotenv').config();

const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');

const prisma = require('../lib/prisma');
const { headObject, putObject, normalizeStoredFileValueToKey, destroyR2Client } = require('../lib/r2');

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');

const toPosix = (value) => String(value || '').replace(/\\/g, '/');

async function walk(dir, out) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, out);
      continue;
    }
    if (!entry.isFile()) continue;
    out.push(full);
  }
}

const getKeyForFile = (fullPath) => {
  const rel = path.relative(UPLOADS_ROOT, fullPath);
  return toPosix(rel).replace(/^\/+/, '');
};

async function uploadFileIfMissing(fullPath, key) {
  const existing = await headObject(key);
  if (existing) return { key, skipped: true };
  const body = fsSync.createReadStream(fullPath);
  const contentType = null;
  await putObject({ key, body, contentType });
  return { key, skipped: false };
}

async function updateDbValueToKey(model, where, data) {
  await prisma[model].updateMany({ where, data });
}

async function migrateDbReferences() {
  const updateField = async (model, field) => {
    const rows = await prisma[model].findMany({
      where: { [field]: { not: null } },
      select: { id: true, [field]: true },
    });

    for (const row of rows) {
      const value = row[field];
      const key = normalizeStoredFileValueToKey(value);
      if (!key) continue;
      if (key === value) continue;
      await prisma[model].update({
        where: { id: row.id },
        data: { [field]: key },
      });
    }
  };

  await updateField('course', 'contentUrl');
  await updateField('course', 'videoPath');
  await updateField('exercise', 'contentUrl');
  await updateField('correction', 'contentUrl');
  await updateField('parascolaire', 'coverImage');
  await updateField('parascolaire', 'pdfUrl');
  await updateField('homeworkSubmission', 'fileUrl');
  await updateField('homeworkSubmission', 'correctionUrl');
  await updateField('courseResource', 'url');
  await updateField('exerciseResource', 'url');
  await updateField('communicationAttachment', 'filePath');

  const settingRows = await prisma.appSetting.findMany({
    select: { key: true, value: true },
  });
  for (const setting of settingRows) {
    const next = normalizeStoredFileValueToKey(setting.value);
    if (!next) continue;
    if (next === setting.value) continue;
    await prisma.appSetting.update({
      where: { key: setting.key },
      data: { value: next },
    });
  }
}

async function main() {
  const files = [];
  try {
    await walk(UPLOADS_ROOT, files);
  } catch (error) {
    console.error('Uploads folder not found, skipping file migration');
    return;
  }

  console.log(`Found ${files.length} local files under uploads/`);

  let uploaded = 0;
  let skipped = 0;
  const concurrency = 4;
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (fullPath, batchIndex) => {
        const index = i + batchIndex + 1;
        const key = getKeyForFile(fullPath);
        if (!key) return { skipped: true, key: '' };
        console.log(`[${index}/${files.length}] ${key}`);
        return uploadFileIfMissing(fullPath, key);
      })
    );
    for (const result of batchResults) {
      if (!result.key) continue;
      if (result.skipped) skipped += 1;
      else uploaded += 1;
    }
  }

  console.log(`R2 upload complete: uploaded=${uploaded} skipped=${skipped}`);

  console.log('Updating database references to store only object keys...');
  await migrateDbReferences();
  console.log('Database migration complete');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    destroyR2Client();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    destroyR2Client();
    process.exit(1);
  });
