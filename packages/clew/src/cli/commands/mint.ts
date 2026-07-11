import { realizes, SwTraceables } from "@ariadne-thread/trace";
import type { Command } from "commander";
import {
  ClewError,
  ErrorCode,
  mint,
  mintTemporary,
  requireConfig,
} from "../../index.js";

type MintCommandOptions = { tmp?: boolean; as?: string };

/** Whether `--as` was given without `--tmp`. */
function authorWithoutTemporary(options: MintCommandOptions): boolean {
  return options.as !== undefined && !options.tmp;
}

/**
 * Resolves the draft author: the `--as` option, then `CLEW_DRAFT_AUTHOR`.
 * A present-but-empty flag or env var counts as unset.
 */
function resolveAuthor(options: MintCommandOptions): string | undefined {
  const configuredAuthor = options.as ?? process.env.CLEW_DRAFT_AUTHOR;
  if (configuredAuthor === undefined || configuredAuthor.length === 0) {
    return undefined;
  }
  return configuredAuthor;
}

/** Registers the `clew mint` command surface. `--tmp` allocates unbound ids that touch no state. */
export const registerMint: (program: Command) => void = realizes(
  [SwTraceables.SW_008_MINT_COMMAND, SwTraceables.SW_003_MINT_COMMAND_OUTPUT],
  (program: Command): void => {
    program
      .command("mint")
      .description("Mint ids for a type, e.g. `clew mint SW 3`.")
      .argument("<type>", "id prefix to mint for (e.g. SW)")
      .argument("[count]", "how many ids to mint", "1")
      .option("-t, --tmp", "mint temporary, unbound ids that touch no state")
      .option(
        "--as <author>",
        "namespace temporary ids by author (e.g. TS); falls back to CLEW_DRAFT_AUTHOR",
      )
      .action(
        async (type: string, count: string, options: MintCommandOptions) => {
          await requireConfig();
          const requestedCount = Number(count);
          if (!Number.isInteger(requestedCount)) {
            throw new ClewError(
              ErrorCode.INVALID_COUNT,
              `count must be a whole number, got "${count}".`,
            );
          }
          if (authorWithoutTemporary(options)) {
            throw new ClewError(
              ErrorCode.INVALID_OPTIONS,
              "`--as` applies only to temporary minting; pass `--tmp`, or drop `--as`.",
            );
          }
          const ids = options.tmp
            ? await mintTemporary(type, requestedCount, {
                author: resolveAuthor(options),
              })
            : await mint(type, requestedCount);
          for (const id of ids) {
            process.stdout.write(`${id}\n`);
          }
        },
      );
  },
);
