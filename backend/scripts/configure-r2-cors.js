require('dotenv').config();

const {
  destroyR2Client,
  getBucketCors,
  getRecommendedCorsRules,
  putBucketCors,
} = require('../lib/r2');

async function main() {
  const before = await getBucketCors();
  const target = getRecommendedCorsRules();
  const after = await putBucketCors(target);

  console.log(
    JSON.stringify(
      {
        before,
        target,
        after,
      },
      null,
      2
    )
  );
}

main()
  .then(() => {
    destroyR2Client();
  })
  .catch((error) => {
    console.error(error.stack || error.message || error);
    destroyR2Client();
    process.exit(1);
  });
