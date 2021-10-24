import { format } from 'winston';
import { IMidwayLogger } from './interface';
import { ORIGIN_ARGS, ORIGIN_ERROR } from './constant';

// ● 1、对数组，Set，Map 的输出处理
// ● 2、Error 的堆栈拼装，以及增加原始的 error 对象
// ● 3、增加 pid
// ● 4、增加大写的 level
export const displayCommonMessage = format(
  (
    info,
    opts: {
      defaultLabel?: string;
      // 默认输出的元信息，对象 key/value 结构
      defaultMeta?: Record<string, unknown>;
      target?: IMidwayLogger;
    }
  ) => {
    if (!info.pid) {
      info.pid = process.pid;
    }

    if (info[ORIGIN_ERROR as any]) {
      info.originError = info[ORIGIN_ERROR as any];
    }

    if (info[ORIGIN_ARGS as any]) {
      info.originArgs = info[ORIGIN_ARGS as any];
    }

    if (!info.ignoreFormat) {
      info.ignoreFormat = false;
    }

    if (!info.ctx) {
      info.ctx = null;
    }

    if (!info.LEVEL) {
      info.LEVEL = info.level.toUpperCase();
    }

    if (!info.defaultLabel) {
      info.defaultLabel =
        opts.defaultLabel || opts.target?.getDefaultLabel() || '';
    }

    return Object.assign(
      info,
      opts.defaultMeta || opts.target?.getDefaultMeta() || {}
    );
  }
);

function joinLoggerLabel(labelSplit, ...labels) {
  if (labels.length === 0) {
    return '';
  } else {
    const newLabels = labels.filter(label => {
      return !!label;
    });
    if (newLabels.length === 0) {
      return '';
    } else {
      return `[${newLabels.join(labelSplit)}] `;
    }
  }
}

export const displayLabels = format((info, opts) => {
  opts.labelSplit = opts.labelSplit || ':';
  info.labelText = joinLoggerLabel(
    opts.labelSplit,
    info.defaultLabel,
    ...[].concat(info.label)
  );
  return info;
});
