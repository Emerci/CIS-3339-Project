const mongoose = require('mongoose');

// Merge the logged-in user's organization (from the JWT, never from the request) into a filter.
// Clients store orgs in an array field called "orgs"; events and services use "org".
module.exports = function withOrg(filter, req, field = 'org') {
  return { ...filter, [field]: new mongoose.Types.ObjectId(req.user.orgId) };
};