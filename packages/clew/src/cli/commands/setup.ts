import { realizes, SwTraceables } from "@ariadne-thread/trace";
import type { Command } from "commander";
import { setup } from "../../index.js";

/**
 * Registers the `clew setup` command surface.
 * The action stays thin: it delegates scaffolding to core's `setup()`
 * and reports what it wrote. An existing configuration is left untouched.
 * Any error propagates to the bin entry, which writes it to stderr
 * and exits non-zero.
 */
export const registerSetup: (program: Command) => void = realizes(
  SwTraceables.SW_010_SETUP_COMMAND,
  (program: Command): void => {
    program
      .command("setup")
      .description("Scaffold the default configuration and layout.")
      .allowExcessArguments(false)
      .action(async () => {
        const result = await setup();
        if (!result.created) {
          process.stdout.write(
            `Configuration already exists at ${result.configFile}; nothing changed.\n`,
          );
          return;
        }
        const dirs = result.directories
          .map((dir) => `      ${dir}/`)
          .join("\n");
        process.stdout.write(
          `Created ${result.configFile} with the default configuration.

Created the layout directories:
${dirs}

You can adjust these in ${result.configFile}:
  - lenses        the spec kinds you mint — ${result.lenses.join(", ")} (rename, add, or remove them)
  - layout        where each kind of artifact lives (the directories above, plus the state file)
  - idGeneration  the id scheme (sequential) and the number padding

Next steps:
  1. Edit ${result.configFile} to fit your project — at least review the lenses.
  2. Run \`clew mint <LENS>\` to allocate your first id (for example \`clew mint SW\`).
  3. Commit ${result.configFile} and .clew/state.json so the team shares them.
`,
        );
      });
  },
);
