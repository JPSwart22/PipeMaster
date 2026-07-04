import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

export function startTour({ setPanelOpen }) {
  setPanelOpen(true)

  // Two animation frames: first lets React flush the panel open, second lets
  // the browser paint so driver.js can measure element positions correctly.
  requestAnimationFrame(() => requestAnimationFrame(() => {

    const driverObj = driver({
      showProgress: true,
      progressText: '{{current}} / {{total}}',
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Done',
      allowClose: true,
      overlayOpacity: 0.6,
      popoverClass: 'pm-tour-popover',
      steps: [

        // ── Overview ─────────────────────────────────────────────────────────
        {
          popover: {
            title: 'Welcome to Pipemaster',
            description:
              'You\'re in <strong>Edit Mode</strong> — where farm managers map pipe systems, import Delta Plastics schematics, and build the full run layout.<br><br>This tour covers all the major features in about 2 minutes.',
          },
        },

        // ── Web app tip ──────────────────────────────────────────────────────
        {
          popover: {
            title: 'Tip: Use the Web App for Setup',
            description:
              'Edit Mode is <strong>much easier on a desktop or laptop</strong> at <strong>pipemaster.vercel.app</strong> — drawing field boundaries, tracing run paths, and editing segment tables are all faster with a mouse and keyboard.<br><br>Use the phone app mainly for <strong>Field Mode</strong> and <strong>Punching Mode</strong> out on the farm.',
          },
        },

        // ── Top bar ──────────────────────────────────────────────────────────
        {
          element: '#pm-hamburger',
          popover: {
            title: 'Farm Panel',
            description:
              'Tap <strong>☰</strong> to open and close the setup panel. On desktop it stays open; on mobile it overlays the map.',
            side: 'bottom',
            align: 'start',
          },
        },

        {
          element: '#pm-fieldmode-btn',
          popover: {
            title: 'Field Mode',
            description:
              'Switch to <strong>Field Mode</strong> for your crew — no setup menus, just run controls. Come back to Edit Mode any time to add or edit pipe.',
            side: 'bottom',
            align: 'end',
          },
        },

        // ── FAB ──────────────────────────────────────────────────────────────
        {
          element: '#pm-fab',
          popover: {
            title: 'Quick Add',
            description:
              'Tap <strong>+</strong> to place a farm, field, well, or riser on the map with a single tap.',
            side: 'top',
            align: 'end',
          },
        },

        // ── Panel sections ────────────────────────────────────────────────────
        {
          element: '#pm-panel-header',
          popover: {
            title: 'Farm Tree',
            description:
              'Everything is organized as a tree:<br><strong>Farm → Field → Riser → Run</strong><br><br>All data is stored offline on this device and synced to other devices via a farm code.',
            side: 'right',
            align: 'start',
          },
        },

        {
          element: '#pm-add-farm-btn',
          popover: {
            title: 'Create a Farm',
            description:
              'Tap <strong>+</strong> to create your first farm. Expand it to add fields, wells, and risers.',
            side: 'bottom',
            align: 'end',
          },
        },

        // ── Concepts: fields / wells / risers ─────────────────────────────────
        {
          popover: {
            title: 'Fields',
            description:
              'Under each farm, add <strong>fields</strong> (paddocks or sections). Draw the boundary on the satellite map. Tap ⚙ on a field to edit its boundary and crop type.',
          },
        },

        {
          popover: {
            title: 'Wells & Pumps',
            description:
              'Add each pump as a <strong>well</strong>. Log GPM, horsepower, motor model, RPM, and filter schedules (air, fuel, oil). Tap ⚙ on a well in the panel to see its full pumping history.',
          },
        },

        {
          popover: {
            title: 'Risers',
            description:
              'A <strong>riser</strong> is where the buried supply pipe comes up out of the ground. Place it on the map from a well row, or from a field\'s detail view. All pipe runs branch from a riser.',
          },
        },

        // ── Settings / sync ───────────────────────────────────────────────────
        {
          element: '#pm-panel-settings',
          popover: {
            title: 'Sync Settings',
            description:
              'Open <strong>⚙ Settings</strong> to get your farm code. Share it with other phones or tablets — they stay in sync in real-time over any internet connection.',
            side: 'top',
            align: 'start',
          },
        },

        // ── Drawing a run ─────────────────────────────────────────────────────
        {
          popover: {
            title: 'Adding a Run',
            description:
              'Expand a field in the panel, then tap <strong>+ Add run</strong> under a riser. In the sheet that opens, tap <strong>Draw on map</strong> — then tap along the pipe route on satellite view from the riser to the end.',
          },
        },

        {
          popover: {
            title: 'Live Distance Counter',
            description:
              'While drawing, an <strong>orange counter</strong> shows total pipe length in real-time as you tap each point.<br><br>Use this to know exactly where to end your transfer/supply section before the first punched hole.',
          },
        },

        // ── Segment table ─────────────────────────────────────────────────────
        {
          popover: {
            title: 'Segment Table',
            description:
              'Each run has a <strong>segment table</strong> listing each stretch by hole size:<br>• First row: <em>Supply</em> — transfer section, no holes<br>• Remaining rows: hole size, end footage, furrow count',
          },
        },

        {
          popover: {
            title: 'Furrow Patterns',
            description:
              '<strong>Every furrow</strong> — holes punched into every row.<br><strong>Every other furrow</strong> — alternating rows, one skipped between each hole.<br><br>Choose the pattern that matches your field setup.',
          },
        },

        {
          popover: {
            title: 'Both-Sides Runs',
            description:
              'If the same pipe run is punched on <strong>both sides</strong> of the rows, tap <strong>Add line</strong> in the sheet. Each line has its own hole profile — Punching Mode lets you pick which side to navigate.',
          },
        },

        // ── AI schematic import ───────────────────────────────────────────────
        {
          popover: {
            title: 'AI Schematic Import',
            description:
              'Have a <strong>Delta Plastics spec sheet</strong>? Tap <strong>Import schematic</strong> and snap a photo. The AI reads all hole sizes, distances, and furrow counts — and fills the segment table in automatically.',
          },
        },

        // ── Inline T ─────────────────────────────────────────────────────────
        {
          popover: {
            title: 'Inline T-Fittings',
            description:
              'Tap ⚙ on a run → <strong>Add T-Fitting</strong>. Place the T on the map where the fitting is. Child runs branch from that exact point and appear nested in the panel.',
          },
        },

        // ── Field Mode features ───────────────────────────────────────────────
        {
          popover: {
            title: 'Starting a Run',
            description:
              'In Field Mode, tap any run on the map to open it. Tap <strong>Start Run</strong> — Pipemaster starts logging gallons using your well\'s GPM and the elapsed run time.',
          },
        },

        {
          popover: {
            title: 'Punching Mode',
            description:
              'Once a run is active, tap <strong>Punching Mode</strong>. Walk the pipe and tap each hole as you punch it — the app navigates hole-by-hole and shows which size comes next. Screen stays on the whole time.',
          },
        },

        // ── History ───────────────────────────────────────────────────────────
        {
          popover: {
            title: 'Run & Well History',
            description:
              'Tap ⚙ on any run to see its segment ledger and every start/stop event with duration and gallons.<br>Tap ⚙ on a well in Field Mode to see all pumping history across all its runs.',
          },
        },

        // ── Done ──────────────────────────────────────────────────────────────
        {
          element: '#pm-tour-btn',
          popover: {
            title: "You're Ready!",
            description:
              'That covers all of Pipemaster\'s core features.<br><br>Tap <strong>?</strong> here anytime to replay this tour. Now go map your farm!',
            side: 'bottom',
            align: 'end',
          },
        },
      ],
    })

    driverObj.drive()
  }))
}
