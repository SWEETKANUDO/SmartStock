
function allowRoles(...allowedRoles) {
  return function (req, res, next) {
    if (
      !req.membership ||
      !allowedRoles.includes(req.membership.role)
    ) {
      return res.status(403).json({
        message: "You do not have permission to perform this action",
      });
    }

    return next();
  };
}

module.exports = allowRoles;
