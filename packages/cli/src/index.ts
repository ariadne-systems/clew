#!/usr/bin/env node
import { coreVersion } from "@ariadne-thread/core";
import { Command } from "commander";
import pc from "picocolors";

const program = new Command();

program
  .name("ariadne")
  .description(pc.dim(`ariadne-thread CLI (core ${coreVersion()})`))
  .version("0.0.0");

program.parse();
