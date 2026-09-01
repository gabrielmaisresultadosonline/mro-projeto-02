/** Log padronizado para os scripts de migração. */

const t = () => new Date().toISOString().slice(11, 19);

export const log = {
  step(message: string): void {
    console.log(`\n\x1b[1m\x1b[36m▶ ${message}\x1b[0m`);
  },
  info(message: string): void {
    console.log(`  ${t()} ${message}`);
  },
  ok(message: string): void {
    console.log(`  \x1b[32m✓\x1b[0m ${message}`);
  },
  warn(message: string): void {
    console.warn(`  \x1b[33m!\x1b[0m ${message}`);
  },
  error(message: string): void {
    console.error(`  \x1b[31m✗\x1b[0m ${message}`);
  },
  table(rows: readonly object[]): void {
    if (rows.length === 0) return;
    console.table(rows);
  },
};
