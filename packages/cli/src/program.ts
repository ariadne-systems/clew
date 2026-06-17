import { Command } from "commander";
import pkg from "../package.json" with { type: "json" };
import { registerInit } from "./commands/init.js";
import { registerMint } from "./commands/mint.js";

// Builds the root `ariadne` command. This is the single place where
// subcommands are registered as they are added (STR-003+).
export function buildProgram(): Command {
  const program = new Command();

  program
    .name("ariadne")
    .description(
      "Compile-checked, id-anchored traceability for specs and code.",
    )
    .version(pkg.version)
    .showHelpAfterError()
    .action(() => {
      // No subcommand given: print help to stdout and exit 0.
      program.outputHelp();
    });

  registerMint(program);
  registerInit(program);

  return program;
}
