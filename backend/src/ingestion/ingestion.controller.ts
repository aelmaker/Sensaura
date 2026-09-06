import { Controller, Get } from '@nestjs/common';
import { Roles } from '../common/roles.decorator';

@Controller('ingestion')
export class IngestionController {
  @Get('status')
  @Roles('admin', 'operator')
  status() {
    return {
      status: 'ok',
      mqttUrl: process.env.MQTT_URL ?? 'mqtt://mosquitto:1883',
      topic: process.env.MQTT_TOPIC ?? 'sensaura/telemetry/#',
    };
  }
}
