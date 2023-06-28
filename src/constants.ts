import dotenv from 'dotenv';

dotenv.config();

export const StorageFolderMapping = {
  image: 'images',
  file: 'files',
  video: 'videos',
  audio: 'audios',
};

export const Folders = ['files', 'images', 'videos'];

export const DriveFolderMapping: Record<string, string> = {
  'image/jpeg': StorageFolderMapping.image,
  'image/jpg': StorageFolderMapping.image,
  'image/png': StorageFolderMapping.image,
  'image/heic': StorageFolderMapping.image,
  'application/pdf': StorageFolderMapping.file,
  'application/zip': StorageFolderMapping.file,
  'application/json': StorageFolderMapping.file,
  'video/quicktime': StorageFolderMapping.video,
  'video/mp4': StorageFolderMapping.video,
  'audio/mpeg': StorageFolderMapping.audio,
};

export const SupportedFileTypes = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'application/pdf',
  'application/zip',
  'application/json',
  'video/quicktime',
  'video/mp4',
  'audio/mpeg',
];

export const FileExtensionMapping: Record<string, string> = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  mp4: 'video/mp4',
  mp3: 'audio/mpeg',
  pdf: 'application/pdf',
  zip: 'application/zip',
  json: 'application/json',
  mov: 'video/quicktime',
};

export const FileTypeMapping: Record<string, string> = {
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'video/mp4': 'mp4',
  'audio/mpeg': 'mp3',
  'application/pdf': 'pdf',
  'application/zip': 'zip',
  'application/json': 'json',
  'video/quicktime': 'mov',
};
export const env = {
  port: process.env.PORT,
  table: process.env.DYNAMO_DB_Table || '',
  s3: process.env.S3_BUCKET || '',
  userPoolId: process.env.USER_POOL_ID || '',
  clientId: process.env.CLIENT_ID || '',
};

export const FolderAppKey = 'APP#KM#FOLDERS_FILE';

export const UnIndexedFolder = '08bdaba3-4452-44fb-bcd2-aa00791fb8ce';
