# Production release versions

- Show only `vMajor.Minor.Patch` in every visible release badge, including the 3D home page. Do not show timestamps or commit hashes in badges or tooltips.
- Increment the root package's patch version before each new production release with `npm version patch --no-git-tag-version`, unless the user requests a major or minor release. Commit both `package.json` and `package-lock.json` with the release changes.
- Rebuilds or retries of the same release keep the same version. Keep Git revision and build time in internal release metadata for deployment verification.
