import fs from 'fs';

import express from 'express';
import formidableMiddleware from 'express-formidable';

import { dynamoDB, s3, verifier } from './awsService';
import { env, FolderAppKey } from './constants';
import { checkEnv, getAllFilesFromBucket, indexFiles } from './helper';

const app = express();

app.use(formidableMiddleware());

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
        appKey: FolderAppKey,
        sortKey: `images#${fileName}`,
        createdDate: new Date().toISOString(),
        updatedDate: new Date().toISOString(),
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
      return false;
    }
  }
  return false;
};

app.put('/', async (req, res) => {
  const { authorization } = req.headers;
  const { ...rest } = req.query;
  const { file } = req.files as any;
  const { name } = req.fields as any;

  if (!checkEnv()) {
    res.json({
      message: 'Env values are not set',
      code: 1,
      ...rest,
    });
    return;
  }
  const hasAccess = await checkAuthorization(authorization as string);
  if (!hasAccess) {
    res.json({
      message: 'You are not authorized',
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
    code: 0,
    message: 'success',
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
  // const hasAccess = await checkAuthorization(authorization as string);
  // if (!hasAccess) {
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
