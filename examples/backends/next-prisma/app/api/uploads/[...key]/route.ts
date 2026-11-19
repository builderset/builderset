import { readImage } from '@/lib/uploads';

type Context = { params: Promise<{ key: string[] }> };

/** GET /api/uploads/:key: the stored file. A key never changes, so it is cached for good. */
export async function GET(_request: Request, { params }: Context) {
  const image = await readImage((await params).key.join('/'));
  if (!image) return new Response(null, { status: 404 });
  return new Response(image.bytes, {
    headers: { 'content-type': image.mime, 'cache-control': 'public, max-age=31536000, immutable' },
  });
}
