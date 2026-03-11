#!/usr/bin/env node
// FILE: windodex.js
// Purpose: CLI surface for starting the local Windodex bridge, reopening the latest active thread, and tailing its rollout file.
// Layer: CLI binary
// Exports: none
// Depends on: ../src

const { startBridge, openLastActiveThread, watchThreadRollout } = require("../src");

const command = process.argv[2] || "up";

if (command === "up") {
  startBridge();
  return;
}

if (command === "resume") {
  try {
    const state = openLastActiveThread();
    console.log(
      `[windodex] Opened last active thread: ${state.threadId} (${state.source || "unknown"})`
    );
  } catch (error) {
    console.error(`[windodex] ${(error && error.message) || "Failed to reopen the last thread."}`);
    process.exit(1);
  }
  return;
}

if (command === "watch") {
  try {
    watchThreadRollout(process.argv[3] || "");
  } catch (error) {
    console.error(`[windodex] ${(error && error.message) || "Failed to watch the thread rollout."}`);
    process.exit(1);
  }
  return;
}

if (command !== "up") {
  console.error(`Unknown command: ${command}`);
  console.error("Usage: windodex up | windodex resume | windodex watch [threadId]");
  process.exit(1);
}
