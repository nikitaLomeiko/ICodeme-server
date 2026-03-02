import { BaseEntity } from '@core/types/BaseEntity.abstract';

export interface IUser extends BaseEntity {
  name: string;
  email: string;
  password_hash: string;
}

export const UserKey = 'users';
