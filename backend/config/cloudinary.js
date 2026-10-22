const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;
const { dbPool } = require('./db');

const CLOUDINARY_FOLDER = 'unifind/items';
const CLOUDINARY_TIMEOUT_MS = 30 * 1000;

let configured = false;

const getCloudinaryConfig = () => ({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const assertCloudinaryConfigured = () => {
  const config = getCloudinaryConfig();
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    const error = new Error(`Cloudinary configuration is missing: ${missing.join(', ')}.`);
    error.statusCode = 503;
    throw error;
  }

  if (!configured) {
    cloudinary.config({ ...config, timeout: CLOUDINARY_TIMEOUT_MS });
    configured = true;
  }

  return cloudinary;
};

const ensureItemImageSchema = async () => {
  const [columnRows] = await dbPool.execute(
    `
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'items'
        AND COLUMN_NAME IN ('image', 'image_public_id')
    `,
    [process.env.DB_NAME]
  );

  const existingColumns = new Map(columnRows.map((row) => [row.COLUMN_NAME, row]));

  if (!existingColumns.has('image_public_id')) {
    await dbPool.execute(
      `
        ALTER TABLE items
        ADD COLUMN image_public_id VARCHAR(255) NULL AFTER image
      `
    );
  }

  const imageColumn = existingColumns.get('image');

  if (imageColumn && imageColumn.DATA_TYPE === 'varchar' && Number(imageColumn.CHARACTER_MAXIMUM_LENGTH || 0) < 512) {
    await dbPool.execute('ALTER TABLE items MODIFY COLUMN image TEXT NULL');
  }
};

const uploadImageBuffer = async (buffer, originalName = 'image') => {
  const client = assertCloudinaryConfigured();
  const publicId = `item-${crypto.randomUUID()}`;

  return new Promise((resolve, reject) => {
    const uploadStream = client.uploader.upload_stream(
      {
        folder: CLOUDINARY_FOLDER,
        public_id: publicId,
        resource_type: 'image',
        context: { original_name: String(originalName).slice(0, 200) },
      },
      (error, result) => {
        if (error) {
          const uploadError = new Error('Image upload failed. Please try again.');
          uploadError.statusCode = 502;
          uploadError.cause = error;
          reject(uploadError);
          return;
        }

        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    uploadStream.on('error', (error) => {
      const uploadError = new Error('Image upload failed. Please try again.');
      uploadError.statusCode = 502;
      uploadError.cause = error;
      reject(uploadError);
    });

    uploadStream.end(buffer);
  });
};

const deleteCloudinaryImage = async (publicId) => {
  if (!publicId) {
    return null;
  }

  const client = assertCloudinaryConfigured();
  return client.uploader.destroy(publicId, {
    resource_type: 'image',
    type: 'upload',
    invalidate: true,
  });
};

module.exports = {
  CLOUDINARY_FOLDER,
  assertCloudinaryConfigured,
  ensureItemImageSchema,
  uploadImageBuffer,
  deleteCloudinaryImage,
};
