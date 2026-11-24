// This file contains API endpoints for interacting with the "services" collection of the MongoDB database
const express = require('express');
const router = express.Router();

const { services, events } = require('../models/models');

const authMiddleWare = require('../auth/authMiddleWare');
// Only editors can create, update or delete (viewers get 403)
const requireEditor = require('../auth/requireEditor');
// Merges the logged-in user's org (from the JWT) into a query filter
const withOrg = require('../auth/withOrg');

// escape user input before it goes into a regular expression
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET all services for the org
router.get('/', authMiddleWare, async (req, res, next) => {
  try {
    res.json(await services.find(withOrg({}, req)).sort({ updatedAt: -1 }));
  } catch (err) {
    next(err);
  }
});

// GET single service by ID
router.get('/id/:id', authMiddleWare, async (req, res, next) => {
  try {
    const service = await services.findOne(withOrg({ _id: req.params.id }, req));
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json(service);
  } catch (err) {
    next(err);
  }
});

// GET services based on search query
router.get('/search', authMiddleWare, async (req, res, next) => {
  try {
    const dbQuery = withOrg({}, req);
    switch (req.query.searchBy) {
      case 'name':
        if (req.query.name) dbQuery.name = { $regex: escapeRegex(req.query.name), $options: 'i' };
        break;
      case 'description':
        if (req.query.description) {
          dbQuery.description = { $regex: escapeRegex(req.query.description), $options: 'i' };
        }
        break;
      default:
        return res.status(400).json({ error: 'Invalid searchBy' });
    }
    res.json(await services.find(dbQuery));
  } catch (err) {
    next(err);
  }
});

// POST new service (editor only). The org always comes from the token.
router.post('/', authMiddleWare, requireEditor, async (req, res, next) => {
  try {
    const { _id, org, ...body } = req.body;
    await services.create({ ...body, org: req.user.orgId });
    res.status(200).send('New service created successfully');
  } catch (err) {
    next(err);
  }
});

// PUT update service (editor only)
router.put('/update/:id', authMiddleWare, requireEditor, async (req, res, next) => {
  try {
    // the request can't change the id or the owning org
    const { _id, org, ...updates } = req.body;
    const service = await services.findOneAndUpdate(
      withOrg({ _id: req.params.id }, req),
      updates,
      { new: true, runValidators: true }
    );
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.status(201).send('Service updated successfully');
  } catch (err) {
    next(err);
  }
});

// DELETE service by ID (editor only), only if no events are using it
router.delete('/:id', authMiddleWare, requireEditor, async (req, res, next) => {
  try {
    const filter = withOrg({ _id: req.params.id }, req);
    const service = await services.findOne(filter);
    if (!service) return res.status(404).json({ error: 'Service not found' });

    const inUse = await events.countDocuments(withOrg({ services: req.params.id }, req));
    if (inUse > 0) {
      return res.status(400).json({ error: 'Service can not be deleted since it is being used by events.' });
    }

    await services.deleteOne(filter);
    res.status(200).send('Service deleted successfully');
  } catch (err) {
    next(err);
  }
});

module.exports = router;