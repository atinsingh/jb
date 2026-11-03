import { makeSupabaseBucketPrivate } from './private-bucket';

function ok(body?: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  };
}

describe('makeSupabaseBucketPrivate', () => {
  const input = {
    supabaseUrl: 'https://project.supabase.co/',
    serviceRoleKey: 'service-role',
    bucket: 'jobocate',
  };

  it('updates the Supabase bucket and checks it is private', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(ok())
      .mockResolvedValueOnce(ok({ public: false }));

    await makeSupabaseBucketPrivate(input, fetchImpl as unknown as typeof fetch);

    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      'https://project.supabase.co/storage/v1/bucket/jobocate',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('throws when the bucket is still public', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(ok())
      .mockResolvedValueOnce(ok({ public: true }));

    await expect(
      makeSupabaseBucketPrivate(input, fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow(/still public/);
  });
});
