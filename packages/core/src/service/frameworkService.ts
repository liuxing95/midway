import {
  Provide,
  Scope,
  ScopeEnum,
  Init,
  CONFIG_KEY,
  ALL,
  LOGGER_KEY,
  Inject,
  listModule,
  FRAMEWORK_KEY,
  MidwayFrameworkType,
  APPLICATION_KEY,
  listPreloadModule,
} from '@midwayjs/decorator';
import {
  HandlerFunction,
  IMidwayApplication,
  IMidwayBootstrapOptions,
  IMidwayContainer,
  IMidwayFramework,
} from '../interface';
import { MidwayConfigService } from './configService';
import { MidwayLoggerService } from './loggerService';
import { BaseFramework } from '../baseFramework';

@Provide()
@Scope(ScopeEnum.Singleton)
export class MidwayFrameworkService {
  @Inject()
  configService: MidwayConfigService;

  @Inject()
  loggerService: MidwayLoggerService;

  handlerMap = new Map<string, HandlerFunction>();

  constructor(
    readonly applicationContext: IMidwayContainer,
    readonly globalOptions
  ) {}

  private mainFramework: IMidwayFramework<any, any>;
  private mainApp: IMidwayApplication;

  private globalAppMap = new Map<
    MidwayFrameworkType,
    IMidwayApplication<any>
  >();

  private globalFrameworkMap = new Map<
    MidwayFrameworkType,
    IMidwayFramework<any, any>
  >();

  @Init()
  async init() {
    let frameworks = listModule(FRAMEWORK_KEY);
    // filter proto
    frameworks = filterProtoFramework(frameworks);

    if (frameworks.length) {
      // init framework and app
      const frameworkInstances: IMidwayFramework<any, any>[] =
        await initializeFramework(
          this.applicationContext,
          this.globalOptions,
          frameworks
        );

      for (const frameworkInstance of frameworkInstances) {
        // app init
        this.globalAppMap.set(
          frameworkInstance.getFrameworkType(),
          frameworkInstance.getApplication()
        );
        this.globalFrameworkMap.set(
          frameworkInstance.getFrameworkType(),
          frameworkInstance
        );
      }

      global['MIDWAY_MAIN_FRAMEWORK'] = this.mainFramework =
        frameworkInstances[0];
      this.mainApp = this.mainFramework.getApplication();

      // register @App decorator handler
      this.registerHandler(APPLICATION_KEY, (propertyName, mete) => {
        if (mete.type) {
          return this.globalAppMap.get(mete.type as any);
        } else {
          return this.mainApp;
        }
      });
    }

    // register base config hook
    this.registerHandler(CONFIG_KEY, (propertyName, meta) => {
      if (meta.identifier === ALL) {
        return this.configService.getConfiguration();
      } else {
        return this.configService.getConfiguration(
          meta.identifier ?? propertyName
        );
      }
    });

    // register @Logger decorator handler
    this.registerHandler(LOGGER_KEY, (propertyName, meta) => {
      return this.loggerService.getLogger(meta.identifier ?? propertyName);
    });

    this.applicationContext.onObjectCreated((instance, options) => {
      if (
        this.handlerMap.size > 0 &&
        Array.isArray(options.definition.handlerProps)
      ) {
        // 已经预先在 bind 时处理
        for (const item of options.definition.handlerProps) {
          this.defineGetterPropertyValue(
            item,
            instance,
            this.getHandler(item.key)
          );
        }
      }
    });

    // some preload module init
    const modules = listPreloadModule();
    for (const module of modules) {
      // preload init context
      await this.applicationContext.getAsync(module);
    }
  }

  /**
   * binding getter method for decorator
   *
   * @param prop
   * @param instance
   * @param getterHandler
   */
  private defineGetterPropertyValue(prop, instance, getterHandler) {
    if (prop && getterHandler) {
      if (prop.propertyName) {
        Object.defineProperty(instance, prop.propertyName, {
          get: () =>
            getterHandler(prop.propertyName, prop.metadata ?? {}, instance),
          configurable: true, // 继承对象有可能会有相同属性，这里需要配置成 true
          enumerable: true,
        });
      }
    }
  }

  private getHandler(key: string) {
    if (this.handlerMap.has(key)) {
      return this.handlerMap.get(key);
    }
  }

  public getMainApp() {
    return this.mainApp;
  }

  public getMainFramework() {
    return this.mainFramework;
  }

  public registerHandler(key: string, fn: HandlerFunction) {
    this.handlerMap.set(key, fn);
  }

  public getFramework(type: MidwayFrameworkType) {
    return this.globalFrameworkMap.get(type);
  }
}

async function initializeFramework(
  applicationContext: IMidwayContainer,
  globalOptions: IMidwayBootstrapOptions,
  frameworks: any[]
): Promise<IMidwayFramework<any, any>[]> {
  return Promise.all(
    frameworks.map(framework => {
      // bind first
      applicationContext.bindClass(framework);
      return (async () => {
        const frameworkInstance = (await applicationContext.getAsync(
          framework
        )) as IMidwayFramework<any, any>;
        // app init
        await frameworkInstance.initialize({
          applicationContext,
          ...globalOptions,
        });
        return frameworkInstance;
      })();
    })
  );
}

function filterProtoFramework(frameworks) {
  const frameworkProtoArr = [];
  // 这里把继承的框架父类都找出来，然后排除掉，只取第一层
  for (const framework of frameworks) {
    let proto = Object.getPrototypeOf(framework);
    while (proto.name && proto.name !== BaseFramework.name) {
      frameworkProtoArr.push(proto);
      proto = Object.getPrototypeOf(proto);
    }
  }
  return frameworks.filter(framework => {
    return !frameworkProtoArr.includes(framework);
  });
}