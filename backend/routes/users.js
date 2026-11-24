// This file contains all API endpoints for interacting with the "users" collection in the MongoDB database
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { users } = require('../models/models');

// the org this backend instance is configured for decides whose users can log in
const org = process.env.ORG_ID;

// API endpoint to handle login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const user = await users.findOne({ username: username, org: org });
    // same message whether the username or the password is wrong
    const isMatch = user ? await bcrypt.compare(password, user.password) : false;
    if (!user || !isMatch) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    // orgId is what every other route uses (through withOrg) to scope its queries
    const payload = {
      userId: String(user._id),
      name: user.username,
      role: user.role,
      orgId: String(user.org)
    };

    // token expires in 30 days
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token });
  } catch (err) {
    next(err);
  }
});

module.exports = router;