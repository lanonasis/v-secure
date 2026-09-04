const packageDirectories = [
  'oauth-client',
  'security-sdk',
  'web',
  'vortex-secure/packages/vortex-mcp-sdk',
  'riskgpt',
];

for (const directory of packageDirectories) {
  const install = Bun.spawnSync(
    ['bun', 'install', '--frozen-lockfile', '--ignore-scripts'],
    { cwd: directory, stdout: 'inherit', stderr: 'inherit' },
  );

  if (install.exitCode !== 0) {
    process.exit(install.exitCode ?? 1);
  }

  const test = Bun.spawnSync(['bun', 'run', 'test'], {
    cwd: directory,
    stdout: 'inherit',
    stderr: 'inherit',
  });

  if (test.exitCode !== 0) {
    process.exit(test.exitCode ?? 1);
  }
}
