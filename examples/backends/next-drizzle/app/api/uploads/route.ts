import { currentUser } from '@/lib/auth';
import { HttpError, route } from '@/lib/http';
import { imageTypeOf, MAX_UPLOAD_BYTES, storeImage } from '@/lib/uploads';

/** POST /api/uploads: an image for an email, as multipart `file` and `kind`. */
export const POST = route(async (request) => {
  await currentUser(request);
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File) || form.get('kind') !== 'image')
    throw new HttpError(415, { message: 'Send one image, as `file`.' });
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, { message: 'The file is too large.' });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = imageTypeOf(bytes);
  if (!type) throw new HttpError(415, { message: 'Only PNG, JPEG and GIF images.' });
  const key = await storeImage(bytes, type.extension);
  // A real project also reads the width and height (with sharp, say), so the
  // editor can reserve the image's space before it loads.
  return Response.json(
    { key, url: `/api/uploads/${key}`, mime: type.mime, size: bytes.length, name: file.name },
    { status: 201 },
  );
});
