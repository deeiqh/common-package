import {
  CACHE_MANAGER,
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { Cache } from 'cache-manager';

export const OTP_OPERATION_MAX_MINUTES = 1;

@Injectable()
export class SendOtpGuard implements CanActivate {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject('CLIENT_KAFKA') private readonly clientKafka: ClientKafka,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const data = context.switchToRpc().getData(); //add cases, rpc, http, graphql
    const { targetType, target, operationUUID } = data.otpHeaders;

    //consider
    const numberDigits = 6;
    const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    let code = '';
    for (let i = numberDigits; i > 0; --i) {
      code += chars[Math.round(Math.random() * (chars.length - 1))];
    }
    code = code.toUpperCase();

    this.clientKafka.emit('send-otp-operation', {
      targetType,
      target,
      code,
    });

    await this.cacheManager.set(
      operationUUID,
      {
        code,
      },
      OTP_OPERATION_MAX_MINUTES * 60,
    );

    return true;
  }
}