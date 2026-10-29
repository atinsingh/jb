/** Emails containing this are suite fixtures and safe to delete from Supabase Auth. */
export const E2E_MARKER = 'e2e-auto';

export function e2eAuthUserIds(
  pages: Array<Array<{ id: string; email?: string }>>,
): string[] {
  return pages.flatMap((users) =>
    users.filter((user) => user.email?.includes(E2E_MARKER)).map((user) => user.id),
  );
}
