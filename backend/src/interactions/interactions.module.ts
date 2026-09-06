import { Module } from '@nestjs/common';
import { InteractionsController } from './interactions.controller';

@Module({
  controllers: [InteractionsController],
})
export class InteractionsModule {}
