#!/usr/bin/env node
import { buildProgram } from "./program.js";
import { formatError } from "./report-error.js";

buildProgram()
  .parseAsync(process.argv)
  .catch((error: unknown) => {
    process.stderr.write(`${formatError(error)}\n`);
    process.exitCode = 1;
  });
