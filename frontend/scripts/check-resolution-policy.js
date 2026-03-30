const fs = require("fs");
const path = require("path");

const packageJsonPath = path.join(__dirname, "..", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const resolutions = packageJson.resolutions || {};

const exactOrBoundedSemver = /^(?:\^|~)?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

const policies = {
  glob: { major: 13 },
  "js-yaml": { major: 4 },
  minimatch: { major: 10 },
  "test-exclude": { major: 7 },
  rollup: { major: 4 },
  flatted: { major: 3 },
  yaml: { major: 2 },
  picomatch: {
    forbidden: true,
    reason:
      "mixed 2.x and 4.x transitive dependencies rely on picomatch, so a global resolution breaks one side of the tree",
  },
};

const errors = [];

for (const [name, range] of Object.entries(resolutions)) {
  const policy = policies[name];

  if (!exactOrBoundedSemver.test(range)) {
    errors.push(
      `${name}: "${range}" is not allowed. Use an exact, ^, or ~ semver pinned to a known-safe major.`
    );
    continue;
  }

  if (!policy) {
    continue;
  }

  if (policy.forbidden) {
    errors.push(`${name}: do not add a global resolution because ${policy.reason}.`);
    continue;
  }

  const normalized = range.replace(/^[~^]/, "");
  const major = Number.parseInt(normalized.split(".")[0], 10);
  if (major !== policy.major) {
    errors.push(
      `${name}: "${range}" must stay within major ${policy.major} to avoid breaking transitive dependents.`
    );
  }
}

if (errors.length > 0) {
  console.error("Dependency resolution policy check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Dependency resolution policy check passed.");
