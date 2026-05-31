# Multi-Device Connection Audit — apps/box

## Fixes applied 2026-05-30 (H2, M2, M3, M4, S2, S3)

Implemented in the **box app only** (no react-native-fula / go-fula changes), per
the user's preference. Verified: my 5 changed files introduce **zero new
TypeScript errors** and remove 4 pre-existing ones — proven by a position-
normalized set-diff of `tsc` output on the working tree (64 my-file errors) vs a
git-stash baseline with my changes removed (68). The box app has a large
pre-existing dirty `tsc` baseline (~1875 errors, mostly `@functionland/react-
native-fula` type-resolution + navigation/zustand-persist typing); the product
builds via Metro/Babel which strips types, so `tsc` is not the build gate. Jest:
the box suite's pass/fail is identical with and without these changes (the only
failures are pre-existing `jest is not defined` issues in an unrelated test file).

- **H2** — `useBloxsStore.removeBlox` rebuilt: immutable new maps (no in-place
  `delete` on `get()` refs), also clears `bloxsConnectionStatus[peerId]` +
  `folderSizeInfo[peerId]`, and on removing the current blox repoints
  `currentBloxPeerId` to the first remaining (or `undefined`) so the MainTabs
  init effect re-inits the native client for the new selection instead of the
  app being stranded on a deleted id.
- **M2/M3** — added `helper.getInitFulaGen()` exposing the existing module-level
  `initFulaGen` epoch (it bumps on every `resetInitFula()` AND at the top of every
  `initFula()` — i.e. on every native-client lifecycle change). `getBloxSpace`,
  `getFolderSize`, and the `checkBloxConnection` store wrapper now capture
  `{capturedPeerId, startGen}` before their native call and only attribute the
  result if `currentBloxPeerId` and the epoch are both unchanged — no more
  cross-blox writes when a switch/re-init lands mid-call.
- **S3 (no false DISCONNECTED) — applied to BOTH status-writing sites** that map
  a connection-probe boolean to a per-blox status: the `checkBloxConnection`
  store wrapper and `switchToBlox`'s post-switch write. (`checkAllBloxStatus` has
  no write of its own — it delegates to `checkBloxConnection` + `switchToBlox`, so
  fixing those two covers the mount/30 s-interval path too.) A shared
  `resolveConnStatus(connected, lowerStatus)` helper now **mirrors** the
  lower-level `useUserProfileStore.checkBloxConnection` classification instead of
  collapsing every non-connected result to red:
  - `connected` → `CONNECTED`
  - `NO INTERNET` (phone offline) and `NO CLIENT` (fula not ready) pass through as
    their own non-red states — these are the most common "random disconnected"
    causes and are no longer rendered as a blox outage.
  - genuine `DISCONNECTED` (lower-level's own retries exhausted / thrown error) →
    `DISCONNECTED`, so a real outage is ALWAYS surfaced.
  - cancelled check (lower-level left `CHECKING` because a newer check superseded
    it) → write nothing, leaving the prior status.
  - FOLLOW-ON FIX (consequence of the mirror): `waitForBloxStatusSettled` (used by
    `checkAllBloxStatus` to wait out each per-blox switch) previously treated only
    `CONNECTED`/`DISCONNECTED` as settled — fine when those were the only two
    outcomes. Now that `NO INTERNET`/`NO CLIENT` are reachable terminal per-blox
    states, it would have spun the full 60 s timeout (×N bloxes) when the phone is
    offline. Broadened its exit to "any status that isn't `CHECKING`/`SWITCHING`
    (or unset)".
  - LIVENESS FIX (codex-advisor, blocking): adding the `stillValid()` gate to the
    wrapper introduced a *new* stuck-spinner risk the original didn't have — the
    original always wrote a terminal status, but the gated version, when a check is
    superseded mid-await (a switch or a same-peer re-init bumping `initFulaGen`),
    would leave `peerId` on the `CHECKING` it wrote at the top forever (the
    superseding path writes status for ITS peer, not necessarily this one; and the
    Blox.screen re-check is gated on `!status`, so a truthy `CHECKING` never
    re-fires). Fixed with `restorePriorIfSuperseded()`: capture the pre-check
    status and, on any superseded branch, restore it — guarded by
    `currentStatus === 'CHECKING'` so it (a) only undoes OUR phantom write and (b)
    does NOT resurrect a status for a blox that `removeBlox` deleted mid-check.
    The `switchToBlox` post-switch write got the matching guarantee a different
    way: its result is awaited by `waitForBloxStatusSettled`, so it must be
    terminal — it writes `resolveConnStatus(...) ?? 'DISCONNECTED'` (never leaves
    `CHECKING`), because its only guard is `switchGeneration` (a newer *switch*),
    not the lower-level *check* generation, so a racing same-peer check could
    leave the global at `CHECKING`.
  - NOTE: a first pass gated the DISCONNECTED write on `fulaReadyForPeerId ===
    peerId`. Rejected and replaced because that could *hide a real outage*
    (suppress a genuine DISCONNECTED whenever readiness had been cleared). The
    mirror approach surfaces every real outage while killing the false red.
  - DEFERRED (NOT implemented — needs a user decision): a *transient-relay*
    hysteresis (hold a `CONNECTED` blox through 1–2 failed probes to ride out a
    libp2p relay drop that self-heals in seconds). The user did not request this,
    and advisors flagged real tradeoffs (a flapping link could stay green; a
    real outage would surface one sample later). If the mirror fix alone doesn't
    stop the "random disconnected" reports, this is the next step — best confirmed
    against device/adb logs of an actual flap first.
- **M4/S2** — added `fulaReadyForPeerId` to `useUserProfileStore`;
  `setFulaIsReady(value, peerId?)` records which blox the shared client is ready
  FOR and drops stale late-readiness (e.g. the MainTabs 5 s timeout firing after
  the user already switched). `checkFulaReadiness`, `switchToBlox`, and the
  MainTabs init all set it; `Blox.screen` gates its load/check effect on
  `fulaIsReady && fulaReadyForPeerId === currentBloxPeerId`.
- **S1** — not box-scoped: grep found no libp2p transfer/upload/pin call sites in
  the box app (they live in file-manager + react-native-fula). No change.
- **M1** — `checkAllBloxStatus` (foreground "Check All" sweep, BloxManager) and
  the headless `performBloxStatusCheck` (`services/backgroundBloxCheck.ts`, fired
  by react-native-background-fetch) both cycle the SINGLE shared native client
  with no coordination → one could reset/init it mid-check of the other (wrong
  results) and the headless restore used a STALE `originalBloxPeerId` (left the
  client on the wrong blox while the store disagreed). Fixed in the box app only:
  1. **Sweep mutex** in `helper.ts` (`withFulaSweepLock`): both sweeps wrap their
     whole body; same JS context (foreground or backgrounded-not-killed) → they
     serialize. `switchToBlox`/`checkBloxConnection` (invoked *inside*
     `checkAllBloxStatus`) deliberately do NOT take the lock → no self-deadlock.
  2. **Foreground-priority gating** of the headless task: it bails if
     `AppState.currentState === 'active'` (pre-lock at the call site AND
     post-lock at the top of `performBloxStatusCheck`), and breaks its per-blox
     loop the moment the app becomes active mid-sweep — skipping its restore so
     it never tears down a client the user is actively using.
  3. **Stale-restore fix**: the headless restore re-reads `currentBloxPeerId`
     FRESH from AsyncStorage right before restoring (not the task-start value).
  4. **Foreground reclaim (locked)**: the headless sweep sets a
     `helper.sweepMovedClient` flag the moment it first moves the client off the
     selected blox (clears it on a successful restore / single-blox). On the next
     app-active transition `App.tsx` consumes the flag and, if set, re-initialises
     fula for the current blox **inside `withFulaSweepLock`** — so the reclaim
     waits for the in-flight sweep to notice we're active, abort, and release the
     lock before it touches the client. (An earlier version bumped
     `fulaReinitCount` to let MainTabs re-init, but that init was UNLOCKED and
     could overlap the sweep's uninterruptible `checkConnection` on the single
     native bridge — Codex flagged it; the locked direct re-init closes that.)
     The reclaim re-reads `currentBloxPeerId` INSIDE the lock since the wait can
     be tens of seconds. This closes the "client left on a mid-sweep blox after
     an aborted sweep" gap.
  5. **Re-entry guard**: `checkAllBloxStatus` now early-returns if
     `_isCheckingAllStatus` is already set (the UI button gate didn't cover other
     callers / StrictMode double-invokes) and re-reads its selection fresh inside
     the lock.
  - Advisors (Gemini + Codex) reviewed the plan: the mutex + AppState-bail were
    validated; Codex's two critical points (break-on-active + skip-restore, and
    the foreground-reclaim being mandatory once you skip the restore) are folded
    in above. SCOPE NOTE: this is the targeted box-app coordination, not the full
    serialized epoch-keyed command-queue the audit recommends as the durable
    fix; the residual checkConnection-during-shutdown overlap is the H3
    native-layer race, still open.

STILL OPEN (not yet fixed): **H1** (CRITICAL — BLE wrong-device: no
bloxPeerId↔peripheral map), **H3** (iOS native client use-during-shutdown race),
L1/L2.

Advisor note: Gemini reviewed the PLAN (validated; flagged "bump the epoch on
every re-init, not just switch" — adopted via `initFulaGen`). The final
implementation-review advisor round was repeatedly cancelled by an unstable shell
environment; the hide-real-outage flaw was caught by direct source trace, not by
an advisor. Re-run gemini + codex on the committed diff when the environment is
stable.

---

Date: 2026-05-30. Scope: correctness of multi-device support — race conditions,
mis-connections, stale IDs across the three transports:
- **libp2p/kubo** (Home/Blox screen) via the single native `fula` client
- **LAN HTTP** (Blox-AI / Diagnostics) via mDNS or manual IP
- **BLE** (Settings ▸ Bluetooth commands, and AI-over-BLE fallback)

All findings below are from **verified, complete file reads** (MD5-checked where
the dev environment returned a corrupt first read). Severities are my
assessment; cross-checked with external advisors (see end).

---

## Architecture (verified)

- **One** global native `fula` (libp2p) client. "Multi-device" = switching that
  single client between bloxes. `switchToBlox(peerId)` → `Helper.resetInitFula()`
  + `Helper.initFula({bloxPeerId})` tears down and recreates the native client.
  `helper.ts:findBox(bloxPeerId)` resolves per-blox circuit multiaddrs
  (Workers `/find-box` → cached `/relays` → hardcoded `FXRelay`).
- Per-blox state keyed by peerId in `useBloxsStore`: `bloxs`,
  `bloxsConnectionStatus`, `bloxsSpaceInfo`, `folderSizeInfo`,
  `bloxsPropertyInfo`; single `currentBloxPeerId`.
- `fula.checkConnection()` tests whatever the single client currently points at.
- LAN HTTP (Diagnostics) uses a **separate** selector
  (`aiTransport.selectAiTransport`) → LAN HTTP (mDNS/manual IP) or BLE.
- BLE uses `BleManagerWrapper` (`utils/ble.ts`); peripherals are matched by
  **device NAME prefix** (`fulatower` / `fxblox`), never by blox peerId.

---

## CRITICAL

### H1 — BLE targets a device by NAME, not by the selected blox → wrong-device destructive commands  [CRITICAL]
> Severity raised HIGH→CRITICAL on independent agreement from both Gemini ("P0…
> cannot be overstated") and Codex ("correctly the top issue"). It crosses from
> "wrong status shown" into "destructive command delivered to the wrong physical
> device," even when libp2p/LAN is otherwise correct.
Files: `utils/ble.ts:486` (`connect`), `screens/Settings/Bluetooth/BluetoothCommands.screen.tsx`,
`screens/Diagnostics/Diagnostics.screen.tsx:377-392`.

- BLE discovery matches `name === 'fulatower' || name === 'fxblox-rk1' ||
  name.includes('fulatower') || name.includes('fxblox')`. There is **no mapping
  from `bloxPeerId` → BLE peripheral id** anywhere in the codebase. The
  `DiscoveredDevice` carries only `{peripheral, rssi}` — no TXT, no peerId.
- **BluetoothCommands screen**: shows `CurrentBloxIndicator` (the selected blox)
  at the top, but `connectViaBLE()` connects to whatever the user picks from the
  name+RSSI sheet (or, with one device in range, auto-connects to *whatever it
  is*). Nothing ties the BLE target to `currentBloxPeerId`. The destructive
  commands here — **`reset`, `cluster_delete` (IPFS Delete), `hotspot`,
  `partition`** — can therefore execute against a *different physical blox* than
  the one shown/selected. On a multi-blox LAN this is a data-loss footgun.
  - Aggravating: both bloxes likely advertise the same base name; the picker
    shows name + signal strength only, so the user cannot reliably tell them
    apart, and the app cannot verify the choice.
- **Diagnostics BLE binding** (`getConnectedPeripherals([]).find(name startsWith
  fulatower/fxblox)`): picks the FIRST OS-returned connected peripheral. With two
  bloxes connected over BLE, the AI session's BLE transport + the pending-actions
  BLE fetch can target a different blox than the LAN-HTTP path (which correctly
  uses `currentBloxPeerId`). Transport-dependent target mismatch.
- Fix direction: persist a `bloxPeerId ↔ blePeripheralId` mapping at pairing
  time (the pairing/mDNS flow has both the peripheral and the peerId in hand),
  and have BluetoothCommands + Diagnostics select the peripheral for
  `currentBloxPeerId` (falling back to the picker only when unmapped). At
  minimum, surface the *connected* device name next to the selected-blox name so
  a mismatch is visible before a destructive command runs.

### H2 — `removeBlox` leaves a dangling `currentBloxPeerId` + stale per-blox maps  [HIGH]
Files: `stores/useBloxsStore.ts:154`; user-facing caller `screens/Blox/Blox.screen.tsx:276-302`
(`handleOnBloxRemovePress` → `removeBlox(peerId)` with **no** reassignment).

- `removeBlox` deletes from `bloxs`/`bloxsPropertyInfo`/`bloxsSpaceInfo` but NOT
  `currentBloxPeerId`, `bloxsConnectionStatus`, or `folderSizeInfo`.
- Removing the **currently-selected** blox (allowed whenever >1 blox exists)
  leaves `currentBloxPeerId` pointing at a deleted id:
  - MainTabs auto-select net `if (!currentBloxPeerId && bloxsArray.length)` does
    NOT fire (still truthy) → app is stranded on a ghost id.
  - Home/Devices/Diagnostics read `bloxs[deletedId]` = undefined; `currentBlox`
    null; the libp2p init effect (`MainTabs` deps include `currentBloxPeerId`)
    won't repoint to a valid blox.
  - `bloxsConnectionStatus[deletedId]` lingers → a removed blox can keep showing
    CONNECTED; `folderSizeInfo[deletedId]` leaks.
- Also `delete bloxsPropertyInfo[peerId]` etc. mutate the object returned by
  `get()` in place before `set(...)` — a zustand immutability violation that can
  drop renders.
- Other `removeBlox` callers are safe (verified): `SetBloxAuthorizer.screen.tsx:295`
  removes then reassigns `currentBloxPeerId`; `ConnectToExistingBlox.screen.tsx:239/255`
  is pairing-time re-keying that sets `currentBloxPeerId` for the first blox.
  **The bug is specifically the user-facing "Remove Blox" sheet action.**
- Fix direction: in `removeBlox`, build new objects (no in-place `delete`); also
  delete `bloxsConnectionStatus[peerId]` + `folderSizeInfo[peerId]`; if
  `peerId === currentBloxPeerId`, set `currentBloxPeerId` to the first remaining
  blox (or `undefined`) so the MainTabs net re-inits.

---

## MEDIUM-HIGH

### M1 — `checkAllBloxStatus`: no internal re-entry guard; races background + manual switches  [MED-HIGH]
Files: `stores/useBloxsStore.ts:491`; `services/backgroundBloxCheck.ts:90`;
guard at `screens/BloxManager.screen.tsx:175,205`.

- `_isCheckingAllStatus` is set/cleared but **never read to early-return** inside
  the action. The UI guard `checkAllDisabled = isCheckingAll || anyBloxBusy`
  only stops a button double-tap on that one screen.
- The sweep serially `switchToBlox`es every blox then back, all driving the one
  client + the module-global `switchGeneration`. Concurrent drivers that the UI
  guard can't stop:
  - **`backgroundBloxCheck`** (headless BackgroundFetch) runs the SAME
    reset+init-per-blox loop with **zero** coordination with `switchGeneration`
    or `_isCheckingAllStatus`. If it fires while the app is foreground, it fights
    the foreground client.
  - A user tapping a different blox (`handleOpen → switchToBlox`) mid-sweep: the
    sweep's "switch back to original" then yanks them off their chosen device.
- Fix direction: early-return if `_isCheckingAllStatus`; serialize ALL
  client-switching (switchToBlox + checkAll + background) through one queue/mutex;
  have the background task bail if app state is foreground (or share the same
  generation/guard).

---

### H3 — iOS only: `checkConnection`/`ping` use the client on a concurrent queue while a switch shuts it down  [MED-HIGH on iOS, effectively N/A on Android — VERIFIED in native source]
> Codex's catch, **verified against `E:/GitHub/react-native-fula` +
> `E:/GitHub/go-fula`** (2026-05-30). **Correction:** my first write-up of H3 was
> wrong twice — (a) it's not a go-fula issue, and (b) it is NOT "two `newClient`
> calls running in parallel" (those are synchronous and serialize). I had also
> cited a `backgroundQueue … .concurrent` line that **does not exist** in the
> source — struck. The real, source-backed mechanism is below. The native files
> in `node_modules` are byte-identical to the repo (MD5 match), so the build uses
> exactly this code.

**Where the switched singleton lives.** NOT in go-fula: `go-fula/mobile/client.go`
`NewClient` returns a *fresh* `*Client` with `bloxPid` fixed at construction
(line 41) — no package-level client, no re-target. The "one client switched
between bloxes" is the **bridge field**: `FulaModule.java:52 fulamobile.Client
fula` / `Fula.swift:35 var fula: FulamobileClient?`, replaced in
`newClientInternal` by `shutdownInternal(); self.fula = FulamobileNewClient(cfg)`.

**Android — effectively safe (verified).** `android/.../ThreadUtils.java`:
`Executors.newSingleThreadExecutor()`; every `@ReactMethod` runs via
`ThreadUtils.runOnExecutor`, so all native calls (`newClient`, `checkConnection`,
`logout`, `shutdown`, …) are **serialized FIFO on one thread**. A switch's
`newClientInternal` cannot interleave with another native call. One narrow
residual: `checkConnectionInternal` (FulaModule.java:280-302) runs
`connectToBlox()` on its OWN `newSingleThreadScheduledExecutor` while the main
executor blocks on `future.get(timeout)`; on **timeout** it calls
`executor.shutdownNow()` and the outer thread returns — but `shutdownNow()` can't
interrupt a blocked Go call, so that inner thread may keep using the old client
while the next queued switch shuts it down. Real but narrow (only on a
checkConnection timeout). LOW on Android.

**iOS — real native race (verified).** `self.fula` has **no lock** anywhere
(grepped: the only `DispatchSemaphore` is inside `checkConnectionInternal`,
unrelated; no `NSLock`/`objc_sync_enter`/`os_unfair_lock` touches `self.fula`).
The switch-path methods are **synchronous** on RN's per-module dispatch queue —
`newClient` (Fula.swift:196), `initFula` (227), `logout` (251), `shutdown` (444)
call their `…Internal` bodies directly, so they serialize relative to each other
(this is why "two newClients in parallel" was wrong). **But two methods hop off
that queue**: `checkConnection` (line 152) and `ping` (line 178) do
`DispatchQueue.global(qos:.default).async { … self.fula … }` — a *concurrent*
global queue. Concretely:
1. `checkConnection` dispatches to the global queue, captures `if let fula =
   self.fula` (client **B**, Fula.swift:271), and calls `fula.connectToBlox()`
   which blocks up to `timeout` seconds (go-fula `ensureConnected` → `c.h.Connect`,
   up to 60 s; the app passes short timeouts but the native call is still in
   flight).
2. The user switches to **C** → `logout` then `newClient(C)` run synchronously on
   the module queue: `shutdownInternal()` calls `self.fula?.shutdown()` on the
   **same instance B** (go-fula `Shutdown`, client.go:221, closes the libp2p
   host + DHT + datastore) and sets `self.fula = nil` / then `= C`.

So instance **B is being `shutdown()`-ed on the module thread while
`connectToBlox()` is still running on it on the global queue** — concurrent use
of a go-libp2p host that's mid-`Close()`, plus an unsynchronized read/write of
the `self.fula` reference across two queues. Outcome: crash / use-after-shutdown,
or a check attributed to a client that no longer exists. The JS generation
counter only gates JS *status writes*; it doesn't touch native concurrency.

**Trigger (iOS).** Any overlap of a connection check / ping with a switch or a
`backgroundBloxCheck` step. `checkAllBloxStatus` (M1) interleaving with a user
switch is the strongest trigger; ordinary "tap a blox while the current one's
status check is still running" suffices.

**Fix direction.** Serialize the native client on iOS — give the module a single
serial `methodQueue` (or wrap all `self.fula` access + the switch path in one
serial queue / lock) so `checkConnection`/`ping` can't run concurrently with a
shutdown — matching Android's single-thread model. And/or the app-side
**epoch-keyed command queue** the advisors recommend (one owner for all
`resetInitFula`/`initFula`/`fula.*`; commit a native result only if the epoch
still matches; foreground intent invalidates background work). The narrow Android
timeout window closes under the same serialization.

Note: M2/M3 (JS-level mis-attribution) are **independent** and hold on BOTH
platforms — an epoch problem in the JS store (capture peerId → await → write),
not native threading. Also worth the targeted verify Codex raised: confirm every
status write is generation-gated (`catch`, `finally`, 90 s timeout, delayed
`setDisconnected`). The A→B→A path looks guarded by `latestSwitchPeerId ===
peerId` at `useBloxsStore.ts:379`.

## MEDIUM

### M2 — `checkBloxConnection` mis-attribution across a concurrent switch  [MED]
`stores/useBloxsStore.ts:314` (captures `peerId` up front) + `stores/useUserProfileStore.ts:456`
(native check on the single client; `connectionCheckGeneration` cancels older runs).
A switch overlapping a check → `fula.checkConnection()` reflects the *new*
target but the result is written under the *captured* peerId, or the generation
guard returns false → captured peer wrongly marked DISCONNECTED. Per-blox status
can flip/flicker when a check overlaps a switch.

### M3 — `getBloxSpace` / `getFolderSize` mis-attribution across a switch  [MED]
`stores/useBloxsStore.ts:179, 214`. Read `currentBloxPeerId`, await native call,
write under that id. A switch mid-call writes one blox's space/size under
another's key. (Home/Devices surfaces.)

### M4 — `fulaIsReady` is a single global flag, not per-blox  [MED]
`stores/useUserProfileStore.ts`. A superseded switch can flip readiness true in
the narrow window between its generation guard and `setFulaIsReady(true)`;
UI gating on `fulaIsReady` may act against an inconsistent client. Inherent to
the single-client model; mitigated but not eliminated by the generation guards.

---

## LOW / latent

### L1 — `initFula` promise-reuse can bind a caller to the wrong blox  [LOW, latent]
`utils/helper.ts:182` — `if (initFulaPromise) return initFulaPromise;`. A second
`initFula({bloxPeerId:B})` while A's init is in flight returns A's promise →
caller believes it reached B but the client is bound to A. Main flows guard
(switchToBlox/background call `resetInitFula()` first; MainTabs gates on
`_initFulaSource`), so latent today — but any future caller (e.g. a
`fulaReinitCount`-driven re-init firing during a switch) can trip it.

### L2 — stray `import { time } from 'console'`  [LOW]
`utils/helper.ts:8`. Unused Node `console` import in RN code; harmless at runtime
under Metro but should be removed.

---

## Systemic risks (raised by advisors; beyond the per-finding list)

- **S1 — Active-stream interruption (Gemini).** `resetInitFula()` runs on every
  switch AND inside the background sweep. If a libp2p transfer (upload/pin) is in
  flight on blox A, a status sweep or a user switch tears the client down
  mid-transfer. A "drain / defer switch while a transfer is active" guard is
  worth considering. (Today the app does little large-file libp2p transfer from
  this screen set, so impact is bounded — but it grows with features.)
- **S2 — `fulaIsReady` should be `{peerId, epoch, ready}` (Codex), not a global
  bool** — otherwise consumers infer the wrong target is ready (this is M4,
  upgraded reasoning).
- **S3 — Per-peer status should distinguish "unknown / not-checked" from
  "DISCONNECTED" (Codex).** Today a cancelled/superseded check yields false
  `DISCONNECTED`. A tri-state avoids false-negative red dots when a check is
  simply cancelled by a newer switch.
- **S4 — Credential note (Gemini raised; I down-rate).** Gemini worried a switch
  could use blox A's credentials against blox B. Verified: `password`/`signiture`
  are the **user's DID** secret (same across all bloxes for one account), not
  per-blox — so this specific cross-use is benign here. Flagging only so it's not
  re-raised.

## Advisor cross-check (per user's external-advisor protocol)

- **Gemini (Google):** confirmed H1, H2, M1–M4, L1 against the code; urged H1 →
  CRITICAL above H2; suggested M1 → HIGH; raised S1 (stream interruption) + the
  single-mutable-client design risk. Heavily rate-limited but consistent across
  3 passes.
- **Codex (GPT-5.5):** confirmed severities (H1 top, H2 HIGH); contributed H3
  (native singleton stale-mutation), S2, S3; recommended the serialized
  epoch-keyed command queue as the primary fix. (Ran architecture-only — its
  sandbox couldn't open the repo.) **H3 follow-up (2026-05-30):** verified
  directly against `E:/GitHub/react-native-fula` + `E:/GitHub/go-fula` — Codex's
  concern is real on **iOS only** (concurrent `backgroundQueue` + unguarded
  `self.fula` write); Android serializes via a single-thread executor so it's
  not reachable there. See H3 above for the corrected, source-backed analysis.
- **Cursor:** unavailable (free-tier usage cap hit this session).
- No advisor disagreement to surface; the two that ran agreed on direction.

## Verified good (no action)

- `utils/manualBloxIp.ts` — keyed per-blox (`@blox-ai/manual-ip/v1/<bloxPeerId>`).
- `utils/mdnsCache.ts:findAuthorizedBlox` — matches blox peerId AND
  `authorizer === appPeerId` AND freshness window. No cross-device LAN mis-match.
- `utils/aiTransport.ts` — re-validates target IP is RFC1918/link-local before any
  AI POST; a fresh mDNS record wins over a possibly-stale manual IP; selector
  binds to the passed `bloxPeerId`; Diagnostics passes `currentBloxPeerId`.
- `helper.ts` — `initFulaGen` protects cleanup; `shouldCancel` threaded through
  every `switchToBlox` await boundary; candidate-address retry cleans native
  state between attempts.
- `useAiSession.ts` — binds `bloxPeerId`/`appPeerId`; cancels the transport
  handle on unmount; SSE auto-resume keyed by `sessionId` + `lastEventSeq`.
- `MainTabs.navigator.tsx:104` — mDNS-resolve effect validates
  `resolved.txt.bloxPeerIdString === currentBloxPeerId` before applying IP.
- `ble.ts` ResponseAssembler — per-command stream isolation; single in-flight
  command guard (`'Another command is in progress'`); timeout rejects with
  partial frames.

---

## Suggested lab repro (adb logcat; when a lab device is available)

1. **H1 (BLE wrong device):** Two bloxes powered + in BLE range. Settings ▸
   Bluetooth, tap connect, observe the device sheet → confirm there's no way to
   tell which is the selected blox; connect and run a *non-destructive* command
   (e.g. `partition` read) — verify which physical device responds vs which is
   "current". logcat filter: `[BLE] Found target device`, `targetPeripheralId`,
   `connected to ble`.
2. **H2 (remove current):** With 2 bloxes, select blox A, remove A from the Blox
   info sheet. Observe Home/Devices still bound to A's ghost id; status stale.
3. **M1 (check-all race):** Tap "Check all status", immediately tap a different
   blox row. Watch for wrong per-blox status + landing on the wrong device.
   logcat: `Switching from Blox`, `initFula`, `checkBloxConnection`, `superseded`.
4. **M2/M3:** Open Home on blox A, trigger a switch to B while A's space/earnings
   fetch is in flight; check whether B's tile shows A's numbers.
