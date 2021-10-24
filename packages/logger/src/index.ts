// logger 模块入口文件 基于 winston 日志
import { ILogger, LoggerOptions } from './interface';
import { MidwayLoggerContainer } from './container';

export { format, transports } from 'winston';
// displayCommonMessage 用于对常用输入的规则化处理，做了以下一些事情
// 按照一定的分隔符聚合标签（labels），它的 options 如下：
export { displayCommonMessage, displayLabels } from './format';
export * from './interface';
export * from './transport';
export { EmptyLogger, MidwayBaseLogger, MidwayDelegateLogger } from './logger';
export { MidwayContextLogger } from './contextLogger';
export { MidwayLoggerContainer } from './container';
// 所有日志都是 基于 MidwayLoggerContainer 
export const loggers = new MidwayLoggerContainer();
// 到处一个 createLogger 可以由外部创建自定义日志
export const createLogger = <T extends ILogger>(
  name: string,
  options: LoggerOptions = {}
): T => {
  return loggers.createLogger(name, options) as T;
};

// 创建console 级别的自定义日志 这个日志单独配置了 不支持error
// 一个只有控制台输出的日志，并添加到默认的日志容器中
export const createConsoleLogger = (
  name: string,
  options: LoggerOptions = {}
): ILogger => {
  return loggers.createLogger(
    name,
    Object.assign(options, {
      disableError: true,
      disableFile: true,
    })
  );
};

// 创建文件级别的日志 总体还是依赖于 createLogger 方法
// 文本日志，并添加到默认的日志容器中
export const createFileLogger = (
  name: string,
  options: LoggerOptions = {}
): ILogger => {
  return loggers.createLogger(
    name,
    Object.assign(options, {
      disableConsole: true,
      disableError: true,
    })
  );
};

export const clearAllLoggers = (): void => {
  loggers.reset();
};
