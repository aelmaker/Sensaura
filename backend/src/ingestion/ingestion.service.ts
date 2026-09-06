import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import mqtt, { MqttClient } from 'mqtt';
import { TelemetryService } from '../telemetry/telemetry.service';

@Injectable()
export class IngestionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IngestionService.name);
  private client: MqttClient | null = null;

  constructor(private readonly telemetryService: TelemetryService) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const brokerUrl = process.env.MQTT_URL ?? 'mqtt://mosquitto:1883';
    const topic = process.env.MQTT_TOPIC ?? 'sensaura/telemetry/#';

    this.client = mqtt.connect(brokerUrl);

    this.client.on('connect', () => {
      this.client?.subscribe(topic, (error) => {
        if (error) {
          this.logger.error(`MQTT subscribe failed: ${error.message}`);
          return;
        }
        this.logger.log(`MQTT subscribed to ${topic}`);
      });
    });

    this.client.on('message', (messageTopic, message) => {
      const ingested = this.telemetryService.ingestFromMqtt(
        messageTopic,
        message.toString(),
      );

      if (!ingested) {
        this.logger.warn(`Invalid telemetry payload on topic ${messageTopic}`);
      }
    });

    this.client.on('error', (error) => {
      this.logger.error(`MQTT connection error: ${error.message}`);
    });
  }

  onModuleDestroy(): void {
    this.client?.end(true);
    this.client = null;
  }
}
