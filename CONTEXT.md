# Pipemaster — Project Context

Last updated: 2026-06-19

## What This App Is

Pipemaster is a React + Vite PWA for managing polypipe irrigation on Mississippi Delta farms. It is built for field workers and farmers — mobile-first, offline-capable, satellite map at the center.

The physical system it models:
- **Wells** pump water out of the ground at a fixed GPM
- **Risers** are standpipes on the field edge fed by underground supply lines from wells
- **Underground lines** connect wells to risers (can daisy-chain riser → riser)
- **Pipe runs** are polypipe tubes that lie flat across a field, fed by a riser (or branch off another run as an inline tee)
- **Lines** — a single run can have multiple "lines" sharing the same drawn path. Used when one physical pipe is punched on both sides with different hole patterns (e.g. "North"/"South"), not for separate parallel pipes (see below)
- **Segments** divide a line into sections — each segment has a hole size, a distance range (ft), and a furrow count
- **Inline tee runs** — a separate physical pipe that branches off an existing run mid-pipe via a T-fitting (not at the riser). Stored as a run with `teeFromRunId` pointing at the parent run, no `riserId`

One well can feed multiple risers across multiple fields. One riser can have multiple runs.

**Transfer lines** (parallel pipe laid alongside another to split a long run so hole sizes/pressure stay reasonable) are just drawn as their own separate run — usually a tee run branching off the run it parallels — with a Supply segment for the transfer distance, then irrigation segments after. This matches how Delta Plastics Pipe Planner shows them as separate runs. Do NOT use the multi-"line" feature for this — that's reserved for true single-pipe dual-side punching where both sides share one physical path.

## Tech Stack

- React 19 + Vite 8
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- React-Leaflet v5 + Leaflet 1.9 — satellite map (Esri World Imagery tiles)
- Dexie v4 + dexie-react-hooks — IndexedDB offline storage
- `@anthropic-ai/sdk` v0.102 — AI schematic reading (runs in browser with `dangerouslyAllowBrowser: true`)
- `@supabase/supabase-js` — in dependencies but not wired up yet (future cloud sync)

## Environment

```
D:\pipemaster\
D:\pipemaster\.env          VITE_ANTHROPIC_API_KEY=<your-key>   # never committed — in .gitignore
```

Dev server: `npm run dev` (Vite on localhost)

## Directory Structure

```
src/
  App.jsx                     — root component, renders <MapHome />
  main.jsx                    — React entry point
  index.css                   — global CSS (dark bg: #0f1923)

  lib/
    db.js                     — Dexie database, versions 1–6
    pipeUtils.js              — HOLE_SIZES, HOLE_COLOR, haversine math, slicePath, getPointAtFt, offsetPath
    parseSheet.js             — AI schematic parsing (Anthropic SDK)
    claudeApi.js              — UNUSED/REDUNDANT — can be deleted
    holeColors.js             — old color map, superseded by pipeUtils.js HOLE_COLOR
    cropColors.js             — crop color map for field display
    leafletIcons.js           — custom Leaflet marker icons

  components/
    MapHome.jsx               — main screen: satellite map + all panels
    SidePanel.jsx             — right drawer: farm/field/riser/run management; RunWithTees nests tee runs under parent
    BottomSheet.jsx           — reusable modal sheet from bottom

    DrawMode.jsx              — handles map click-to-draw polylines/polygons
                                forcePolyline prop keeps it as line (for runs)
                                supports point insertion: tap on an existing segment to insert a point there (onInsertPoint)
                                points are draggable (onPointDrag)

    FieldPolygon.jsx          — renders a field boundary on the map
                                IMPORTANT: stopPropagation only fires when onClick is provided
                                (bug was: always stopped propagation, breaking draw mode)

    PipeRunLine.jsx           — renders a run on the map; groups segments by `line` field, offsets
                                each line ~2.2m sideways (offsetPath) so multiple lines on one run
                                render as parallel traces instead of fully overlapping

    RiserMarker.jsx           — renders a riser pin on the map
    WellMarker.jsx            — renders a well pin
    UndergroundLine.jsx       — renders underground line between well/riser and riser
    ZonePolygon.jsx           — renders a zone polygon

    SaveFieldSheet.jsx        — create/edit field (name, boundary draw)
    SaveWellSheet.jsx         — create/edit well
    SaveRiserSheet.jsx        — create/edit riser (ties to well + field)
    SaveZoneSheet.jsx         — create/edit zone
    AddFarmSheet.jsx          — create farm

    SaveRunSheet.jsx          — create new run; manages `lines` array (each with name + segs),
                                path set via draw-round-trip or AI import, supports tee runs (parentRunId)
    EditRunSheet.jsx          — edit existing run; regroups existing segments by `line` field back into lines[]
    SegmentTable.jsx          — segment editor for ONE line (hole sizes/distances/furrows); reused per line

    ScanSheet.jsx             — field GPS walk mode (in progress / placeholder)
    SchematicOverlay.jsx      — UNUSED — overlay approach was abandoned
    SettingsSheet.jsx         — UNUSED — API key is in .env, no settings screen needed
```

## Database Schema (current: v6)

```js
farms:       ++id, name, createdAt
fields:      ++id, farmId, name, crop, color, createdAt
             non-indexed: boundary ([[lat,lon],...])
zones:       ++id, fieldId, name, crop, color, createdAt
wells:       ++id, farmId, fieldId, name, type, gpm, hp, lat, lon, createdAt
risers:      ++id, wellId, farmId, fieldId, name, lat, lon, createdAt
undergrounds:++id, fromType, fromId, riserId, farmId, fieldId, createdAt
             fromType: 'well' | 'riser'  (daisy-chain support)
runs:        ++id, fieldId, riserId, wellId, name, status, startTime, endTime, gpmReading, gallons
             non-indexed: path ([[lat,lon],...]), teeFromRunId (parent run id if this is an inline tee, else null)
segments:    ++id, runId, startFt, endFt, holeSize, furrowCount, sortOrder
             non-indexed: line (string, e.g. "Line 1", "North", "South" — groups segments into a physical line within the run; absent/falsy treated as "Line 1")
notes:       ++id, fieldId, runId, text, photoUrl, lat, lon, createdAt
waterLogs:   ++id, runId, wellId, gpm, startTime, endTime, gallons
schematics:  ++id, fieldId, name, createdAt
             non-indexed: imageData, bounds
```

Key schema notes:
- `fields.boundary` is NOT indexed — it's stored as a plain array on the record
- `runs.path` is NOT indexed — same, just an array of [lat, lon] pairs
- `runs.teeFromRunId` is NOT indexed — queried via `db.runs.filter(r => r.teeFromRunId === run.id)`, fine at this data scale
- `segments.line` is NOT indexed — segments for a run are fetched in bulk and grouped client-side by this field
- `undergrounds.fromType` + `fromId` support daisy-chaining: riser → riser chains
- `schematics` table exists but the overlay UI was abandoned — table is harmless

## Hole Sizes & Colors

| Size    | Color   | Hex       |
|---------|---------|-----------|
| Supply  | Slate   | #64748b   |
| 1/4"    | Amber   | #f59e0b   |
| 5/16"   | Blue    | #3b82f6   |
| 3/8"    | Violet  | #7c3aed   |
| 7/16"   | Gray    | #6b7280   |
| 1/2"    | Red     | #ef4444   |
| 9/16"   | Yellow  | #eab308   |
| 5/8"    | Green   | #22c55e   |

Supply = no holes, just open pipe. Always `furrowCount: null`.

## Key Utility Functions (pipeUtils.js)

```js
pathTotalFt(path)              // total length of a GPS polyline in feet
getPointAtFt(path, targetFt)   // GPS point at a given distance along the path
slicePath(path, startFt, endFt)// sub-polyline between two foot distances
```

All use Haversine distance. `slicePath` is used by PipeRunLine to color each segment independently.

## AI Schematic Import (parseSheet.js)

```js
parsePipeSheet(imageFile, geoContext = null)
```

- Uses `claude-sonnet-4-6` via Anthropic SDK
- Reads a Delta Plastics Pipe Planner screenshot
- Extracts: `farm`, `field`, `flowRateGPM`, `pipeLengthFt`, `runs[]`, `pathWaypoints`

Each run has `segments[]`:
```js
{ startFt, endFt, holeSize, furrowCount }
```

**geoContext** (optional):
```js
{ fieldBoundary: [[lat,lon],...], riserLat, riserLon }
```
When provided, Claude is told:
- "The field outline in this satellite image IS this boundary polygon"
- Use it as a reference frame to georeference the pipe path
- Return `pathWaypoints: [[lat, lon], ...]` — 4–8 points along the pipe route

This allows AI to auto-place the run on the map using the already-drawn field boundary as a spatial anchor — no world-scanning needed.

**Prompt rules:**
- Supply sections are omitted from segments
- `furrowCount` is always required (never null for non-Supply segments)
- `holeSize` must match exactly: `"5/8\""`, `"1/2\""`, etc.
- Returns raw JSON, no markdown fences

## SaveRunSheet — How It Works

Props: `{ path: initialPath, riserId, fieldId, parentRunId, riser, field, onClose, onSaved, onDrawRequest }`

- Sheet opens immediately when "+ Add run" is tapped — drawing is NOT forced first
- `path` is stateful — starts null, set via "Draw on map" (round-trip through draw mode) or AI import
- **Draw on map button**: calls `onDrawRequest()` → MapHome hides the sheet (`display:none`, stays mounted so name/segments aren't lost), enters draw mode, riser pre-seeded as point 1 if this is a riser-based run (empty start if tee run). On Finish, MapHome passes the drawn path back via the `path` prop; a `useEffect` in the sheet syncs it into local `path` state
- **Import sheet button**: AI fills `lines[0].segs` from the schematic table; if `!path?.length` AND geoContext (field boundary + riser) is available, AI-extracted `pathWaypoints` also set the path. If the user already drew a path manually, AI import does NOT override it (only fills segments) — this was a deliberate fix, don't reintroduce the override
- `lines` state: array of `{ name, segs }` — see "Multi-line runs" below
- Default state: single line, one Supply segment with `endFt: 0`; the path-sync effect extends that segment's `endFt` to match the drawn path length (so an unconfigured run saves as Supply for its whole length, not a guessed hole size)
- Save button disabled until `name` and `path` are both set
- `parentRunId` prop (when set) marks this as an inline tee run — title shows "Add Inline Tee Run", saved as `run.teeFromRunId`

## EditRunSheet — How It Works

Same shape as SaveRunSheet but for existing runs. Props add `drawnPath` + `onDrawRequest` (same draw round-trip pattern, used by the **Edit path** button). Existing segments are grouped by their `line` field back into the `lines[]` array on load. Re-import from schematic only replaces `lines[0]` (the assumption: schematic import always targets the primary/simple line).

## Multi-line runs ("+ Add line")

A run can have multiple independent segment tables sharing the SAME drawn path — used for one physical pipe punched on both sides with asymmetric hole patterns (e.g. field not square: north side needs 1/2"+3/8", south side needs 1/4"+3/8"+5/16", different distance breakpoints on each side).

- `addLine()` in SaveRunSheet/EditRunSheet appends `{ name: 'Line N', segs: [...] }` to the `lines` array
- Each line gets its own `SegmentTable` instance, independently editable
- On save, every line's segments are written with a `line: <name>` tag
- `PipeRunLine.jsx` groups segments by `line`, and renders each line's polyline on a laterally-offset copy of the path (`offsetPath()`, ~2.2m spacing) so they appear as parallel traces on the map instead of one stacked exactly on the other

**Do NOT use this for transfer/parallel pipes** (a separate physical pipe laid alongside an existing run to split a long run's pressure load) — those are modeled as separate runs (typically tee runs), not as a second "line" on the same path. See "What This App Is" above.

## SegmentTable — Segment Editing UI

Manages ONE line's segments (one `segs` array + `setSegs`). Reused once per line in SaveRunSheet/EditRunSheet.

Features:
- Colored dot + hole size select per row
- Distance range display: `216–3809 ft`
- Furrow count input (hidden for Supply rows)
- Spinner arrows hidden via `appearance: textfield`
- **⊞ merge button** between each row pair:
  - Same hole size → merges immediately, combines furrow counts
  - Different hole sizes → shows inline picker with two colored buttons to choose which size to keep
- `+ Add segment` at bottom

## Inline tee markers (`tees` table, db v7)

A tee is a persistent T-fitting marker placed at a distance along an EXISTING run's path — like a mini riser. One or more runs can branch from the same tee over time (not a one-shot relationship).

```js
tees: ++id, runId (parent run), fieldId, atFt, name, createdAt
```
- `runId` + `atFt` define the marker's position; lat/lon is computed on demand via `getPointAtFt(parentRun.path, tee.atFt)` — never cached, so it stays correct if the parent run's path is later edited
- Runs branching from a tee store `teeId: <tee.id>` instead of `riserId` (mirrors how riser-based runs store `riserId`)
- `nearestFtOnPath(path, latlng)` in pipeUtils.js converts a tapped map point into a distance along a run's path — used to place the marker where the user taps

**Placing a tee** (in EditRunSheet only — "in edit run, add a T" was the explicit ask):
- "+ Add T" button → `onAddTeeRequest(run)` → MapHome sets `placingTeeForRun`, hides the EditRunSheet (same display:none round-trip pattern as draw/edit path)
- A `TeePlacementCatcher` (single `useMapEvents` click handler) listens for the next map tap, computes `atFt` via `nearestFtOnPath`, saves to `db.tees`, clears `placingTeeForRun` — sheet reappears
- Banner: `Tap on "{run.name}" where the T-fitting is` + Cancel button

**Adding a run from a tee:**
- EditRunSheet lists the run's tees (queried by `runId`) with a "+ Run" button per tee → `onAddRunFromTee(tee)`
- SidePanel's `RunWithTees`/`TeeRow` (recursive) also lists tees under each run with "+ Run" — supports nesting runs that themselves have tees, indefinitely
- `handleAddRunFromTee(tee)` in MapHome resolves the parent run, computes position, sets `activeTeeMarker = { id, lat, lon, fieldId }`, opens SaveRunSheet
- SaveRunSheet receives `teeId={activeTeeMarker?.id}`; `handleRunDrawRequest` pre-seeds the draw path from either `activeRiserForRun` or `activeTeeMarker`, whichever is set
- Rendered on the map as a `TeeMarker` (green `CircleMarker` + name tooltip) at the computed position

**Superseded:** an earlier one-shot design stored `teeFromRunId` directly on the child run with no persistent marker (added via a single "⊢" button per run, one tee per click). Replaced by the above — don't reintroduce `teeFromRunId`.

## MapHome.jsx — Key Behaviors

- `doubleClickZoom={false}` on MapContainer — prevents double-tap zoom on mobile
- Tile layers use `maxNativeZoom={19} maxZoom={22}` — lets you zoom in past native resolution for precise boundary tapping
- `FieldPolygon` receives `onClick={isDrawing ? null : handler}` — during draw mode, field click does nothing (no flyTo zoom-out)
- `FieldQuickBar` shows each field's risers with `+ Add run` buttons (no extra tap needed)
- `handleAddRun`/`handleAddTeeRun` open the sheet directly; actual path drawing happens later via the sheet's "Draw on map" button (see SaveRunSheet draw round-trip above)
- `drawingForRun` / `drawingForEditRun` booleans control which sheet-hide-during-draw round trip is active; `handleCancelDraw` checks both to know which sheet to restore
- Runs + allSegments queried at top level; filtered per-run in PipeRunLine render
- SaveRunSheet receives both `riser` and `field` for geoContext building
- `handleInsertPoint(afterIndex, latlng)` — passed to DrawMode, splices a new point into the array when the user taps near an existing line segment (point insertion, see DrawMode notes)

## Known Bugs Fixed (don't reintroduce)

1. **Map zooms out on every tap during draw mode**
   - Root cause: FieldPolygon.onClick called `flyTo(field.boundary)` even during draw mode
   - Fix: Pass `onClick={isDrawing ? null : handler}` to FieldPolygon; only stopPropagation when onClick exists

2. **Draw mode click blocked by FieldPolygon**
   - Root cause: `e.originalEvent.stopPropagation()` called unconditionally
   - Fix: Only call stopPropagation when `onClick` is provided (see FieldPolygon.jsx)

3. **db.js duplicate v4 stores stanza**
   - Was created during a bad edit; cleaned up

4. **Furrow counts missing from AI import**
   - Root cause: prompt didn't explicitly require furrowCount
   - Fix: Added "furrowCount is required — read it from the Furrow Count column, never omit or set to null"

## Completed Features

- [x] Farm / field / zone management with boundary drawing
- [x] Wells with GPS pins
- [x] Risers tied to wells + fields
- [x] Underground lines (daisy-chainable riser → riser)
- [x] Pipe runs with multi-point GPS path drawing, draw-on-map round trip, AI schematic import
- [x] Segment table with hole sizes, distances, furrow counts, furrow pattern (every/every-other)
- [x] Colored polyline rendering on map (per segment, per hole size), click a run line to open it
- [x] Swap point dots on map at each hole-size boundary
- [x] AI schematic import — Delta Plastics Pipe Planner sheet → segments + path placement (tested, works)
- [x] Segment merge function (⊞ merge with hole-size picker)
- [x] Multi-run picker for inline tee schematics
- [x] Multi-line runs ("+ Add line") — one physical pipe punched on both sides, independent segment tables sharing one path
- [x] Inline tee markers (`tees` table) — persistent T-fitting points on a run; tap to add a run from that point; multiple runs can branch from one tee over time
- [x] Point insertion on draw (tap an existing segment to add a vertex) + draggable points — for complex boundaries
- [x] "Mark hole sizes on map" — tap-and-pick flow, walks the path and builds segments visually instead of typing ft numbers
- [x] Run Log (`RunLogSheet.jsx`) — simple Start/Stop ledger per run using `waterLogs`, separate from the technical Edit Run sheet
- [x] HTTPS local dev (`@vitejs/plugin-basic-ssl`) + `public/manifest.json` for installable/standalone mobile testing

## Pending / Not Built Yet

- [ ] GPS field mode: walk the field, vibration alert at each hole-size swap point
- [ ] Notes and field log feature
- [ ] Supabase cloud sync (package installed, not wired up)
- [ ] TransUnion vehicle data — wrong project, ignore
- [ ] Real app icons (currently reusing favicon.svg in manifest.json — fine for testing, want a proper 192/512 PNG icon set before real deployment)

## RunLogSheet — simple operator-facing view

`src/components/RunLogSheet.jsx`. Deliberately separate from EditRunSheet — farmers want "did I water this, when, how long" without wading through hole-size/segment editing.

- ▶ Start Run / ⏹ Stop Run — sets `run.status`/`run.startTime` while active; on stop, prompts for an optional GPM reading, computes gallons (`gpm × minutes`), writes one row to `waterLogs`, resets run to idle
- History list reads `db.waterLogs.where('runId').equals(run.id)`, newest first
- "⚙ Edit hole sizes & details" at the bottom routes to the full EditRunSheet for power-user editing
- Opened by tapping a run's NAME (not the small "+ Add run" button) in both `FieldQuickBar` (bottom bar, now lists runs under each riser) and `SidePanel`'s `RunWithTees` — `onOpenRunLog` prop threaded through both
- `MapHome.handleOpenRunLog(run)` sets `loggingRun` + `sheet = 'runLog'`; the sheet itself re-reads the live run from the `runs` query (`runs?.find(r => r.id === loggingRun.id) ?? loggingRun`) so Start/Stop status updates reflect immediately

SidePanel's `RunWithTees` row: run name is the primary tap target (opens log), a small "⚙" icon opens EditRunSheet, a pulsing green dot shows next to actively-running runs.

## Mobile / Field-Mode Testing Setup (2026-06-19)

No PWA tooling existed before this — added the minimum needed to test on a phone over WiFi:

- `@vitejs/plugin-basic-ssl` added to `vite.config.js` — serves the dev server over HTTPS with a self-signed cert. **Required** because Geolocation API (GPS) is blocked by mobile browsers on insecure (`http://`) origins except `localhost` — a LAN IP needs HTTPS to get GPS working during testing.
- `server: { host: true }` in vite.config.js — exposes the dev server on the LAN, not just localhost
- `public/manifest.json` — `display: "standalone"`, points at `favicon.svg` as the icon (SVG manifest icons are valid; swap for real PNG icons before going live)
- `index.html` — added manifest link, theme-color, apple-mobile-web-app meta tags so "Add to Home Screen" opens full-screen (no browser chrome) on both Android and iOS
- Dev server now starts as `https://localhost:5173/` and `https://192.168.x.x:5173/` (check terminal output for the actual LAN IP each session — it can change)
- First visit on a phone will show a certificate warning (self-signed) — must be accepted manually each time the cert regenerates; this is expected for local dev, not needed once actually deployed

## Files That Can Be Deleted (dead code)

- `src/lib/claudeApi.js` — superseded by parseSheet.js
- `src/components/SchematicOverlay.jsx` — overlay approach abandoned
- `src/components/SettingsSheet.jsx` — API key is in .env, no settings screen needed
- `src/lib/holeColors.js` — superseded by HOLE_COLOR in pipeUtils.js
