import express from "express";
import formidableMiddleware from "express-formidable";
import fs from "fs";
import dotenv from 'dotenv';

import { DynamoDB, S3 } from "aws-sdk";
import { CognitoJwtVerifier } from "aws-jwt-verify";

const app = express();

const dynamoDB = new DynamoDB.DocumentClient({
  region: "us-east-1",
});
const s3 = new S3();

const appKey = "APP#KM#FOLDERS_FILE";

app.use(formidableMiddleware());
dotenv.config();

const env = {
  port: process.env.PORT,
  table: process.env.DYNAMO_DB_Table || "",
  s3: process.env.S3_BUCKET || "",
  userPoolId: process.env.USER_POOL_ID || "",
  clientId: process.env.CLIENT_ID || "",
};

const verifier = CognitoJwtVerifier.create({
  userPoolId: env.userPoolId,
  tokenUse: "access",
  clientId: env.clientId,
});

const StorageFolderMapping = {
  image: "images",
  file: "files",
  video: "videos",
  audio: "audios",
};

const SupportedFileTypes = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "application/pdf",
  "application/zip",
  "application/json",
  "video/quicktime",
  "video/mp4",
  "audio/mpeg",
];
const DriveFolderMapping = {
  "image/jpeg": StorageFolderMapping.image,
  "image/png": StorageFolderMapping.image,
  "image/heic": StorageFolderMapping.image,
  "application/pdf": StorageFolderMapping.file,
  "application/zip": StorageFolderMapping.file,
  "application/json": StorageFolderMapping.file,
  "video/quicktime": StorageFolderMapping.video,
  "video/mp4": StorageFolderMapping.video,
  "audio/mpeg": StorageFolderMapping.audio,
};


const checkEnv = () => {
  if (!env.clientId) {
    return false;
  }
  if (!env.table) {
    return false;
  }
  if (!env.userPoolId) {
    return false;
  }
  if (!env.s3) {
    return false;
  }
  return true;
};

const uploadImageToS3 = (key: string, file: any) => {
  return s3
    .putObject({
      Bucket: env.s3,
      Key: key,
      Body: file,
    })
    .promise();
};

const updateRecord = ({ fileName }: any) => {
  return dynamoDB
    .put({
      TableName: env.table,
      Item: {
        appKey: appKey,
        sortKey: `images#${fileName}`,
        createdDate: new Date().toISOString(),
        updatedDate: new Date().toISOString(),
        isIndexed: false,
      },
    })
    .promise();
};

const checkAuthorization = async (authorization: string) => {
  if (authorization) {
    try {
      await verifier.verify(authorization);
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }
  return false;
};

app.put("/", async (req, res) => {
  const { authorization } = req.headers;
  const { ...rest } = req.query;
  const { file } = req.files as any;
  const { name } = req.fields as any;

  if (!checkEnv()) {
    res.json({
      message: "Env values are not set",
      ...rest,
    });
    return;
  }
  const hasAccess = await checkAuthorization(authorization as string);
  if (!hasAccess) {
    res.json({
      message: "You are not authorized",
      ...rest,
    });
    return;
  }
  if (file && name) {
    await uploadImageToS3(name, fs.createReadStream(file.path));
    await updateRecord({ fileName: name });
    res.json({
      code: 1,
      ...rest,
    });
    return;
  }
  res.json({
    code: 2,
    ...rest,
  });
});

app.listen(env.port, () => {
  console.log(`Application is listening on port ${env.port}`);
});
