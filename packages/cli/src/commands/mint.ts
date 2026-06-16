import { mint } from "@ariadne-thread/core";
import type { Command } from "commander";

/**
 * Registers the `ariadne mint` command (STR-005).
 * The action stays thin: it delegates allocation and validation to core's
 * `mint()` and prints each minted id on its own line to stdout (SW-003).
 * Any error propagates to the bin entry, which writes it to stderr and exits
 * non-zero.
 */
export function registerMint(program: Command): void {
  program
    .command("mint")
    .description("Mint ids for a type, e.g. `ariadne mint SW 3`.")
    .argument("<type>", "id prefix to mint for (e.g. SW)")
    .argument("[count]", "how many ids to mint", "1")
    .action(async (type: string, count: string) => {
      const requestedCount = Number(count);
      if (!Number.isInteger(requestedCount)) {
        throw new Error(`count must be a whole number, got "${count}".`);
      }
      const ids = await mint(type, requestedCount);
      for (const id of ids) {
        process.stdout.write(`${id}\n`);
      }
    });
}
