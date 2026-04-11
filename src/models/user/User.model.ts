import { BaseEntity } from '@core/types/BaseEntity.abstract';

export interface IUser extends BaseEntity {
  name: string;
  email: string;
  password_hash?: string;
  isEmailConfirmed: boolean;
  provider?: 'local' | 'google' | 'github';
  googleId?: string;
  githubId?: string;
  picture?: string;
  username?: string;
}

export const UserKey = 'users';
