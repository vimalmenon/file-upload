const express = require("express");
const formidableMiddleware = require("express-formidable");

const { DynamoDB, S3 } = require("aws-sdk");

const app = express();
const port = 3000;

const dynamoDB = new DynamoDB.DocumentClient();
const s3 = new S3();

console.log(dynamoDB, s3);

app.use(formidableMiddleware());

app.put("/", (req, res) => {
  console.log(req.files);
  res.json({
    code: 1,
    body: "test",
  });
});

app.listen(port, () => {
  console.log(`Application is listening on port ${port}`);
});
