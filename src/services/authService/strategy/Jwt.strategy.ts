import { IAuthTokenPayload } from '@models/auth/AuthToken.model';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import config from '@core/config/jwt/jwt.config';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config().secret,
    });
  }

  async validate(payload: IAuthTokenPayload) {
    return { userId: payload.sub, email: payload.login };
  }
}
