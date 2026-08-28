import db from '../config/db.js';

export const getProfile = async (req, res) => {
  try {
    const user = await db('users').where({ id: req.user.id }).first();
    delete user.password_hash;
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAddresses = async (req, res) => {
  try {
    const addresses = await db('addresses').where({ user_id: req.user.id });
    res.json(addresses);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const addAddress = async (req, res) => {
  const { address_line1, address_line2, city, state, postal_code, country, is_default } = req.body;

  try {
    if (is_default) {
      await db('addresses').where({ user_id: req.user.id }).update({ is_default: false });
    }

    const [address] = await db('addresses').insert({
      user_id: req.user.id,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country,
      is_default: is_default || false
    }).returning('*');

    res.status(201).json(address);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateAddress = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    if (updates.is_default) {
      await db('addresses').where({ user_id: req.user.id }).update({ is_default: false });
    }

    const [address] = await db('addresses')
      .where({ id, user_id: req.user.id })
      .update(updates)
      .returning('*');

    if (!address) return res.status(404).json({ message: 'Address not found' });
    res.json(address);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteAddress = async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await db('addresses').where({ id, user_id: req.user.id }).del();
    if (!deleted) return res.status(404).json({ message: 'Address not found' });
    res.json({ message: 'Address deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateProfile = async (req, res) => {
  const { first_name, last_name, phone_number, email, image_url } = req.body;
  const payload = {
    first_name,
    last_name,
    phone_number,
  };

  if (email) {
    payload.email = email;
  }

  if (image_url) {
    payload.image_url = image_url;
  }

  try {
    const [user] = await db('users')
      .where({ id: req.user.id })
      .update(payload)
      .returning('*');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    delete user.password_hash;
    res.json(user);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Email or phone number already in use' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};
