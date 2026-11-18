// Install current compatible dependencies once, then commit the generated exact lockfile.
const commands = [['bun', 'add', '--exact', 'react', 'react-dom'], ['bun', 'add', '--dev', '--exact', 'typescript', '@types/bun', '@types/react', '@types/react-dom']];
for (const cmd of commands) {
  const p = Bun.spawn(cmd, {
    stdout: 'inherit',
    stderr: 'inherit'
  });
  if ((await p.exited) !== 0) process.exit(1);
}
const pkg = await Bun.file('package.json').json();
pkg.packageManager = `bun@${Bun.version}`;
pkg.engines = {
  ...pkg.engines,
  bun: `=${Bun.version}`
};
await Bun.write('package.json', JSON.stringify(pkg, null, 2) + '\n');
