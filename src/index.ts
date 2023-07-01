import { randomUUID } from 'crypto';
import fs from 'fs';

import cors from 'cors';
import express from 'express';
import formidableMiddleware from 'express-formidable';
import convert from 'heic-convert';

import { dynamoDB, s3, verifier } from './awsService';
import { env, FolderAppKey, FileTypeMapping, DriveFolderMapping } from './constants';
import { checkEnv, getAllFilesFromBucket, indexFiles, getAllFileDataWithPath } from './helper';

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

app.put('/convert', async (req, res) => {
  const { authorization } = req.headers;
  const { type, path } = req.fields as any;
  const { ...rest } = req.query;

  if (type !== 'image/heic') {
    res.json({
      code: 1,
      message: 'File type has to be of type heic',
      ...rest,
    });
    return;
  }
  const result = await getAllFileDataWithPath(path);
  const updatedBy = await checkAuthorization(authorization);
  if (!updatedBy) {
    res.json({
      message: 'You are not authorized',
      ...rest,
    });
    return;
  }
  if (result.Items?.length) {
    const item = await s3
      .getObject({
        Bucket: env.s3,
        Key: path,
      })
      .promise();
    s3.deleteObject({
      Bucket: env.s3,
      Key: path,
    });
    const outputBuffer = await convert({
      buffer: item.Body as Buffer, // the HEIC file buffer
      format: 'JPEG', // output format
      quality: 1, // the jpeg compression quality, between 0 and 1
    });
    await s3
      .putObject({
        Bucket: env.s3,
        Key: result.Items[0].path,
        Body: outputBuffer,
        ContentType: 'image/jpeg',
      })
      .promise();
    await dynamoDB
      .update({
        TableName: env.table,
        Key: {
          appKey: FolderAppKey,
          sortKey: result.Items[0].sortKey,
        },
        UpdateExpression: `set #type=:type,  #updatedDate=:updatedDate, #updatedBy=:updatedBy`,
        ExpressionAttributeValues: {
          ':updatedDate': new Date().toISOString(),
          ':type': 'image/jpeg',
          ':updatedBy': updatedBy,
        },
        ExpressionAttributeNames: {
          '#updatedDate': 'updatedDate',
          '#type': 'type',
          '#updatedBy': 'updatedBy',
        },
        ReturnValues: 'UPDATED_NEW',
      })
      .promise();
    res.json({
      code: 0,
      message: 'success',
      ...rest,
    });
    return;
  }
  res.json({
    code: 1,
    message: 'File not found',
    ...rest,
  });
});

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
  const createdBy = await checkAuthorization(authorization as string);
  if (!createdBy) {
    res.json({
      message: 'You are not authorized',
      code: 1,
      ...rest,
    });
    return;
  }
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
