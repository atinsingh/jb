import { S3Driver, MISSING_DEP_MESSAGE } from '../drivers/s3.driver';

describe('S3Driver', () => {
  it('configures a path-style S3 client for the Supabase Storage endpoint', async () => {
    const send = jest.fn().mockResolvedValue({});
    const S3Client = jest.fn().mockImplementation(() => ({ send }));
    const PutObjectCommand = jest.fn().mockImplementation((input) => input);
    const driver = new S3Driver(
      {
        bucket: 'resumes',
        region: 'ca-central-1',
        endpoint: 'https://project.storage.supabase.co/storage/v1/s3',
        accessKeyId: 'access',
        secretAccessKey: 'secret',
        publicBaseUrl:
          'https://project.supabase.co/storage/v1/object/public/resumes',
      },
      async () => ({
        s3: { S3Client, PutObjectCommand },
        presigner: { getSignedUrl: jest.fn() },
      }),
    );

    const result = await driver.put('users/u1/resume.pdf', Buffer.from('pdf'), {
      contentType: 'application/pdf',
    });

    expect(S3Client).toHaveBeenCalledWith(
      expect.objectContaining({
        region: 'ca-central-1',
        endpoint: 'https://project.storage.supabase.co/storage/v1/s3',
        forcePathStyle: true,
        credentials: { accessKeyId: 'access', secretAccessKey: 'secret' },
      }),
    );
    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({ Bucket: 'resumes', Key: 'users/u1/resume.pdf' }),
    );
    expect(result.url).toBe(
      'https://project.supabase.co/storage/v1/object/public/resumes/users/u1/resume.pdf',
    );
  });

  it('exports a clear install-hint message', () => {
    expect(MISSING_DEP_MESSAGE).toMatch(/install @aws-sdk\/client-s3/);
  });

  it('throws the install hint when the SDK cannot load', async () => {
    const driver = new S3Driver(
      { bucket: 'b', region: 'us-east-1' },
      async () => {
        throw new Error('missing');
      },
    );
    await expect(driver.put('k', Buffer.from('x'))).rejects.toThrow(
      MISSING_DEP_MESSAGE,
    );
  });
});
