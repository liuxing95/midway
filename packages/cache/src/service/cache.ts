import { Config, Init, Provide, Scope, ScopeEnum } from '@midwayjs/decorator';
import * as cacheManager from 'cache-manager';

// 单例的作用域 也就是说这个服务不会被销毁 一直存在
@Scope(ScopeEnum.Singleton)
@Provide()
export class CacheManager {
  // ts定义
  cache: cacheManager.Cache;

  @Config('cache')
  cacheConfig;

  @Init()
  // 初始化
  async init() {
    this.cache = cacheManager.caching({
      // store: 'memory',
      // 默认的 store 是 memory 所以生成的是一个 内存级别的缓存
      store: this.cacheConfig.store,
      ...this.cacheConfig.options,
    });
  }

  // 获取key
  async get<T>(key: string): Promise<T> {
    return new Promise((resolve, reject) => {
      this.cache.get<T>(key, (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      });
    });
  }

  // 设置cache
  async set<T>(
    key: string,
    value: T,
    options?: cacheManager.CachingConfig
  ): Promise<T> {
    return await this.cache.set(key, value, options);
  }

  // 删除key
  async del(key: string) {
    return await this.cache.del(key);
  }

  // 清空cache
  async reset() {
    return await this.cache.reset();
  }
}
