import { env } from './constants';

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
