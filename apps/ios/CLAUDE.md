# iOS app: working notes for Claude Code

Native SwiftUI app, iOS 17+, iPhone only. Scope and backend rules are in [`README.md`](README.md); the root `CLAUDE.md` still applies.

## The dev loop (no Xcode UI needed)

Run from `apps/ios`. Every command is headless, so it works from a remote session on the Mac.

| Command | What it does |
|---|---|
| `scripts/dev build` | Build for the Simulator. Prints errors, our warnings and the verdict; full log in `build/logs/build.log`. |
| `scripts/dev test` | Run the unit tests (Swift Testing, `StubbedTests/`). |
| `scripts/dev run` | Build, install and launch on the Simulator, wait 3s (`WAIT=…`), save `build/screenshot.png`. **Read the PNG to check UI work.** |
| `scripts/dev screenshot [path]` | Screenshot whatever is on the Simulator now. |
| `scripts/dev logs [secs]` | The app's recent log lines. Log with `os.Logger(subsystem: "com.felixng.stubbed", …)` so they show up. |
| `scripts/dev types` | Regenerate `Stubbed/Generated/Database.swift` from local Supabase after a migration. Never edit that file by hand. |

`SIM="iPhone SE (3rd generation)" scripts/dev run` checks a small screen. Before calling UI work done, check the screenshot on both a small and a large phone, and in dark mode (`xcrun simctl ui booted appearance dark`).

You can't tap the Simulator. To screenshot a screen deeper in the app, temporarily make it the root view, or write an XCUITest that navigates there. Don't leave debug shortcuts in.

## Backend

- **Debug builds talk to local Supabase** at `127.0.0.1:54321`. Start it from the repo root with `supabase start` (needs Docker Desktop running). `supabase status` shows whether it's up. The placeholder root screen says "Connected to 127.0.0.1" when it is.
- Release builds use the hosted project. URLs and keys are in `Config/*.xcconfig`; `Config/Secrets.xcconfig` (git-ignored, see `Secrets.example.xcconfig`) overrides Debug.
- Schema changes go in `supabase/migrations` (shared with the web) and are applied with `supabase db reset` locally. Then run `scripts/dev types`.
- Local auth emails (one-time codes) land in Mailpit at http://127.0.0.1:54324.

## Project conventions

- **Files are picked up automatically.** `Stubbed/` and `StubbedTests/` are synchronized folders: create, move or delete `.swift` files on disk and the next build sees them. Don't edit `project.pbxproj` for that. Do edit it (carefully, then `scripts/dev build`) only for new targets, packages or build phases.
- Target build settings live in `Config/Shared.xcconfig`, not in the project file.
- New Swift packages are dependencies: ask the owner first (root `CLAUDE.md`). `supabase-swift` is the only one so far.
- Swift 6 language mode with strict concurrency. Two-space indentation.
- Keep logic that the web also needs in Postgres (see README). The Swift side renders and calls RPCs.

## Signing

Simulator builds need no signing. Team `AAW3XNQ6D3`, bundle ID `com.felixng.stubbed`, automatic signing. Device or TestFlight builds need `-allowProvisioningUpdates` and the owner's Apple account in Xcode; leave those to the owner unless asked.
