export async function makeSupabaseBucketPrivate(
  input: { supabaseUrl: string; serviceRoleKey: string; bucket: string },
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const base = input.supabaseUrl.replace(/\/$/, '');
  const response = await fetchImpl(
    `${base}/storage/v1/bucket/${encodeURIComponent(input.bucket)}`,
    {
      method: 'PUT',
      headers: {
        apikey: input.serviceRoleKey,
        Authorization: `Bearer ${input.serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: input.bucket, public: false }),
    },
  );
  if (!response.ok) {
    throw new Error(`Supabase bucket update failed (${response.status})`);
  }
  const checked = await fetchImpl(`${base}/storage/v1/bucket/${encodeURIComponent(input.bucket)}`, {
    method: 'GET',
    headers: {
      apikey: input.serviceRoleKey,
      Authorization: `Bearer ${input.serviceRoleKey}`,
    },
  });
  const body = checked.ok ? await checked.json() : null;
  if (!checked.ok || body?.public !== false) {
    throw new Error(`Supabase bucket ${input.bucket} is still public`);
  }
}
