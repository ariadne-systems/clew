import {
  AriadneError,
  ErrorCode,
  mint,
  mintTemporary,
  requireConfig,
} from "@ariadne-thread/core";
import { realizes, SwTraceables } from "@ariadne-thread/trace";
import type { Command } from "commander";

/**
 * Registers the `ariadne mint` command surface (STR-005, STR-007).
 * The action stays thin: it delegates allocation and validation to core's
 * `mint()` and prints each minted id on its own line to stdout.
 * With `--tmp` it delegates to core's `mintTemporary()` for unbound ids that
 * touch no state; the default bound behaviour is unchanged.
 * Any error propagates to the bin entry, which writes it to stderr and exits
 * non-zero.
 */
export const registerMint: (program: Command) => void = realizes(
  [SwTraceables.SW_008_MINT_COMMAND, SwTraceables.SW_003_MINT_COMMAND_OUTPUT],
  (program: Command): void => {
    program
      .command("mint")
      .description("Mint ids for a type, e.g. `ariadne mint SW 3`.")
      .argument("<type>", "id prefix to mint for (e.g. SW)")
      .argument("[count]", "how many ids to mint", "1")
      .option("-t, --tmp", "mint temporary, unbound ids that touch no state")
      .action(
        async (type: string, count: string, options: { tmp?: boolean }) => {
          await requireConfig();
          const requestedCount = Number(count);
          if (!Number.isInteger(requestedCount)) {
            throw new AriadneError(
              ErrorCode.INVALID_COUNT,
              `count must be a whole number, got "${count}".`,
            );
          }
          const ids = options.tmp
            ? await mintTemporary(type, requestedCount)
            : await mint(type, requestedCount);
          for (const id of ids) {
            process.stdout.write(`${id}\n`);
          }
        },
      );
  },
);
