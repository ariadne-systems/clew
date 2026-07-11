import { realizes, SwTraceables } from "@ariadne-thread/trace";
import type { Command } from "commander";
import { setup } from "../../index.js";

/** Registers the `clew setup` command surface. An existing configuration is left untouched. */
export const registerSetup: (program: Command) => void = realizes(
  SwTraceables.SW_010_SETUP_COMMAND,
  (program: Command): void => {
    program
      .command("setup")
      .description("Scaffold a runnable configuration and layout.")
      .option(
        "--generator <type>",
        "the target generator to configure (for example typescript, java)",
      )
      .allowExcessArguments(false)
      .action(async (options: { generator?: string }) => {
        const result = await setup({ generator: options.generator });
        if (!result.created) {
          process.stdout.write(
            `Configuration already exists at ${result.configFile}; nothing changed.\n`,
          );
          return;
        }
        const dirs = result.directories
          .map((dir) => `      ${dir}/`)
          .join("\n");
        const generatorLine =
          result.generator === null
            ? "  - generators    none selected — add one, or re-run with --generator, to generate traceables"
            : `  - generators    ${result.generator}`;
        const scaffoldNote =
          result.schemas.length > 0 || result.gitignoreUpdated
            ? "Scaffolded the default document schemas and ignored the tool's regenerated output.\n\n"
            : "";
        process.stdout.write(
          `Created ${result.configFile} with a runnable configuration.

Created the layout directories:
${dirs}

${scaffoldNote}You can adjust these in ${result.configFile}:
  - lenses        the spec kinds you mint — ${result.lenses.join(", ")} (rename, add, or remove them)
  - layout        where each kind of artifact lives (the directories above, plus the state file)
${generatorLine}
  - waivers       a default STK-* waiver (stakeholder needs are verified by acceptance, not a test)

Next steps:
  1. Edit ${result.configFile} to fit your project — at least review the lenses.
  2. Run \`clew mint <LENS>\` to allocate your first id (for example \`clew mint SW\`).
  3. Commit ${result.configFile} and .clew/state.json so the team shares them.
`,
        );
      });
  },
);
