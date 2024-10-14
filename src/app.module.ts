import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ZohoBookingsController } from './zoho-bookings/zoho-bookings.controller';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [ZohoBookingsController],
})
export class AppModule {}
