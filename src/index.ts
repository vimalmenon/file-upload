import { randomUUID } from 'crypto';
import fs from 'fs';

import cors from 'cors';
import express from 'express';
import formidableMiddleware from 'express-formidable';

import { dynamoDB, s3, verifier } from './awsService';
import { env, FolderAppKey, FileTypeMapping, DriveFolderMapping } from './constants';
import { checkEnv, getAllFilesFromBucket, indexFiles } from './helper';

const app = express();

app.use(formidableMiddleware());
app.use(cors());

const uploadImageToS3 = (key: string, file: any) => {
  return s3
    .putObject({
      Bucket: env.s3,
      Key: key,
      Body: file,
    })
    .promise();
};

const updateRecord = (Item: any) => {
  return dynamoDB
    .put({
      TableName: env.table,
      Item,
    })
    .promise();
};

const checkAuthorization = async (authorization: string | undefined) => {
  if (authorization) {
    try {
      const data = await verifier.verify(authorization);
      return data.email;
    } catch (error) {
      console.log(error);
      return null;
    }
  }
  return null;
};

app.put('/:folder', async (req, res) => {
  const { authorization } = req.headers;
  const { ...rest } = req.query;
  const { data } = req.files as any;
  const { name } = req.fields as any;
  const { folder } = req.params;

  if (!folder) {
    res.json({
      code: 1,
      message: 'Folder params is missing',
      ...rest,
    });
    return;
  }
  if (!checkEnv()) {
    res.json({
      message: 'Env values are not set',
      code: 1,
      ...rest,
    });
    return;
  }
  const createdBy = await checkAuthorization(authorization);
  if (!createdBy) {
    res.json({
      message: 'You are not authorized',
      ...rest,
    });
    return;
  }
  const extension = FileTypeMapping[data.type];

  if (!extension) {
    res.json({
      message: 'Extension not supported',
      ...rest,
    });
    return;
  }
  const uid = randomUUID();

  const fileName = `${uid}.${extension}`;
  const fileFolder = DriveFolderMapping[data.type];
  if (data && name) {
    const insertData = {
      appKey: FolderAppKey,
      sortKey: `${folder}#${fileName}`,
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      createdBy,
      id: fileName,
      path: `${fileFolder}/${fileName}`,
      type: data.type,
      metadata: {},
      label: fileName,
    };
    await uploadImageToS3(`${fileFolder}/${fileName}`, fs.createReadStream(data.path));
    await updateRecord(insertData);
    res.json({
      code: 0,
      message: 'success',
      ...rest,
    });

    return;
  }
  res.json({
    code: 1,
    ...rest,
  });
});

app.put('/sync', async (req, res) => {
  const { authorization } = req.headers;
  const { ...rest } = req.query;
  if (!checkEnv()) {
    res.json({
      message: 'Env values are not set',
      code: 1,
      ...rest,
    });
    return;
  }
  // const createdBy = await checkAuthorization(authorization as string);
  // if (!createdBy) {
  //   res.json({
  //     message: 'You are not authorized',
  //     code: 1,
  //     ...rest,
  //   });
  //   return;
  // }
  const values = await getAllFilesFromBucket();
  indexFiles(values);
  res.json({
    code: 0,
    message: 'success',
    result: values,
    length: values.length,
    ...rest,
  });
});

app.listen(env.port, () => {
  console.log(`Application is listening on port ${env.port}`);
});
