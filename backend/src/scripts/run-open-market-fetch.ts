import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { MonitorsModule } from '../monitors/monitors.module';
import { MonitorScheduler } from '../monitors/monitor.scheduler';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  try {
    const result = await app.select(MonitorsModule).get(MonitorScheduler).runMonitorsOnce();
    console.log(`FETCH_DONE ${JSON.stringify(result)}`);
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
