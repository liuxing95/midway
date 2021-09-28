import { join } from 'path';
import {
  BaseFramework, IMidwayApplication,
  IMidwayBootstrapOptions,
  initializeGlobalApplicationContext,
  MidwayConfigService,
  MidwayFrameworkType
} from '../src';
import { Configuration, Framework, Inject, Provide } from '@midwayjs/decorator';

describe('/test/setup.test.ts', () => {
  it('should test setup and config', async () => {

    const container = await initializeGlobalApplicationContext({
      baseDir: join(
        __dirname,
        './fixtures/base-app-config/src'
      )
    });

    const configService = await container.getAsync(MidwayConfigService);
    expect(configService.getConfiguration()).toEqual({
      "hello": {
        "a": 1,
        "b": 4,
        "c": 3,
        "d": [
          1,
          2,
          3
        ]
      },
      "keys": "key",
      "plugins": {
        "bucLogin": false
      }
    });
  });

  it('should test setup a framework and get from container', async () => {
    /**
     * 一个全量的空框架
     */
    @Provide()
    @Framework()
    class EmptyFramework extends BaseFramework<any, any, any> {
      getFrameworkType(): MidwayFrameworkType {
        return MidwayFrameworkType.EMPTY;
      }

      async run(): Promise<void> {}

      async applicationInitialize(options: IMidwayBootstrapOptions) {
        this.app = {} as IMidwayApplication;
        this.defineApplicationProperties();
      }
    }

    @Configuration()
    class EmptyConfiguration {

      @Inject()
      customFramework: EmptyFramework;

      async onServerReady() {
        await this.customFramework.run();
      }
    }

    const baseDir = join(
      __dirname,
      './fixtures/base-app-config/src'
    );
    const container = await initializeGlobalApplicationContext({
      baseDir,
      configurationModule: [require(join(baseDir, 'configuration')), EmptyConfiguration]
    });

    const configService = await container.getAsync(MidwayConfigService);
    expect(configService.getConfiguration()).toEqual({
      "hello": {
        "a": 1,
        "b": 4,
        "c": 3,
        "d": [
          1,
          2,
          3
        ]
      },
      "keys": "key",
      "plugins": {
        "bucLogin": false
      }
    });

    // test applicationContext set
    const framework = await container.getAsync(EmptyFramework);
    const app = framework.getApplication();
    expect(app.getApplicationContext()).toEqual(container);
  });
});