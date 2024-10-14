import { Test, TestingModule } from '@nestjs/testing';
import { ZohoBookingsController } from './zoho-bookings.controller';

describe('ZohoBookingsController', () => {
  let controller: ZohoBookingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ZohoBookingsController],
    }).compile();

    controller = module.get<ZohoBookingsController>(ZohoBookingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
