# Windodex

Windodex is a local-first open-source bridge + iOS app that keeps the Codex runtime on your Windows PC and lets your phone connect through a paired WebSocket relay session.

## Architecture

```
┌──────────────┐       Paired session   ┌──────────────────┐       stdin/stdout       ┌─────────────┐
│ Windodex iOS │ ◄────────────────────► │ windodex-bridge  │ ◄──────────────────────► │ codex       │
│ app          │    WebSocket bridge    │ (Windows PC)     │    JSON-RPC              │ app-server  │
└──────────────┘                        └──────────────────┘                          └─────────────┘
                                               │                                         │
                                               │  JSONL rollout watching                 │ JSONL rollout
                                               ▼                                         ▼
                                        ┌─────────────┐                           ┌─────────────┐
                                        │  Codex      │ ◄─── reads from ──────── │  ~/.codex/  │
                                        │  (desktop)  │      disk on navigate     │  sessions   │
                                        └─────────────┘                           └─────────────┘
```

1. Run `windodex up` on your Windows PC — a QR code appears in the terminal
2. Scan it with the Windodex iOS app to pair
3. Your phone sends instructions to Codex through the bridge and receives responses in real-time
4. The bridge handles git operations and session persistence locally.

## Setup

1. Build the iOS app via Xcode on a Mac and install via TestFlight.
2. Run your own WebSocket relay server (or use a hosted one).
3. Start the Windodex bridge on your Windows PC via Node.js (`npm install && npm start`).
4. Ensure Codex is installed and running correctly.

## Changes from Original
This is a fork of Remodex, specifically adapted for Windows environments. MacOS-specific desktop refresh scripts (AppleScript) have been disabled, relying instead on manual or generic refresh mechanisms.
