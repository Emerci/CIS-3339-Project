// Authorization middleware. Checks that API calls carry a valid JWT, and puts the decoded user on req.user.

const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const header = req.header('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // tokens issued before orgId was added to the login payload are rejected: log in again
    if (!decoded.orgId || !decoded.role) {
      return res.status(401).json({ error: 'Token is outdated, please log in again' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};