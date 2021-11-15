import { ObjectIdentifier } from '../../interface';
import { saveProviderId } from '../../index';

export function Provide(identifier?: ObjectIdentifier) {
  return function (target: any) {
    // 也就是 @Provide 装饰器最终执行的就行
    // 一般来说 Provide 是放在定义service 的外层 也就是说一般用作类装饰器
    // 那这里的 target  的值 一般就是 class本身
    return saveProviderId(identifier, target);
  };
}
