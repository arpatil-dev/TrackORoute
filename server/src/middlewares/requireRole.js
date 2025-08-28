// Middleware for role-based access
const requireRole = (role) => (req, res, next) => {
  /* Check if user is authenticated and has the required role */
  if (!req.user || req.user.role !== role) {
    return res.status(403).json({ status: 403, message: `Requires ${role} role`, data: null });
  }
  next();
};

export default requireRole;
