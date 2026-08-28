import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import logger from './logger.js';

export const optimizeImage = async (req, res, next) => {
  if (!req.file) return next();

  const { filename, path: filePath } = req.file;
  const outputFilename = `opt-${filename.split('.')[0]}.webp`;
  const outputPath = path.join(path.dirname(filePath), outputFilename);

  try {
    await sharp(filePath)
      .resize(800) // Max width 800px
      .webp({ quality: 80 })
      .toFile(outputPath);

    // Remove original file
    fs.unlinkSync(filePath);

    // Update req.file with new optimized file info
    req.file.filename = outputFilename;
    req.file.path = outputPath;
    req.file.mimetype = 'image/webp';

    next();
  } catch (err) {
    logger.error('Image optimization failed:', err);
    next(); // Continue even if optimization fails
  }
};
