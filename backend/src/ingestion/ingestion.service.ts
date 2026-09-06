import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import mqtt, { type IClientOptions, type MqttClient } from 'mqtt';
import { TelemetryService } from '../telemetry/telemetry.service';

interface QueueItem {
  topic: string;
  payload: string;
  attempt: number;
}

@Injectable()
export class IngestionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IngestionService.name);
  private client: MqttClient | null = null;
  private readonly queue: QueueItem[] = [];
  private processing = false;
  private connected = false;
  private processedCount = 0;
  private failedCount = 0;

  constructor(private readonly telemetryService: TelemetryService) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const brokerUrl = process.env.MQTT_URL ?? 'mqtt://mosquitto:1883';
    const topic = process.env.MQTT_TOPIC ?? 'sensaura/telemetry/#';

    const options: IClientOptions = {
      reconnectPeriod: 2_000,
      connectTimeout: 10_000,
      clean: false,
    };

    this.client = mqtt.connect(brokerUrl, options);

    this.client.on('connect', () => {
      this.connected = true;
      this.client?.subscribe(topic, { qos: 1 }, (error) => {
        if (error) {
          this.logger.error(`MQTT subscribe failed: ${error.message}`);
          return;
        }
        this.logger.log(`MQTT subscribed to ${topic}`);
      });
    });

    this.client.on('close', () => {
      this.connected = false;
    });

    this.client.on('message', (messageTopic, message) => {
      this.queue.push({
        topic: messageTopic,
        payload: message.toString(),
        attempt: 0,
      });
      void this.processQueue();
    });

    this.client.on('error', (error) => {
      this.logger.error(`MQTT connection error: ${error.message}`);
    });
  }

  onModuleDestroy(): void {
    this.client?.end(true);
    this.client = null;
    this.connected = false;
  }

  getStatus() {
    return {
      mqttConnected: this.connected,
      queueLength: this.queue.length,
      processedCount: this.processedCount,
      failedCount: this.failedCount,
    };
  }

  private async processQueue(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) {
        break;
      }

      try {
        const ingested = await this.telemetryService.ingestFromMqtt(
          item.topic,
          item.payload,
        );
        if (!ingested) {
          throw new Error('invalid telemetry payload');
        }

        this.processedCount += 1;
      } catch (error) {
        if (item.attempt < 3) {
          this.queue.push({ ...item, attempt: item.attempt + 1 });
          await new Promise((resolve) =>
            setTimeout(resolve, 100 * (item.attempt + 1)),
          );
        } else {
          this.failedCount += 1;
          this.logger.warn(
            `Ingestion failed after retries for topic ${item.topic}: ${(error as Error).message}`,
          );
        }
      }
    }

    this.processing = false;
  }
}
