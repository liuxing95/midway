import { createLogger, transports, Logger, format } from 'winston';
import { DailyRotateFileTransport } from './rotate';
import {
  DelegateLoggerOptions,
  LoggerLevel,
  LoggerOptions,
  IMidwayLogger,
  MidwayTransformableInfo,
  LoggerCustomInfoHandler,
} from './interface';
import { DelegateTransport, EmptyTransport } from './transport';
import { displayLabels, displayCommonMessage } from './format';
import * as os from 'os';
import { basename, dirname, isAbsolute } from 'path';
import * as util from 'util';
import { ORIGIN_ARGS, ORIGIN_ERROR } from './constant';

const isWindows = os.platform() === 'win32';

export function isPlainObject(value) {
  if (Object.prototype.toString.call(value) !== '[object Object]') {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

type NewLogger = Omit<
  Logger,
  | 'log'
  | 'add'
  | 'close'
  | 'remove'
  | 'write'
  | 'info'
  | 'warn'
  | 'debug'
  | 'error'
  | 'verbose'
  | 'silly'
>;

export const EmptyLogger = createLogger().constructor as unknown as {
  new (options?: LoggerOptions): IMidwayLogger &
    NewLogger & {
      log(...args): any;
    };
} & NewLogger;

const midwayLogLevels = {
  none: 0,
  error: 1,
  warn: 2,
  info: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
  all: 7,
};

/**
 *  base logger with console transport and file transport
 */
export class MidwayBaseLogger extends EmptyLogger implements IMidwayLogger {
  consoleTransport;
  fileTransport;
  errTransport;
  loggerOptions: LoggerOptions;
  defaultLabel = '';
  defaultMetadata = {};
  customInfoHandler: LoggerCustomInfoHandler = info => {
    return info;
  };

  constructor(options: LoggerOptions = {}) {
    super(
      Object.assign(options, {
        levels: midwayLogLevels,
      })
    );
    this.exitOnError = false;
    if (isWindows) {
      options.disableErrorSymlink = true;
      options.disableFileSymlink = true;
    }
    this.loggerOptions = options;
    // 输出的默认标签，[] 中的值
    if (this.loggerOptions.defaultLabel) {
      this.defaultLabel = this.loggerOptions.defaultLabel;
    }

    // 默认输出的元信息，对象 key/value 结构
    if (this.loggerOptions.defaultMeta) {
      this.defaultMetadata = this.loggerOptions.defaultMeta;
    }

    // TODO: 这个是不是没必要存在？
    if (this.loggerOptions.format) {
      this.configure({
        format: this.loggerOptions.format,
      });
    } else {
      this.configure(this.getDefaultLoggerConfigure());
    }

    this.configure(
      Object.assign({}, this.getDefaultLoggerConfigure(), {
        format: this.loggerOptions.format,
      })
    );

    //  transports 功能有winston 提供
    this.consoleTransport = new transports.Console({
      level: options.consoleLevel || options.level || 'silly',
      format: format.combine(
        process.env.MIDWAY_LOGGER_DISABLE_COLORS !== 'true'
          ? format.colorize({
              all: true,
              colors: {
                none: 'reset',
                error: 'red',
                warn: 'yellow',
                info: 'reset',
                verbose: 'reset',
                debug: 'blue',
                silly: 'reset',
                all: 'reset',
              },
            })
          : format(i => i)()
      ),
    });

    // 是否禁止终端输出
    if (options.disableConsole !== true) {
      this.enableConsole();
    }

    // 配置 文件地址
    options.dir = options.dir || process.cwd();
    // 配置 打印文件名
    // 框架，组件层面的日志，我们叫他 coreLogger
    options.fileLogName = options.fileLogName || 'midway-core.log';
    // 判断 fileLogName 是不是 绝对路径
    if (isAbsolute(options.fileLogName)) {
      options.dir = dirname(options.fileLogName);
      options.fileLogName = basename(options.fileLogName);
    }
    // 错误日志
    options.errorLogName = options.errorLogName || 'common-error.log';
    if (isAbsolute(options.errorLogName)) {
      options.errorDir = dirname(options.errorLogName);
      options.errorLogName = basename(options.errorLogName);
    }

    // 是否 禁止文本日志输出
    if (options.disableFile !== true) {
      this.enableFile();
    }

    // 是否 禁止错误日志输出
    if (options.disableError !== true) {
      this.enableError();
    }
    // TODO: winston 提供的 add方法
    this.add(new EmptyTransport());
  }

  // 所有格式日志打印的基础函数
  // level 报错等级
  // args 格式为 TODO:[]
  log(level, ...args) {
    const originArgs = [...args];
    let meta, msg;
    if (args.length > 1 && isPlainObject(args[args.length - 1])) {
      meta = args.pop();
    } else {
      meta = {};
    }

    const last = args.pop();
    // 错误格式的兼容
    if (last instanceof Error) {
      msg = util.format(...args, last);
      meta[ORIGIN_ERROR] = last;
    } else {
      msg = util.format(...args, last);
    }

    meta[ORIGIN_ARGS] = originArgs;
    // winston 提供的 log方法
    return super.log(level, msg, meta);
  }

  disableConsole(): void {
    this.remove(this.consoleTransport);
  }

  enableConsole(): void {
    this.add(this.consoleTransport);
  }

  disableFile(): void {
    this.remove(this.fileTransport);
  }

  enableFile(): void {
    if (!this.fileTransport) {
      this.fileTransport = new DailyRotateFileTransport({
        dirname: this.loggerOptions.dir,
        filename: this.loggerOptions.fileLogName,
        datePattern: this.loggerOptions.fileDatePattern || 'YYYY-MM-DD',
        level:
          this.loggerOptions.fileLevel || this.loggerOptions.level || 'silly',
        createSymlink: this.loggerOptions.disableFileSymlink !== true,
        symlinkName: this.loggerOptions.fileLogName,
        maxSize: this.loggerOptions.fileMaxSize || '200m',
        maxFiles: this.loggerOptions.fileMaxFiles || '31d',
        eol: this.loggerOptions.eol || os.EOL,
        zippedArchive: this.loggerOptions.fileZippedArchive,
      });
    }
    this.add(this.fileTransport);
  }

  disableError(): void {
    this.remove(this.errTransport);
  }

  enableError(): void {
    if (!this.errTransport) {
      this.errTransport = new DailyRotateFileTransport({
        dirname: this.loggerOptions.errorDir || this.loggerOptions.dir,
        filename: this.loggerOptions.errorLogName,
        datePattern: this.loggerOptions.errDatePattern || 'YYYY-MM-DD',
        level: 'error',
        createSymlink: this.loggerOptions.disableErrorSymlink !== true,
        symlinkName: this.loggerOptions.errorLogName,
        maxSize: this.loggerOptions.errMaxSize || '200m',
        maxFiles: this.loggerOptions.errMaxFiles || '31d',
        eol: this.loggerOptions.eol || os.EOL,
        zippedArchive: this.loggerOptions.errZippedArchive,
      });
    }
    this.add(this.errTransport);
  }

  isEnableFile(): boolean {
    return !!this.fileTransport;
  }

  isEnableConsole(): boolean {
    return !!this.consoleTransport;
  }

  isEnableError(): boolean {
    return !!this.errTransport;
  }

  getConsoleLevel(): LoggerLevel {
    return this.consoleTransport.level;
  }

  getFileLevel(): LoggerLevel {
    return this.fileTransport.level;
  }

  updateLevel(level: LoggerLevel): void {
    this.level = level;
    this.consoleTransport.level = level;
    this.fileTransport.level = level;
  }

  updateFileLevel(level: LoggerLevel): void {
    this.fileTransport.level = level;
  }

  updateConsoleLevel(level: LoggerLevel): void {
    this.consoleTransport.level = level;
  }

  updateDefaultLabel(defaultLabel: string): void {
    this.defaultLabel = defaultLabel;
  }

  updateDefaultMeta(defaultMetadata: Record<string, unknown>): void {
    this.defaultMetadata = defaultMetadata;
  }

  updateTransformableInfo(customInfoHandler: LoggerCustomInfoHandler): void {
    this.customInfoHandler = customInfoHandler;
  }

  // 获取默认日志配置
  getDefaultLoggerConfigure() {
    const printInfo = this.loggerOptions.printFormat
      ? this.loggerOptions.printFormat
      : (info: MidwayTransformableInfo): string => {
          return `${info.timestamp} ${info.LEVEL} ${info.pid} ${info.labelText}${info.message}`;
        };

    return {
      format: format.combine(
        displayCommonMessage({
          target: this,
        }),
        displayLabels(),
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss,SSS',
        }),
        format.splat(),
        format.printf(info => {
          if (info.ignoreFormat) {
            return info.message;
          }
          const newInfo = this.customInfoHandler(
            info as MidwayTransformableInfo
          );
          return printInfo(newInfo || info);
        })
      ),
    };
  }

  getDefaultLabel(): string {
    return this.defaultLabel;
  }

  getDefaultMeta(): Record<string, unknown> {
    return this.defaultMetadata;
  }

  write(...args): any {
    if (
      (args.length === 1 && typeof args[0] !== 'object') ||
      !args[0]['level']
    ) {
      // 这里必须要用 none
      return super.log.apply(this, ['none', ...args, { ignoreFormat: true }]);
    } else {
      return super.write.apply(this, args);
    }
  }

  add(transport): any {
    return super.add(transport);
  }

  remove(transport: any): any {
    return super.remove(transport);
  }

  close(): any {
    return super.close();
  }

  // 以下是各种格式的打印
  debug(...args) {
    this.log('debug', ...args);
  }
  info(...args) {
    this.log('info', ...args);
  }
  warn(...args) {
    this.log('warn', ...args);
  }
  error(...args) {
    this.log('error', ...args);
  }
  verbose(...args) {
    this.log('verbose', ...args);
  }
  silly(...args) {
    this.log('silly', ...args);
  }
}

/**
 * framework delegate logger, it can proxy logger output to another logger
 */
export class MidwayDelegateLogger extends MidwayBaseLogger {
  constructor(options: DelegateLoggerOptions) {
    super({
      disableConsole: true,
      disableFile: true,
      disableError: true,
    });
    this.add(
      new DelegateTransport({
        delegateLogger: options.delegateLogger,
      })
    );
  }
}
