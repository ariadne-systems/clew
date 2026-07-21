#!/usr/bin/env node
import { realizes, SwTraceables } from "@ariadne-thread/trace";
import { buildProgram } from "./program.js";
import { formatError } from "./report-error.js";

const reportFailure = realizes(
  SwTraceables.SW_004_ERROR_REPORTING,
  (error: unknown): void => {
    process.stderr.write(`${formatError(error)}\n`);
    process.exitCode = 1;
  },
);

buildProgram().parseAsync(process.argv).catch(reportFailure);
