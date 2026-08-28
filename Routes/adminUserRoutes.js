import express from 'express';
import db from '../config/db.js';
import { auth, authorize, normalizeRole } from '../Auth/auth.js';

const router = express.Router();
router.use(auth);
router.use(authorize('admin'));

router.get('/', async (req, res) => {
  try {
    const users = await db('users')
      .select('id', 'email', 'first_name', 'last_name', 'phone_number', 'role', 'email_verified_at', 'deleted_at', 'created_at')
      .orderBy('created_at', 'desc');
    return res.json(users);
  } catch (error) {
    console.error('Failed to load admin users:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:userId/role', async (req, res) => {
  const role = normalizeRole(req.body?.role);
  if (!['customer', 'merchant'].includes(role)) return res.status(400).json({ message: 'Role must be customer or merchant' });
  try {
    const [user] = await db('users').where({ id: req.params.userId }).update({ role, updated_at: db.fn.now() }).returning(['id', 'email', 'role']);
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ user });
  } catch (error) {
    console.error('Failed to update user role:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:userId/status', async (req, res) => {
  try {
    const [user] = await db('users').where({ id: req.params.userId }).update({ deleted_at: req.body?.deleted === true ? db.fn.now() : null, updated_at: db.fn.now() }).returning(['id', 'email', 'deleted_at']);
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ user });
  } catch (error) {
    console.error('Failed to update user status:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
