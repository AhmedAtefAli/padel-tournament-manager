# Automated tests

All executable automated tests belong in this folder.

## Run the tests

```bash
pnpm test
```

The test command is configured in the root `package.json` and runs every
`test/*.test.ts` file with Node's built-in test runner.

Pull-request preview deployments run this command from
`.github/workflows/pages.yml` before building and publishing the preview.
GitHub requires workflow files to remain inside `.github/workflows`.

## Current coverage

- `standings.test.ts` tests standings calculations, match results, knockout
  progression, champion and runner-up states, draws, and friendly exclusions.

Application code under `src/` contains the implementation being tested, but
no test files.
