import { ConTraceables, realizes, SwTraceables } from "@ariadne-thread/trace";
import type { Command } from "commander";
import type { ResolvedConfiguration } from "../../index.js";
import { requireConfig, resolveConfiguration } from "../../index.js";

/** Registers the `clew config` command surface. Human-readable by default, or JSON with `--json`. */
export const registerConfig: (program: Command) => void = realizes(
  [SwTraceables.SW_020_CONFIG_COMMAND, ConTraceables.CON_015_CONFIG_READ_ONLY],
  (program: Command): void => {
    program
      .command("config")
      .description("Print the project's resolved configuration.")
      .option("--json", "emit the resolved configuration as JSON")
      .allowExcessArguments(false)
      .action(async (options: { json?: boolean }) => {
        await requireConfig();
        const resolved = await resolveConfiguration();
        if (options.json === true) {
          process.stdout.write(`${JSON.stringify(resolved, null, 2)}\n`);
          return;
        }
        process.stdout.write(formatResolvedConfiguration(resolved));
      });
  },
);

/** Renders the resolved configuration as a human-readable report. */
function formatResolvedConfiguration(config: ResolvedConfiguration): string {
  const lines: string[] = [];
  lines.push("Lenses:");
  for (const lens of config.lenses) {
    lines.push(`  ${lens.id}: ${lens.description}`);
  }
  lines.push(`Prefixes: ${config.prefixes.join(", ")}`);
  lines.push("Layout:");
  lines.push(
    `  stories: ${config.layout.stories.dir} (${config.layout.stories.prefix})`,
  );
  lines.push(`  specs: ${config.layout.specs.dir}`);
  lines.push(`  drafts: ${config.layout.drafts.dir}`);
  lines.push(`  state: ${config.layout.state.file}`);
  lines.push("Generators:");
  if (config.generators.length === 0) {
    lines.push("  (none configured)");
  } else {
    for (const generator of config.generators) {
      lines.push(`  ${generator.type} -> ${generator.outputDir}`);
    }
  }
  lines.push("Agent:");
  lines.push(`  type: ${config.agent.type}`);
  lines.push(`  skills: ${config.agent.skillsDir}`);
  lines.push(`  governance: ${config.agent.governanceDir}`);
  lines.push(`  entry: ${config.agent.entryFile}`);
  return `${lines.join("\n")}\n`;
}
