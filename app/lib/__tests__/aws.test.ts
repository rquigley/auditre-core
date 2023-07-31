import { getPresignedUrl } from '../aws';

describe('getPresignedUrl', () => {
  it('the result should contain both the key and the bucket', async () => {
    const bucket = 'random-bucket-name-28282834';
    const key = 'my-file-name-1234';
    const presignedUrl = await getPresignedUrl({ bucket, key });

    const r = new RegExp(`https://${bucket}.*${key}`);
    expect(presignedUrl).toMatch(r);
  });
});
