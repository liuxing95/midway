import { ObjectIdentifier } from '../../interface';
import { savePropertyInject } from '../../index';

export function Inject(identifier?: ObjectIdentifier) {
  // @Inject 装饰器入口 这个一般是 属性装饰器
  return function (target: any, targetKey: string): void {
    savePropertyInject({ target, targetKey, identifier });
  };
}
