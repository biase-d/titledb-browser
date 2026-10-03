# Validation for the nx-performance data repository

These files belong in `biase-d/nx-performance` (branch `v3`), not here. They live
in this repository only because it could not push there. To install:

| Copy | To |
| --- | --- |
| `validate.mjs` | `scripts/validate.mjs` |
| `validate-pr.yml` | `.github/workflows/validate-pr.yml` |

Then delete the old `scripts/validate-data.sh`. It checked a `data/` folder that
no longer exists, and the old workflow targeted branch `v2` and called a script
by a different name, so nothing was being validated.

Run it locally from the root of nx-performance:

```sh
node scripts/validate.mjs                      # everything
node scripts/validate.mjs profiles/0100.../1.0.json   # only findings involving these files
```

On a PR, only findings that involve a changed file are reported, so the problems
already in the repository (`existing-findings.txt`: 25 errors and 15 warnings when
this was written) do not block unrelated PRs. Fix those in a separate PR; most are
profile data filed under a title ID that has since been put into another group.

## What it checks

- every file parses, and has the shape the site reads (`contributor`, `docked`,
  `handheld`; resolution type, FPS behaviour and target FPS values)
- a group file is a list of 16-digit title IDs with no repeats
- a title is in only one group
- data is not filed under a title that now belongs to another group

A profile holding only `contributor` is allowed: it credits someone before the
numbers exist, and the site does not count it as data.
