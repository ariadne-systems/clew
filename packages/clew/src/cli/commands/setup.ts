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
      .option(
        "--agent <harness>",
        "the agent harness to emit the method for (default: claude)",
      )
      .allowExcessArguments(false)
      .action(async (options: { generator?: string; agent?: string }) => {
        const result = await setup({
          generator: options.generator,
          agent: options.agent,
        });
        if (!result.created) {
          const method = `re-emitted the ${result.agent} method (${result.methodWritten.length} files)`;
          let message: string;
          if (result.generator !== null) {
            message = `Configuration already exists at ${result.configFile}; added the ${result.generator} generator to it and ${method}. Left everything else unchanged.`;
          } else if (options.generator) {
            message = `Configuration already exists at ${result.configFile} and already configures a generator, so --generator ${options.generator} was ignored. ${method.charAt(0).toUpperCase()}${method.slice(1)}, left everything else unchanged.`;
          } else {
            message = `Configuration already exists at ${result.configFile}; ${method}, left everything else unchanged.`;
          }
          if (result.methodPreserved.length > 0) {
            message += ` Kept ${result.methodPreserved.length} method file(s) you have edited.`;
          }
          process.stdout.write(`${message}\n`);
          return;
        }
        const dirs = result.directories
          .map((dir) => `      ${dir}/`)
          .join("\n");
        const generatorLine =
          result.generator === null
            ? "  - generators    none selected — re-run `clew setup --generator <type>` (or add one here) to generate traceables"
            : `  - generators    ${result.generator}`;
        const scaffoldNote =
          result.schemas.length > 0 || result.gitignoreUpdated
            ? "Scaffolded the default document schemas with a copyable example of each, and added .gitignore rules for clew's regenerated output (the scan index and coverage report) while keeping .clew/state.json tracked.\n\n"
            : "";
        process.stdout.write(
          `Created ${result.configFile} with a runnable configuration.

Created the layout directories:
${dirs}

${scaffoldNote}You can adjust these in ${result.configFile}:
  - lenses        the spec kinds ids are minted under — ${result.lenses.join(", ")} (rename, add, or remove them)
  - layout        where each kind of artifact lives (the directories above, plus the state file)
${generatorLine}
  - agent         ${result.agent} — its method (governance + skills) was emitted, and the project stubs + ADR template seeded
  - waivers       a default STK-* waiver (stakeholder needs are verified by acceptance, not a test)

Next steps:
  1. Review the lenses in ${result.configFile} — they are your spec kinds, fixed once ids exist under them.
  2. Read the governance your ${result.agent} method was given — the charter, and the architecture, coding, testing, and spec conventions — and adjust it to your project. It is the contract your agent works under, so shape it before it starts.
  3. Put any existing documentation (architecture, tech notes, ADRs, diagrams) into a setup/ directory, then run the clew-setup skill: it reads setup/, establishes your stack (004) and architecture with you and — where the workspace still needs standing up — drafts a setup story. The skill tells you what to do next from there.

The skills allocate ids as they draft and promote — you never mint by hand.
`,
        );
      });
  },
);
