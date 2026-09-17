/**
 * Whether a stored alias may appear in the picker or be used for a turn.
 *
 * Mongo can lag the seed: a row stays `isActive` until someone re-runs
 * `harness:seed-aliases`. Anything here is a model this account cannot actually
 * drive through a harness (no tools, 403/404, or empty writes).
 */
export function isOfferedHarnessAlias(alias: string, model = ''): boolean {
  const hay = `${alias} ${model}`;
  if (/llama/i.test(hay)) return false;

  return true;
}
