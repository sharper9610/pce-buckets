import { ScriptContext } from './types';
import * as ts from 'typescript';
import { runInNewContext } from 'vm';

export interface ExecutionResult {
  success: boolean;
  output?: any;
  logs: string[];
  error?: string;
}

export async function executeScript(
  tsCode: string,
  context: ScriptContext,
  timeoutMs: number = 10000
): Promise<ExecutionResult> {
  const logs: string[] = [];

  const captureLog = (...args: any[]) => {
    logs.push(args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' '));
  };

  try {
    const jsCode = ts.transpileModule(tsCode, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
      },
    }).outputText;

    const moduleObj = { exports: {} };
    const exportsObj = moduleObj.exports;

    const sandboxContext = {
      LIBRARY: context.LIBRARY || {},
      BUCKETS: context.BUCKETS || {},
      console: {
        log: captureLog,
        info: captureLog,
        warn: captureLog,
        error: captureLog,
      },
      Object,
      Array,
      String,
      Number,
      Boolean,
      Math,
      JSON,
      Date,
      RegExp,
      Map,
      Set,
      Promise,
      setTimeout: undefined,
      setInterval: undefined,
      setImmediate: undefined,
      process: undefined,
      require: undefined,
      module: moduleObj,
      exports: exportsObj,
      __dirname: undefined,
      __filename: undefined,
      global: undefined,
      globalThis: undefined,
    };

    const wrappedCode = `
      (function() {
        ${jsCode}

        if (typeof exports.default === 'function') {
          return exports.default({ LIBRARY, BUCKETS });
        } else if (typeof module.exports === 'function') {
          return module.exports({ LIBRARY, BUCKETS });
        } else {
          throw new Error('Script must export a default function');
        }
      })()
    `;

    const result = await Promise.race([
      Promise.resolve(runInNewContext(wrappedCode, sandboxContext, {
        timeout: timeoutMs,
        displayErrors: true,
      })),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Script execution timeout after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);

    if (typeof result !== 'object' || result === null) {
      throw new Error('Script must return an object');
    }

    return {
      success: true,
      output: result,
      logs,
    };
  } catch (error: any) {
    logs.push(`ERROR: ${error.message}`);
    return {
      success: false,
      logs,
      error: error.message || 'Unknown error',
    };
  }
}
