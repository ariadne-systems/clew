import { Command } from "commander";
import pkg from "../package.json" with { type: "json" };
import { registerConfig } from "./commands/config.js";
import { registerCoverage } from "./commands/coverage.js";
import { registerInit } from "./commands/init.js";
import { registerMint } from "./commands/mint.js";
import { registerPromote } from "./commands/promote.js";
import { registerScan } from "./commands/scan.js";
import { registerSetup } from "./commands/setup.js";
import { registerSpec } from "./commands/spec.js";

// Builds the root `clew` command. This is the single place where
// subcommands are registered as they are added (STR-003+).
export function buildProgram(): Command {
  const program = new Command();

  program
    .name("clew")
    .description(
      "Compile-checked, id-anchored traceability for specs and code.",
    )
    .version(pkg.version)
    .showHelpAfterError()
    .action(() => {
      // No subcommand given: print help to stdout and exit 0.
      program.outputHelp();
    });

  registerInit(program);
  registerMint(program);
  registerSetup(program);
  registerSpec(program);
  registerScan(program);
  registerCoverage(program);
  registerConfig(program);
  registerPromote(program);

  return program;
}
