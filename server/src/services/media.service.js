import { Media, Property } from '../models/index.js';
import { env } from '../config/env.js';
import { cloudinary } from '../config/cloudinary.js';
import { ensure } from '../utils/ApiError.js';
function validateBytes(file) {
  const b = file.buffer;
  const jpeg = b.length > 3 && b[0] === 255 && b[1] === 216 && b[2] === 255;
  const png =
    b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp =
    b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP';
  const pdf = b.length >= 5 && b.toString('ascii', 0, 5) === '%PDF-';
  ensure(
    { 'image/jpeg': jpeg, 'image/png': png, 'image/webp': webp, 'application/pdf': pdf }[
      file.mimetype
    ],
    400,
    'INVALID_FILE',
    'File content does not match its type'
  );
}
export async function saveFiles(files, userId, { propertyId, private: privateFile = true } = {}) {
  ensure(files?.length > 0, 400, 'INVALID_FILE', 'Choose at least one file');
  for (const file of files) validateBytes(file);
  const result = [];
  for (const file of files) {
    const record = {
      userId,
      propertyId,
      private: privateFile,
      mime: file.mimetype,
      name: file.originalname.replace(/[^\w. -]/g, '_').slice(0, 100),
    };
    if (env.MEDIA_MODE === 'cloudinary') {
      const uploaded = await new Promise((resolve, reject) =>
        cloudinary.uploader
          .upload_stream(
            {
              resource_type: file.mimetype === 'application/pdf' ? 'raw' : 'image',
              type: 'authenticated',
              folder: 'estora',
            },
            (error, value) => (error ? reject(error) : resolve(value))
          )
          .end(file.buffer)
      );
      record.cloudPublicId = uploaded.public_id;
      record.cloudResourceType = uploaded.resource_type;
    } else record.data = file.buffer;
    const stored = await Media.create(record);
    result.push({
      url: `/api/v1/media/${stored._id}`,
      publicId: String(stored._id),
      name: record.name,
    });
  }
  return result;
}
export async function getFile(id, user) {
  const file = await Media.findById(id).select('+data');
  ensure(file, 404, 'NOT_FOUND');
  if (file.private)
    ensure(
      user && (user.role === 'ADMIN' || String(user._id) === String(file.userId)),
      403,
      'FORBIDDEN'
    );
  if (file.propertyId) {
    const property = await Property.findById(file.propertyId);
    ensure(property, 404, 'NOT_FOUND');
    if (['DRAFT', 'PENDING_APPROVAL', 'REJECTED'].includes(property.status))
      ensure(
        user && (user.role === 'ADMIN' || String(user._id) === String(property.brokerId)),
        403,
        'FORBIDDEN'
      );
  }
  if (file.cloudPublicId) {
    const url = cloudinary.url(file.cloudPublicId, {
      resource_type: file.cloudResourceType,
      type: 'authenticated',
      sign_url: true,
      secure: true,
    });
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    ensure(response.ok, 502, 'MEDIA_UNAVAILABLE');
    file.data = Buffer.from(await response.arrayBuffer());
  }
  return file;
}
export async function addPropertyMedia(id, user, files) {
  const property = await Property.findById(id);
  ensure(property, 404, 'NOT_FOUND');
  const flexible = ['DRAFT', 'REJECTED'].includes(property.status);
  ensure(
    flexible || !files.documents?.length,
    403,
    'IMMUTABLE_FIELD',
    'Documents cannot change after submission'
  );
  ensure(
    (files.images?.length || 0) + property.images.length <= 20 &&
      (files.documents?.length || 0) + property.documents.length <= 10,
    400,
    'INVALID_FILE',
    'Maximum 20 images and 10 documents'
  );
  ensure((files.images?.length || 0) + (files.documents?.length || 0) > 0, 400, 'INVALID_FILE');
  ensure(
    !files.images?.some((file) => file.mimetype === 'application/pdf'),
    400,
    'INVALID_FILE',
    'Property images must be image files'
  );
  const images = files.images?.length
    ? await saveFiles(files.images, user._id, { propertyId: id, private: false })
    : [];
  const documents = files.documents?.length
    ? await saveFiles(files.documents, user._id, { propertyId: id, private: false })
    : [];
  const filter = {
    _id: id,
    status: property.status,
    ...(user.role === 'BROKER' ? { brokerId: user._id } : {}),
  };
  const updated = await Property.findOneAndUpdate(
    filter,
    { $push: { images: { $each: images }, documents: { $each: documents } } },
    { new: true }
  );
  ensure(
    updated,
    409,
    'INVALID_TRANSITION',
    'Property status changed during upload. Please try again'
  );
  return updated;
}
