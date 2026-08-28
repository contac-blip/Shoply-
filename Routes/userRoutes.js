import express from 'express';
import { getProfile, updateProfile, getAddresses, addAddress, updateAddress, deleteAddress } from '../Controllers/userController.js';
import { auth } from '../Auth/auth.js';

const router = express.Router();

router.use(auth);

router.get('/me', getProfile);
router.put('/me', updateProfile);
router.get('/me/addresses', getAddresses);
router.post('/me/addresses', addAddress);
router.put('/me/addresses/:id', updateAddress);
router.delete('/me/addresses/:id', deleteAddress);

export default router;
