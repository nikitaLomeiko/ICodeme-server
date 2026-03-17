export interface IAuthResponse {
  token: string;
  refreshToken: string;
}

export interface IAuthWithUserIdResponse {
  token: string;
  refreshToken: string;
  userId: string;
}
