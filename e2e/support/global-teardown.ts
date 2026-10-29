import { deleteE2EAuthUsers, E2E_MARKER } from './api';

/** Drop fixture auth users so the dev Supabase project does not fill up. */
export default async function globalTeardown(): Promise<void> {
  const removed = await deleteE2EAuthUsers();
  console.log(`\n[e2e] removed ${removed} Supabase auth users tagged ${E2E_MARKER}\n`);
}
