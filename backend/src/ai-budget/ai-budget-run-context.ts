import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { hostname } from 'os';

// Shared by all service instances in this process, including PID reuse after
// a container restart. A different live process/host must never be unlocked.
export const budgetWorker = { id: randomUUID(), host: hostname(), pid: process.pid };
export const budgetRunContext = new AsyncLocalStorage<{
  registerSandbox: (id: string) => Promise<void>;
}>();

export function hasStoppedBudgetWorker(account: {
  runWorkerId?: string; runWorkerHost?: string; runWorkerPid?: number;
}): boolean {
  if (account.runWorkerHost !== budgetWorker.host || !account.runWorkerId || !Number.isInteger(account.runWorkerPid) || account.runWorkerPid! <= 0) return false;
  if (account.runWorkerPid === budgetWorker.pid) return account.runWorkerId !== budgetWorker.id;
  try { process.kill(account.runWorkerPid!, 0); return false; }
  catch (error) { return (error as NodeJS.ErrnoException).code === 'ESRCH'; }
}
