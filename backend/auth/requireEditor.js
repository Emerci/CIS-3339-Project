// Role check middleware. Use it AFTER authMiddleWare (which puts the logged-in user on req.user).
// Only users with the "editor" role can continue; viewers get 403 Forbidden.
module.exports = function requireEditor(req, res, next) {
  if (!req.user || req.user.role !== 'editor') {
    return res
      .status(403)
      .json({ message: 'Forbidden: editor role required' });
  }
  next();
};
