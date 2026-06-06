import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default-secret-key',
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRATION') ||
            '1h') as any,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
