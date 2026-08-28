import multer from 'multer';
import path from 'path';
import supabase from './config/supabase.js';
import logger from './logger.js';

// Custom storage for Supabase
class SupabaseStorage {
  constructor(bucket) {
    this.bucket = bucket;
  }

  _handleFile(req, file, cb) {
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    const filePath = `uploads/${filename}`;

    const chunks = [];
    file.on('data', chunk => chunks.push(chunk));
    file.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);
        const { data, error } = await supabase.storage
          .from(this.bucket)
          .upload(filePath, buffer, { contentType: file.mimetype });

        if (error) {
          logger.error('Supabase upload error:', error);
          return cb(error);
        }

        const { data: publicUrl } = supabase.storage
          .from(this.bucket)
          .getPublicUrl(filePath);

        cb(null, {
          filename: filename,
          path: publicUrl.publicUrl,
          supabasePath: filePath
        });
      } catch (err) {
        logger.error('File upload to Supabase failed:', err);
        cb(err);
      }
    });
    file.on('error', cb);
  }

  _removeFile(req, file, cb) {
    if (file.supabasePath) {
      supabase.storage
        .from(this.bucket)
        .remove([file.supabasePath])
        .then(() => cb(null))
        .catch(cb);
    } else {
      cb(null);
    }
  }
}

const storage = new SupabaseStorage('gocart-uploads');

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed'), false);
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});
