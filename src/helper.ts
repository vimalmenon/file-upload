import { s3, dynamoDB } from './awsService';
import { env, Folders, FolderAppKey, UnIndexedFolder, FileExtensionMapping } from './constants';

export const checkEnv = (): boolean => {
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

export const indexFiles = async (values: string[]) => {
  for (let index = 0; index < values.length; index++) {
    const count = await checkFileExits(values[index]);
    if (count === 0) {
      await indexFile(values[index]);
    }
  }
};
export const checkFileExits = async (value: string): Promise<number> => {
  const params = {
    TableName: env.table,
    KeyConditionExpression: '#appKey = :appKey',
    FilterExpression: '#path = :path',
    ProjectionExpression: 'id',
    ExpressionAttributeNames: {
      '#appKey': 'appKey',
      '#path': 'path',
    },
    ExpressionAttributeValues: {
      ':appKey': FolderAppKey,
      ':path': value,
    },
  };
  const result = await dynamoDB.query(params).promise();
  return result.Count || 0;
};
export const indexFile = (value: string) => {
  const [, fileName] = value.split('/');
  const fileType = getTypeFromFile(fileName);

  const params = {
    TableName: env.table,
    Item: {
      appKey: FolderAppKey,
      sortKey: `${UnIndexedFolder}#${fileName}`,
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      id: fileName,
      path: value,
      type: fileType || 'unknown',
      metadata: {},
      label: fileName,
    },
  };
  dynamoDB.put(params).promise();
};

export const getAllFilesFromBucket = async (): Promise<string[]> => {
  let values: any[] = [];
  for (let index = 0; index < Folders.length; index++) {
    const result = await getFilesFromFolder(Folders[index]);
    values = [...values, ...result];
  }
  return values;
};

export const getAllFilesFromFolder = async (folder: string, token?: string) => {
  const params: any = {
    Bucket: env.s3,
    Prefix: folder,
  };
  if (token) {
    params['ContinuationToken'] = token;
  }
  const results = await s3.listObjectsV2(params).promise();
  let items: any[] = [...(results.Contents || [])];
  if (results.IsTruncated) {
    const nextItem = await getAllFilesFromFolder(folder, results.NextContinuationToken);
    items = [...items, ...nextItem];
  }
  return items;
};
export const getFilesFromFolder = async (folder: string) => {
  const results = await getAllFilesFromFolder(folder);

  return results.reduce<string[]>((initialValue, result) => {
    if (result.Key?.endsWith('/')) {
      return initialValue;
    }
    return [...initialValue, result.Key || ''];
  }, []);
};

export const getTypeFromFile = (fileName: string): string | null => {
  const extension = fileName.split('.').pop();
  if (extension?.toLowerCase()) {
    return FileExtensionMapping[extension?.toLowerCase()];
  }
  return null;
};
