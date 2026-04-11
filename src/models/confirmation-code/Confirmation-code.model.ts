import { BaseEntity } from '@core/types/BaseEntity.abstract';

export interface IConfirmationCode extends BaseEntity {
  userId: string;
  codeHash: string;
}

export const ConfirmationCodeKey = 'confirmations_code';
