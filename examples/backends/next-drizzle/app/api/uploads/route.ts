import { imageTypeOf, MAX_UPLOAD_BYTES, storeImage } from '@/lib/uploads';

/** POST /api/uploads: an image for an email, as multipart `file` and `kind`. */
export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File) || form.get('kind') !== 'image')
    return Response.json({ message: 'Send one image, as `file`.' }, { status: 415 });
  if (file.size > MAX_UPLOAD_BYTES)
    return Response.json({ message: 'The file is too large.' }, { status: 413 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = imageTypeOf(bytes);
  if (!type) return Response.json({ message: 'Only PNG, JPEG and GIF images.' }, { status: 415 });
  const key = await storeImage(bytes, type.extension);
  // A real project also reads the width and height (with sharp, say), so the
  // editor can reserve the image's space before it loads.
  return Response.json(
    { key, url: `/api/uploads/${key}`, mime: type.mime, size: bytes.length, name: file.name },
    { status: 201 },
  );
}
