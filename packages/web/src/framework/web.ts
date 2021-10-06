import {
  BaseFramework,
  IMidwayBootstrapOptions,
  IMidwayContainer,
  MidwayConfigService, MidwayEnvironmentService,
  MidwayFrameworkService, MidwayInformationService, MidwayLoggerService,
  MidwayProcessTypeEnum,
  safelyGet,
  WebControllerGenerator,
} from '@midwayjs/core';
import {
  CONFIG_KEY,
  PLUGIN_KEY,
  LOGGER_KEY,
  MidwayFrameworkType,
} from '@midwayjs/decorator';
import { IMidwayWebConfigurationOptions } from '../interface';
import { EggRouter } from '@eggjs/router';
import { Application, Context, EggLogger } from 'egg';
import { loggers } from '@midwayjs/logger';

class EggControllerGenerator extends WebControllerGenerator<EggRouter> {
  constructor(readonly app, readonly applicationContext, readonly logger) {
    super(applicationContext, app.getFrameworkType(), logger);
  }

  createRouter(routerOptions: any): EggRouter {
    const router = new EggRouter(routerOptions, this.app);
    router.prefix(routerOptions.prefix);
    return router;
  }

  generateController(controllerMapping, routeArgsInfo, routerResponseData) {
    return this.generateKoaController(
      controllerMapping,
      routeArgsInfo,
      routerResponseData
    );
  }
}

export class MidwayWebFramework extends BaseFramework<
  Application,
  Context,
  IMidwayWebConfigurationOptions
> {
  public app: Application;
  public configurationOptions: IMidwayWebConfigurationOptions;
  protected loggers: {
    [name: string]: EggLogger;
  };
  applicationContext: IMidwayContainer;
  logger;
  appLogger;
  BaseContextLoggerClass;
  generator;

  constructor() {
    super();
  }

  public configure(
    options: IMidwayWebConfigurationOptions
  ): MidwayWebFramework {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this.configurationOptions = options;
    // set default context logger
    this.BaseContextLoggerClass =
      options.ContextLoggerClass || this.getDefaultContextLoggerClass();
    this.app = options.app;

    this.defineApplicationProperties(
      {
        // generateController: (controllerMapping: string) => {
        //   return this.generateController(controllerMapping);
        // },
        //
        // generateMiddleware: async (middlewareId: string) => {
        //   return this.generateMiddleware(middlewareId);
        // },

        getProcessType: () => {
          if (this.configurationOptions.processType === 'application') {
            return MidwayProcessTypeEnum.APPLICATION;
          }
          if (this.configurationOptions.processType === 'agent') {
            return MidwayProcessTypeEnum.AGENT;
          }

          // TODO 单进程模式下区分进程类型??
          return MidwayProcessTypeEnum.APPLICATION;
        },
      },
      ['createAnonymousContext']
    );

    if (this.app.config.midwayFeature['replaceEggLogger']) {
      // if use midway logger will be use midway custom context logger
      this.app.beforeStart(() => {
        this.app.ContextLogger = self.BaseContextLoggerClass;
      });
    }

    Object.defineProperty(this.app, 'applicationContext', {
      get() {
        return self.applicationContext;
      },
    });

    return this;
  }

  public async initialize(options: IMidwayBootstrapOptions): Promise<void> {
    this.applicationContext = options.applicationContext;
    this.loggerService = await this.applicationContext.getAsync(MidwayLoggerService);
    this.environmentService = await this.applicationContext.getAsync(MidwayEnvironmentService);
    this.configService = await this.applicationContext.getAsync(MidwayConfigService);
    this.informationService = await this.applicationContext.getAsync(MidwayInformationService);
    /**
     * Third party application initialization
     */
    await this.applicationInitialize(options);
  }

  async applicationInitialize(options: Partial<IMidwayBootstrapOptions>) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    process.env.EGG_TYPESCRIPT = 'true';
    if (this.configurationOptions.globalConfig) {
      const configService = this.configService = await this.applicationContext.getAsync(
        MidwayConfigService
      );
      this.configService.addObject(this.configurationOptions.globalConfig);
      Object.defineProperty(this.app, 'config', {
        get() {
          return configService.getConfiguration();
        },
      });
    }

    const frameworkService = await this.applicationContext.getAsync(
      MidwayFrameworkService
    );

    // register plugin
    frameworkService.registerHandler(PLUGIN_KEY, (key, target) => {
      return this.app[key];
    });

    // register config
    frameworkService.registerHandler(CONFIG_KEY, key => {
      return key ? safelyGet(key, this.app.config) : this.app.config;
    });

    // register logger
    frameworkService.registerHandler(LOGGER_KEY, key => {
      return this.getLogger(key);
    });

    this.generator = new EggControllerGenerator(
      this.app,
      this.applicationContext,
      this.appLogger,
    );
  }

  async loadMidwayController() {
    await this.generator.loadMidwayController(newRouter => {
      this.app.use(newRouter.middleware());
    });
  }

  getFrameworkType(): MidwayFrameworkType {
    return MidwayFrameworkType.WEB;
  }

  async run(): Promise<void> {}

  public getLogger(name?: string) {
    if (name) {
      return this.app.loggers[name] || loggers.getLogger(name);
    }
    return this.appLogger;
  }

  protected setContextLoggerClass(BaseContextLogger: any) {
    this.BaseContextLoggerClass = BaseContextLogger;
    this.app.ContextLogger = BaseContextLogger;
  }
}
