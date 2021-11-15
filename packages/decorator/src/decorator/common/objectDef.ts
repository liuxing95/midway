import { ScopeEnum, saveObjectDefinition } from '../../index';

export function Init(): MethodDecorator {
  return function (target: any, propertyKey: string) {
    saveObjectDefinition(target, { initMethod: propertyKey });
  };
}

export function Destroy(): MethodDecorator {
  return function (target: any, propertyKey: string) {
    saveObjectDefinition(target, {
      destroyMethod: propertyKey,
    });
  };
}

// Scope 默认改成了单例模式
export function Scope(scope: ScopeEnum = ScopeEnum.Singleton): ClassDecorator {
  return function (target: any): void {
    saveObjectDefinition(target, { scope });
  };
}
