# Follow a local OpenCode session

ArchMap can connect to an existing local OpenCode server, capture source before a task, and open a diagram review when observed activity returns to idle. This adapter is read-only: it does not launch OpenCode, submit prompts, run tools, approve permissions, or execute project code.

## Setup

1. In your repository, start OpenCode with a fixed loopback port:

   ```bash
   opencode --port 4096 --hostname 127.0.0.1
   ```

   Alternatively, start `opencode serve --port 4096 --hostname 127.0.0.1` and attach your terminal client to that server. Create the session in OpenCode.

2. Run ArchMap with a configured root containing that repository, and open its map.
3. Select **OpenCode sessions**, the cable icon beside the inspector's model-settings control.
4. Enter `http://127.0.0.1:4096`. If OpenCode uses HTTP Basic authentication, expand the authentication section and enter its username and password. OpenCode's default username is `opencode`.
5. Connect, select an idle session, then choose **Track next task**. ArchMap captures the current working source, including uncommitted changes.
6. Submit the task in OpenCode. Keep ArchMap's session panel open. After activity returns to idle, a read-only change review opens automatically. You can also choose **Review changes since baseline** while the session is idle.

Use **Capture a new baseline** before the next task if you want a separate review. Otherwise reviews remain cumulative from the original capture. Closing a review preserves your editable map. **Disconnect and clear baseline** removes the connection credentials and snapshot from server memory.

OpenCode's fixed-port CLI, HTTP Basic authentication, and read-only session/status/message endpoints are documented in the [OpenCode server reference](https://opencode.ai/docs/server/) and [CLI reference](https://opencode.ai/docs/cli/).

## What the review establishes

The baseline is a bounded source snapshot at tracking start, not `HEAD`. This separates existing dirty source from subsequent edits, even in a repository without Git. The review labels this baseline explicitly and retains before/after content hashes and snippets.

Session title and request text are reported OpenCode metadata. Changes are established independently by rereading source. A tracked session is contextual information: edits by another agent, editor, or person in the same folder are included. The adapter does not prove authorship or report tests as passed.

A baseline must be captured while idle. ArchMap checks session activity before and after capture and review; a task detected during either scan makes the operation fail so you can retry. Filesystem snapshots are not atomic, so wait until other tools have stopped writing too.

The source reader's JS/TS support, exclusions, configured-root and symlink boundaries, file/byte limits, and incomplete-coverage rules still apply. Source is never sent to OpenCode or a model by this adapter. Requests submitted in OpenCode may of course be processed by its configured providers independently.

## Lifecycle and limitations

- Only loopback HTTP origins are accepted. `localhost` is pinned to `127.0.0.1`; redirects and embedded URL credentials are rejected. Remote/cloud OpenCode servers and TLS termination are outside this first adapter.
- The OpenCode directory and session directory must match the selected map's canonical root. Sessions from other folders are excluded. Start/connect the intended OpenCode project instance if folders differ.
- Polling occurs every 2.5 seconds while the session panel is mounted and the page is visible. Switching inspector tabs, closing the page, or hiding it pauses observation. Reopening resumes it. This is status/message polling, not an SSE event history or a durable background watcher.
- Completion is inferred from observed busy/retry → idle status, or a completed assistant response associated with a new user message. Fast tasks can be recognized through message completion even if their busy status was missed. Unsupported metadata/status shapes produce errors rather than a fabricated completion signal.
- The selected session's last 20 messages provide request/completion context. Text is treated as data, not instructions. Responses are limited to 1 MB, session lists to 500 records, and requests time out after eight seconds. Large or incompatible histories can require a newer session or manual Git review.
- One connection and one baseline are held per local ArchMap server. They expire after one hour and are cleared on restart/disconnect. Credentials never enter map exports, browser storage, or project files. Connecting another repository replaces the prior baseline.
- Automatic review requires the panel to remain open. It does not submit follow-up requests or corrections; that is a separate future milestone.

## Implementation and validation

`server/opencode.ts` is a small HTTP adapter over documented GET endpoints; it has no SDK process launcher. `server/app.ts` exposes narrowly scoped connect/list/track/poll/review/disconnect routes under `/api/opencode`, using the same Host/Origin and repository-root boundaries as analysis. Capture/review shares the source-scan concurrency guard. Shared schemas describe connection metadata and working-tree baseline provenance.

Tests use a local HTTP fixture to cover task completion, pre-existing dirty source, auth, URL/redirect restrictions, foreign sessions, invalid status data, root/symlink boundaries, and exclusively GET requests to OpenCode. Browser tests cover automatic review and preservation of editable maps at desktop and phone widths.

An isolated smoke test against installed OpenCode **1.19.3** verified real connection, session listing, baseline capture, and source review. It created session metadata and changed a synthetic source fixture; it did not run an actual model task. Automatic completion is covered by the protocol fixture and browser tests. Broader OpenCode-version compatibility is not established.
