import { Configuration, Inject } from '@midwayjs/decorator';
import { MidwayRabbitMQFramework } from './framework';

@Configuration({
  namespace: 'rabbitMQ',
  importConfigs: [
    {
      default: {
        rabbitMQServer: {},
      },
    },
  ],
})
export class RabbitMQConfiguration {
  @Inject()
  framework: MidwayRabbitMQFramework;

  async onReady() {}

  async onServerReady() {
    if (this.framework.isEnable()) {
      await this.framework.run();
    }
  }
}
