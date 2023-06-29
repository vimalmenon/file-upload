import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { DynamoDB, S3 } from 'aws-sdk';

import { env } from './constants';

export const dynamoDB = new DynamoDB.DocumentClient({
  region: 'us-east-1',
});
export const s3 = new S3();

export const verifier = CognitoJwtVerifier.create({
  userPoolId: env.userPoolId,
  tokenUse: 'access',
  clientId: env.clientId,
});
