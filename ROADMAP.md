# Roadmap

Everything that has come up so far, grouped so it can be ordered. Effort is a rough guess: **S** under half a day, **M** one to two days, **L** several days or more. Nothing under "Ideas" has been started.

## Shipped on `stats-fix` (local, not yet pushed)

- Stats pages rebuilt: region picker, four tabs, contributors and counts fixed, shared counting rules with the profile pages
- Title pages: data found across sibling groups and member base IDs; graphics-derived "Performance Targets" with a contribute prompt; graphics and videos shown without a profile
- SEO: one canonical per game, a sitemap of games with data only, `noindex` for pages with nothing, no invented genre
- Karma auto-approval switched off (`AUTO_APPROVE_ABOVE_KARMA`, one line to bring back)
- Homepage: two columns on phones, broken-artwork fallback, one `h1`, welcome card instead of a modal
- Cartridge view in WebGL (one shared canvas), real proportions measured from a photo, insert animation, motion settings, flat/angled/sway/floating styles, header layering fix
- Cartridge polish: cleaner red band (label over number, hairline divider, no icons) and a quiet response to scrolling after the card has turned; the default style stays flat
- Game details page: a cartridge hero in place of the icon (drag to spin, theme-coloured glow), the phone back-to-top bubble, and console styling keyed to the theme engine (lit bezel, status lights, accent bars, spec-style labels). Contributor names no longer duplicate by case
- The contribute form no longer saves empty version rows as placeholder files
- Seasonal scenes for October (embers and bats), November (leaves) and December (snow): put up gradually from a few days early, behind the page, automatic, off in Settings, absent when animation is reduced, `?season=` to preview
- On a phone the hero cartridge flies to the bottom corner when scrolled past, turning, and flies back when tapped; sections settle into view as they scroll in
- Inspect view: tap the hero cartridge and it flies to the middle of the screen, turned by dragging or (on a phone) by tilting; Escape or the close button returns it
- The stats Performance tab no longer crashes when resolution types exist
- Game page header reworked around the cartridge (publisher eyebrow, large title, facts, Favorite and Inspect pills, the cartridge standing on the panel edge); the region dropdown no longer opens behind the title
- Homepage hero reworked around its cartridge (standing on the panel edge, controls moved, publisher line, larger title), cartridges ease into view instead of flipping
- Season props beside the hero cartridges (homepage, game page, contribute): a row of related pieces per season that stands up in order as the scene builds (Halloween: pumpkin, candy corn, ghost, small pumpkin, bat; autumn: leaves, acorn, mushroom; winter: snowman, present, pine, snow mound with a scarf and ribbon in the theme's accent). Same calendar, Settings switch, `?season=` preview and reduced-motion rules as the scene
- Real-size cartridge on the home page: a Settings slider calibrated against a bank card (saved in that browser only), and a guess from the device (known MacBooks, iPads, phones; Retina and standard screens otherwise) until then. A browser cannot read a screen's physical size, so every person calibrates once per device
- Cartridge view: hovering a card shoves its neighbours away, dips them back and turns them; opening one sends a shockwave through the rest (they hop, tumble and settle) and the page opens a beat later so it is seen. Off under reduced motion
- Hero scene per season (Halloween, autumn, winter): layered sky, ground tinted with the game's colour, lights under the progress bars, weather, props standing around the cartridge, and Halloween's bats flying over everything
- 3D and motion: grid reflow, live contribute preview, ghost cartridge on no-data pages, error-page and loading cartridges, compare view with cartridges (and a fix: it could never compare more than one version), favorites shelf, badge coins, cartridge piles for the stats timeline, count-up numbers and growing bars, glare and neighbour lean on 3D cards, favorite pop, header condense, banner parallax, opt-in phone tilt for the grid

## 1. Get the existing work live (do first)

| Item | Effort | Why |
| --- | --- | --- |
| Review and push `stats-fix`, open a PR | S | Nothing here helps anyone until it is deployed |
| nx-performance: commit `scripts/validate.mjs` and the workflow, delete the stale `validate-data.sh` | S | Today nothing is being validated |
| nx-performance: add `01000F900B6CC000` to `groups/010095300B6A4000.json` | S | The original user report (South Park AU/NZ) |
| nx-performance: run `scripts/fix-orphans.mjs`, decide the 2 conflicts, fix the remaining validator errors | S | 20 invisible data files; same cause as the report |
| After deploy: resubmit the sitemap in Search Console and watch coverage | S | The sitemap shrank from about 25,000 URLs to games with data |
| Try the cartridge view on a real phone and a real GPU | S | Only tested in a throttled pane. Scroll sync and battery are unknown |

## 2. Cartridge polish

Done: the red band, scroll response, and the default (flat).

| Item | Effort | Notes |
| --- | --- | --- |
| Measure the back | S | Only the front was measured, so the back's contacts and text are guesses |

## 3. Game details page

Done: the hero (desktop and phone), the mobile bubble, and console styling to the level of the section headings, cards and labels.

| Item | Effort | Notes |
| --- | --- | --- |
| Go further with the console look | M | Remaining places to carry it: the version selector, graphics detail, videos, the comparison modal. Keep it keyed to the theme engine |
| Try the hero with real artwork and slow connections | S | Tested only on made-up art |

## 4. Data quality and growth

masagrator is not building a performance-data tool, so the plan is to make the best of what exists.

| Item | Effort | Notes |
| --- | --- | --- |
| Existing placeholder profiles | S | New ones are no longer created. The 1,319 that exist are untouched: for 138 groups the file is the only record of who contributed, so deleting them in bulk would lose that. Decide whether to move the credit somewhere first |
| Better prompts on pages with no data | S to M | The contribute prompt exists; test where it converts |
| Descriptions and snippets from real data ("30 FPS docked, 1080p") | S | Every title page has the same boilerplate description |
| Material Icons font blocking render | S | A Google Fonts stylesheet loads on every page |

## 5. Contribution flow (db first, then PR)

| Item | Effort | Notes |
| --- | --- | --- |
| Confirm merged PR approves, closed PR rejects | S | The webhook exists; I have not traced the rejected case |
| Safe retries | M | A stable submission ID so a retry cannot open a second PR |
| Contribute from a grouped title files under the group | S | Today it may file under the title's own ID |

## 6. Ideas

### More 3D in the 2D interface

Built: the live contribute preview, grid reflow, ghost cartridge, homepage hero cartridge, cartridge piles for the stats timeline, favorites shelf, badge coins, compare fan, error and loading cartridges, phone tilt for the grid.

| Idea | Effort | Notes |
| --- | --- | --- |
| A region globe | L | Region selection on the stats page and onboarding as a turning globe. Heavy, and the picker already works; only if you want it |
| Shared-element transition from grid card to hero | M | The card flies into the hero position on opening a game, instead of sinking into the slot. A big change to something already liked, so only if wanted |

### Animation bound to scroll and interaction

Built: count-up numbers, growing bars and columns, glare, neighbour lean, favorite pop, press feedback, header condense, banner parallax, version cross-fade, opt-in phone tilt.

### Other

| Idea | Effort | Notes |
| --- | --- | --- |
| More seasons (January to September) | M | The scene system takes new entries in `src/lib/seasons.js`; each needs its particles and a tint |
| Real physics (nudge, bump) | L | Floating already exists. Real physics needs a physics library and its own setting |
| Schema v4: UUID group IDs, authorship inside each file | L | Only if group merges become routine; the cheaper validator and sync checks cover most of it |

## 7. Housekeeping

- `static/_tmp/` (test artwork) and a local `.env` and a `titledb-stats-pg` Docker container exist from testing; none are committed
- `.husky/pre-commit` is not executable, so the hook is being skipped
- `svelte-check` was not run on the new files
- `chart.js` was removed; confirm nothing else imports it
- Check what `three` adds to the bundle (it loads only in the cartridge view)

## Suggested order

1. Section 1, all of it (needs you: reviewing, pushing, and the nx-performance PRs)
2. Contribution flow checks (section 5) before more people submit
3. The rest of the console look and measuring the back (sections 2 and 3)
4. Everything else as demand shows itself

## Decisions made

- Default cartridge style: flat
- The details-page hero replaces the icon on desktop and phone
- The console look goes down to the details, keyed to the theme engine
- Stop creating placeholder profiles (done); existing ones stay for now
- Seasonal scenes: October to December first; the rest later
