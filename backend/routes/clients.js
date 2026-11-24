// API endpoints for the "clients" collection
const express = require('express');
const router = express.Router();

const authMiddleWare = require('../auth/authMiddleWare');
// Only editors can create, update or delete (viewers get 403)
const requireEditor = require('../auth/requireEditor');
// Merges the logged-in user's org (from the JWT) into a query filter
const withOrg = require('../auth/withOrg');

const { clients, events } = require('../models/models');

// clients keep their organizations in an array field called "orgs"
const ORG_FIELD = 'orgs';

// escape user input before it goes into a regular expression
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET all clients for the org
router.get('/', authMiddleWare, async (req, res, next) => {
  try {
    res.json(await clients.find(withOrg({}, req, ORG_FIELD)));
  } catch (err) {
    next(err);
  }
});

// GET single client by ID
router.get('/id/:id', authMiddleWare, async (req, res, next) => {
  try {
    const client = await clients.findOne(withOrg({ _id: req.params.id }, req, ORG_FIELD));
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (err) {
    next(err);
  }
});

// GET clients based on search query. Ex: '...?firstName=Bob&lastName=&searchBy=name'
router.get('/search', authMiddleWare, async (req, res, next) => {
  try {
    const conditions = [];
    switch (req.query.searchBy) {
      case 'name':
        if (req.query.firstName) {
          conditions.push({ firstName: { $regex: escapeRegex(req.query.firstName), $options: 'i' } });
        }
        if (req.query.lastName) {
          conditions.push({ lastName: { $regex: escapeRegex(req.query.lastName), $options: 'i' } });
        }
        break;
      case 'number':
        if (req.query.phoneNumber) {
          conditions.push({ 'phoneNumber.primary': { $regex: escapeRegex(req.query.phoneNumber), $options: 'i' } });
        }
        break;
      default:
        return res.status(400).json({ error: 'Invalid searchBy' });
    }

    const filter = withOrg({}, req, ORG_FIELD);
    if (conditions.length) filter.$and = conditions; // an empty $and makes MongoDB throw
    res.json(await clients.find(filter));
  } catch (err) {
    next(err);
  }
});

// POST create new client (editor only). The org always comes from the token.
router.post('/', authMiddleWare, requireEditor, async (req, res, next) => {
  try {
    const { _id, orgs, ...body } = req.body;
    await clients.create({ ...body, orgs: [req.user.orgId] });
    res.status(200).send('New client created successfully');
  } catch (err) {
    next(err);
  }
});

// PUT update client (editor only)
router.put('/update/:id', authMiddleWare, requireEditor, async (req, res, next) => {
  try {
    // the request can't change the id or the owning org
    const { _id, orgs, ...updates } = req.body;
    const client = await clients.findOneAndUpdate(
      withOrg({ _id: req.params.id }, req, ORG_FIELD),
      updates,
      { new: true, runValidators: true }
    );
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.status(201).send('Client updated successfully');
  } catch (err) {
    next(err);
  }
});

// DELETE client (editor only), only if the client is not signed up for events
router.delete('/:id', authMiddleWare, requireEditor, async (req, res, next) => {
  try {
    const filter = withOrg({ _id: req.params.id }, req, ORG_FIELD);
    const client = await clients.findOne(filter);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const signedUp = await events.countDocuments(withOrg({ attendees: req.params.id }, req));
    if (signedUp > 0) {
      return res.status(406).json({ error: "Client is signed up for events and can't be deleted." });
    }

    await clients.deleteOne(filter);
    res.status(200).send('Client deleted successfully');
  } catch (err) {
    next(err);
  }
});

// GET clients by zip code for the dashboard (this org only)
router.get('/byzip', authMiddleWare, async (req, res, next) => {
  try {
    const data = await clients.aggregate([
      // withOrg builds a real ObjectId, which aggregate() needs (it doesn't cast strings)
      { $match: withOrg({ 'address.zip': { $exists: true, $ne: '' } }, req, ORG_FIELD) },
      { $group: { _id: '$address.zip', count: { $sum: 1 } } }
    ]);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;