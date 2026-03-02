export interface IAuthTokenPayload {
  sub: string;
  login: string;
  type: 'access' | 'refresh';
}
