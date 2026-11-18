import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// Resolve the shared source's extensionless imports; Node itself strips erasable TypeScript.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'bun:test') return next('node:test', context);
    if (specifier.startsWith('.') && context.parentURL) {
      const candidate = new URL(specifier + '.ts', context.parentURL);
      if (existsSync(fileURLToPath(candidate))) return next(candidate.href, context);
    }
    return next(specifier, context);
  }
});
