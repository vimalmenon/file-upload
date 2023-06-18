const express = require("express");
const formidableMiddleware = require("express-formidable");

const { DynamoDB, S3 } = require("aws-sdk");

const app = express();

const dynamoDB = new DynamoDB.DocumentClient();
const s3 = new S3();

const env = {
  port: process.env.PORT || 8000,
};

app.use(formidableMiddleware());

const uploadImageToS3 = () => {};

const updateRecord = () => {};

app.put("/", (req, res) => {
  console.log(req.files);
  const { file, name, ...rest } = req.fields;
  if (file && name) {
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
