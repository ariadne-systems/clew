import { Command } from "commander";
import pkg from "../../package.json" with { type: "json" };
import { registerAnchors } from "./commands/anchors.js";
import { registerCheck } from "./commands/check.js";
import { registerConfig } from "./commands/config.js";
import { registerCoverage } from "./commands/coverage.js";
import { registerMint } from "./commands/mint.js";
import { registerPromote } from "./commands/promote.js";
import { registerReconcile } from "./commands/reconcile.js";
import { registerScan } from "./commands/scan.js";
import { registerSetup } from "./commands/setup.js";
import { registerSpec } from "./commands/spec.js";

// The single place where subcommands are registered.
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

  registerReconcile(program);
  registerMint(program);
  registerSetup(program);
  registerSpec(program);
  registerScan(program);
  registerAnchors(program);
  registerCoverage(program);
  registerCheck(program);
  registerConfig(program);
  registerPromote(program);

  return program;
}
