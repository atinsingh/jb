import { S3Driver, MISSING_DEP_MESSAGE } from '../drivers/s3.driver';

describe('S3Driver (without the AWS SDK installed)', () => {
  const driver = new S3Driver({ bucket: 'b', region: 'us-east-1' });

  it('exports a clear install-hint message', () => {
    expect(MISSING_DEP_MESSAGE).toMatch(/install @aws-sdk\/client-s3/);
  });

  it('throws the install hint when put is called without the dependency', async () => {
    await expect(driver.put('k', Buffer.from('x'))).rejects.toThrow(
      MISSING_DEP_MESSAGE,
    );
  });

  it('throws the install hint when getBuffer is called without the dependency', async () => {
    await expect(driver.getBuffer('k')).rejects.toThrow(MISSING_DEP_MESSAGE);
  });

  it('throws the install hint when getSignedUrl is called without the dependency', async () => {
    await expect(driver.getSignedUrl('k')).rejects.toThrow(MISSING_DEP_MESSAGE);
  });

  it('throws the install hint when exists is called without the dependency', async () => {
    await expect(driver.exists('k')).rejects.toThrow(MISSING_DEP_MESSAGE);
  });

  it('throws the install hint when delete is called without the dependency', async () => {
    await expect(driver.delete('k')).rejects.toThrow(MISSING_DEP_MESSAGE);
  });
});
