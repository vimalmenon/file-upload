const express = require("express");
const formidableMiddleware = require("express-formidable");

const { DynamoDB, S3 } = require("aws-sdk");

const app = express();

const dynamoDB = new DynamoDB.DocumentClient();
const s3 = new S3();

const env = {
  port: process.env.PORT || 8000,
  table: process.env.DYNAMO_DB_Table || "",
  s3: process.env.S3_BUCKET || "",
};

app.use(formidableMiddleware());

const checkEnv = () => {
  let check = true;
  env.keys().forEach((key) => {
    if (!env[key]) {
      check = false;
    }
  });
  return check;
};

const uploadImageToS3 = () => {};

const updateRecord = () => {};

app.put("/", (req, res) => {
  const { ...rest } = req.query;
  const { file, name } = req.fields;
  if (file && name && checkEnv()) {
    uploadImageToS3(file);
    updateRecord();
    res.json({
      code: 1,
      ...rest,
    });
  } else {
    res.json({
      code: 2,
      ...rest,
    });
  }
});

app.listen(env.port, () => {
  console.log(`Application is listening on port ${env.port}`);
});
