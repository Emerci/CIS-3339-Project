// This file contains API endpoints for interacting with the "events" collection in the MongoDB database
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Any logged-in user can read. Only editors can create, update, delete, register or deregister.
// The organization always comes from the JWT (req.user.orgId) through withOrg, never from the request.
const authMiddleWare = require('../auth/authMiddleWare');
const requireEditor = require('../auth/requireEditor');
const withOrg = require('../auth/withOrg');

const { events, clients } = require('../models/models');

// escape user input before it goes into a regular expression
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET all events for the org, newest first
router.get('/', authMiddleWare, async (req, res, next) => {
  try {
    res.json(await events.find(withOrg({}, req)).sort({ date: -1 }));
  } catch (err) {
    next(err);
  }
});

// GET single event by ID
router.get('/id/:id', authMiddleWare, async (req, res, next) => {
  try {
    const event = await events.findOne(withOrg({ _id: req.params.id }, req));
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (err) {
    next(err);
  }
});

// GET events based on search query. Ex: '...?name=Food&searchBy=name'
router.get('/search/', authMiddleWare, async (req, res, next) => {
  try {
    const dbQuery = withOrg({}, req);
    switch (req.query.searchBy) {
      case 'name':
        if (req.query.name) {
          dbQuery.name = { $regex: escapeRegex(req.query.name), $options: 'i' };
        }
        break;
      case 'date':
        if (req.query.eventDate) dbQuery.date = req.query.eventDate;
        break;
      default:
        return res.status(400).json({ error: 'Invalid searchBy' });
    }
    res.json(await events.find(dbQuery));
  } catch (err) {
    next(err);
  }
});

// GET events for which a client is signed up
router.get('/client/:id', authMiddleWare, async (req, res, next) => {
  try {
    res.json(await events.find(withOrg({ attendees: req.params.id }, req)));
  } catch (err) {
    next(err);
  }
});

// GET events for which a client is not signed up
router.get('/client/:id/not-registered', authMiddleWare, async (req, res, next) => {
  try {
    res.json(await events.find(withOrg({ attendees: { $nin: [req.params.id] } }, req)));
  } catch (err) {
    next(err);
  }
});

// GET attendee details for an event (event AND clients must belong to this org)
router.get('/attendees/:id', authMiddleWare, async (req, res, next) => {
  try {
    const event = await events.findOne(withOrg({ _id: req.params.id }, req));
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(await clients.find(withOrg({ _id: { $in: event.attendees } }, req, 'orgs')));
  } catch (err) {
    next(err);
  }
});

// GET all events for a given service
router.get('/service/:id', authMiddleWare, async (req, res, next) => {
  try {
    const eventsWithService = await events
      .find(withOrg({ services: { $in: [req.params.id] } }, req))
      .select({ _id: 1, name: 1, date: 1, address: { line1: 1 } })
      .lean();
    res.json(eventsWithService);
  } catch (err) {
    next(err);
  }
});

// POST new event (editor only)
router.post('/', authMiddleWare, requireEditor, async (req, res, next) => {
  try {
    // org comes from the token; attendees are only changed through register/deregister
    const { _id, org, attendees, ...body } = req.body;
    await events.create({ ...body, org: req.user.orgId });
    res.status(200).send('New event created successfully');
  } catch (err) {
    next(err);
  }
});

// PUT update event (editor only)
router.put('/update/:id', authMiddleWare, requireEditor, async (req, res, next) => {
  try {
    // the request can't change the id, the owning org, or the attendee list
    const { _id, org, attendees, ...updates } = req.body;
    const event = await events.findOneAndUpdate(
      withOrg({ _id: req.params.id }, req),
      updates,
      { new: true, runValidators: true }
    );
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.status(200).send('Event updated successfully');
  } catch (err) {
    next(err);
  }
});

// B1: PUT register a client for an event. Ex: '/register?event=<id>&client=<id>' (editor only)
router.put('/register', authMiddleWare, requireEditor, async (req, res, next) => {
  try {
    const { event: eventId, client: clientId } = req.query;
    if (!eventId || !clientId) {
      return res.status(400).json({ error: 'event and client are required' });
    }

    // both must exist AND belong to the logged-in user's org, otherwise 404
    const [eventExists, clientExists] = await Promise.all([
      events.exists(withOrg({ _id: eventId }, req)),
      clients.exists(withOrg({ _id: clientId }, req, 'orgs'))
    ]);
    if (!eventExists || !clientExists) {
      return res.status(404).json({ error: 'Client or event not found' });
    }

    // atomic: only matches if the client is NOT already an attendee, so no duplicates are possible
    const updated = await events.findOneAndUpdate(
      withOrg({ _id: eventId, attendees: { $ne: clientId } }, req),
      { $addToSet: { attendees: clientId } },
      { new: true }
    );
    if (!updated) return res.status(200).json({ message: 'Already registered' });
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});

// B1: PUT remove a client from an event. Ex: '/deregister?event=<id>&client=<id>' (editor only)
router.put('/deregister', authMiddleWare, requireEditor, async (req, res, next) => {
  try {
    const { event: eventId, client: clientId } = req.query;
    if (!eventId || !clientId) {
      return res.status(400).json({ error: 'event and client are required' });
    }

    const [eventExists, clientExists] = await Promise.all([
      events.exists(withOrg({ _id: eventId }, req)),
      clients.exists(withOrg({ _id: clientId }, req, 'orgs'))
    ]);
    if (!eventExists || !clientExists) {
      return res.status(404).json({ error: 'Client or event not found' });
    }

    // only matches if the client IS currently an attendee
    const updated = await events.findOneAndUpdate(
      withOrg({ _id: eventId, attendees: clientId }, req),
      { $pull: { attendees: clientId } },
      { new: true }
    );
    if (!updated) return res.status(200).json({ message: 'Not registered' });
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE event by ID (editor only), only if no clients are signed up
router.delete('/:id', authMiddleWare, requireEditor, async (req, res, next) => {
  try {
    const filter = withOrg({ _id: req.params.id }, req);
    const event = await events.findOne(filter);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.attendees.length > 0) {
      return res.status(400).json({ error: "Event has attendees and can't be deleted." });
    }
    await events.deleteOne(filter);
    res.status(200).send('Event deleted successfully');
  } catch (err) {
    next(err);
  }
});

// GET event attendance for the past two months for the dashboard
router.get('/attendance', authMiddleWare, async (req, res, next) => {
  try {
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    res.json(await events.find(withOrg({ date: { $gte: twoMonthsAgo } }, req)).sort({ date: 1 }));
  } catch (err) {
    next(err);
  }
});

module.exports = router;