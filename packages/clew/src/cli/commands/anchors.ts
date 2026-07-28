import { realizes, SwTraceables } from "@ariadne-thread/trace";
import type { Command } from "commander";
import { ClewError, ErrorCode } from "../../errors.js";
import { type Relation, requireConfig, resolveAnchors } from "../../index.js";

const RELATIONS: readonly Relation[] = ["realizes", "verifies", "concerns"];

/** Parses the `--relation` value, rejecting an unrecognized one. */
function relationOption(value: string | undefined): Relation | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!RELATIONS.includes(value as Relation)) {
    throw new ClewError(
      ErrorCode.INVALID_OPTIONS,
      `Unknown relation "${value}"; expected one of ${RELATIONS.join(", ")}.`,
    );
  }
  return value as Relation;
}

/** Registers the `clew anchors` command — the read side of the locations index, emitting JSON keyed by id for a context agent. */
export const registerAnchors: (program: Command) => void = realizes(
  SwTraceables.SW_047_ANCHORS_COMMAND,
  (program: Command): void => {
    program
      .command("anchors")
      .description(
        "Resolve spec ids to their anchor sites, as JSON keyed by id.",
      )
      .argument("[ids...]", "the spec ids to resolve")
      .option("--all", "resolve every id in the index")
      .option(
        "--relation <relation>",
        "restrict the sites to realizes | verifies | concerns",
      )
      .allowExcessArguments(false)
      .action(
        async (
          ids: string[],
          options: { all?: boolean; relation?: string },
        ) => {
          try {
            await requireConfig();
            const relation = relationOption(options.relation);
            if (options.all !== true && ids.length === 0) {
              throw new ClewError(
                ErrorCode.INVALID_OPTIONS,
                "Provide one or more ids, or `--all`.",
              );
            }
            const report = await resolveAnchors({
              ids,
              all: options.all,
              relation,
            });
            process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
          } catch (error) {
            if (error instanceof ClewError) {
              process.stdout.write(
                `${JSON.stringify({ error: { code: error.code, message: error.message } }, null, 2)}\n`,
              );
              process.exitCode = 1;
              return;
            }
            throw error;
          }
        },
      );
  },
);
