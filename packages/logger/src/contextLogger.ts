import { ILogger } from './interface';

// 首先，你需要定义一个文件，继承默认的 MidwayContextLogger 类，实现 formatContextLabel 来返回 label 内容。比如 HTTP 下：
export class MidwayContextLogger<T> {
  protected contextLogger: ILogger;
  public ctx: T;

  constructor(ctx, contextLogger: ILogger) {
    this.ctx = ctx;
    this.contextLogger = contextLogger;
  }

  log(...args) {
    if (!['debug', 'info', 'warn', 'error'].includes(args[0])) {
      args.unshift('info');
    }
    this.transformLog('log', args);
  }

  debug(...args) {
    this.transformLog('debug', args);
  }

  info(...args) {
    this.transformLog('info', args);
  }

  warn(...args) {
    this.transformLog('warn', args);
  }

  error(...args) {
    this.transformLog('error', args);
  }

  private transformLog(level, args) {
    return this.contextLogger[level].apply(this.contextLogger, [
      ...args,
      {
        label: this.formatContextLabel(),
        ctx: this.ctx,
      },
    ]);
  }

  formatContextLabel() {
    return '';
  }
}
