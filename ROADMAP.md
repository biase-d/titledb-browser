# Roadmap

Everything that has come up so far, grouped so it can be ordered. Effort is a rough guess: **S** under half a day, **M** one to two days, **L** several days or more. Nothing under "Ideas" has been started.

## Shipped on `stats-fix` (local, not yet pushed)

- Stats pages rebuilt: region picker, four tabs, contributors and counts fixed, shared counting rules with the profile pages
- Title pages: data found across sibling groups and member base IDs; graphics-derived "Performance Targets" with a contribute prompt; graphics and videos shown without a profile
- SEO: one canonical per game, a sitemap of games with data only, `noindex` for pages with nothing, no invented genre
- Karma auto-approval switched off (`AUTO_APPROVE_ABOVE_KARMA`, one line to bring back)
- Homepage: two columns on phones, broken-artwork fallback, one `h1`, welcome card instead of a modal
- Cartridge view in WebGL (one shared canvas), real proportions measured from a photo, insert animation, motion settings, flat/angled/sway/floating styles, header layering fix

## 1. Get the existing work live (do first)

| Item | Effort | Why |
| --- | --- | --- |
| Review and push `stats-fix`, open a PR | S | Nothing here helps anyone until it is deployed |
| nx-performance: commit `scripts/validate.mjs` and the workflow, delete the stale `validate-data.sh` | S | Today nothing is being validated |
| nx-performance: add `01000F900B6CC000` to `groups/010095300B6A4000.json` | S | The original user report (South Park AU/NZ) |
| nx-performance: run `scripts/fix-orphans.mjs`, decide the 2 conflicts, fix the remaining validator errors | S | 20 invisible data files; same cause as the report |
| After deploy: resubmit the sitemap in Search Console and watch coverage | S | The sitemap shrank from about 25,000 URLs to games with data |
| Try the cartridge view on a real phone and a real GPU | S | Only tested in a throttled pane. Scroll sync and battery are unknown |

## 2. Cartridge polish (small, high visibility)

| Item | Effort | Notes |
| --- | --- | --- |
| Cleaner red band | S | Smaller type, a small label (DOCKED / HANDHELD) over each number, a thin divider, centred when only one mode exists. Same layout in the 3D card and the CSS fallback |
| Sane defaults | S | Decide the default style (flat now) and whether the angled pose should be the default. One line each |
| Subtle scroll response | S | After the card has turned, a small pitch from its position in the viewport and a little yaw from scroll speed, under about 0.1 rad. Off when motion is reduced |
| Measure the back | S | Only the front was measured, so the back's contacts and text are guesses |

## 3. Game details page

| Item | Effort | Notes |
| --- | --- | --- |
| Cartridge hero in the page header | M | A larger cartridge beside the title, using the shared canvas. Drag to spin, springs back front-facing. Keeps today's icon as the fallback for crawlers, no WebGL and reduced motion, so SEO is unchanged |
| Mobile "back to top" bubble | S | When the hero scrolls out of view, a small round button at the bottom with a mini cartridge and an up arrow. Smooth-scrolls to the top |
| Console and cartridge look for the rest of the page | M to L | Needs a design pass first: which sections, how far to go. Suggest doing the hero, then deciding |

## 4. Data quality and growth

masagrator is not building a performance-data tool, so the plan is to make the best of what exists.

| Item | Effort | Notes |
| --- | --- | --- |
| Policy for placeholder profiles | S | 1,319 of 1,376 profile files only name a contributor. Keep, label, or stop creating them |
| Better prompts on pages with no data | S to M | The contribute prompt exists; test where it converts |
| Descriptions and snippets from real data ("30 FPS docked, 1080p") | S | Every title page has the same boilerplate description |
| Material Icons font blocking render | S | A Google Fonts stylesheet loads on every page |

## 5. Contribution flow (db first, then PR)

| Item | Effort | Notes |
| --- | --- | --- |
| Confirm merged PR approves, closed PR rejects | S | The webhook exists; I have not traced the rejected case |
| Safe retries | M | A stable submission ID so a retry cannot open a second PR |
| Contribute from a grouped title files under the group | S | Today it may file under the title's own ID |

## 6. Ideas, not started

| Idea | Effort | Notes |
| --- | --- | --- |
| Seasonal scenes | M | Shell colour, particles, themed glow; automatic by date with an off switch. Start with two or three |
| Real physics (nudge, bump) | L | Floating already exists. Real physics needs a physics library and its own setting |
| Schema v4: UUID group IDs, authorship inside each file | L | Only if group merges become routine; the cheaper validator and sync checks cover most of it |

## 7. Housekeeping

- `static/_tmp/` (test artwork) and a local `.env` and a `titledb-stats-pg` Docker container exist from testing; none are committed
- `.husky/pre-commit` is not executable, so the hook is being skipped
- `svelte-check` was not run on the new files
- `chart.js` was removed; confirm nothing else imports it
- Check what `three` adds to the bundle (it loads only in the cartridge view)

## Suggested order

1. Section 1, all of it
2. Cartridge polish (section 2), since it is small and everyone sees it
3. Details page hero and the mobile bubble (section 3)
4. Contribution flow checks (section 5) before more people submit
5. Everything else as demand shows itself

## Decisions needed

1. Default cartridge style: flat or angled?
2. Should the details-page hero replace the game icon on desktop too, or only phones?
3. How far should the console look go beyond the hero?
4. Keep or stop creating placeholder profiles?
5. Seasonal scenes: which two or three first?
