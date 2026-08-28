import express from 'express';
import { uploadImage } from '../Controllers/mediaController.js';
import { auth } from '../Auth/auth.js';
import { upload } from '../upload.js';

const router = express.Router();

router.post('/upload', auth, upload.single('image'), uploadImage);

export default router;
