const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: "Please login first."
    });
  }

  next();
};

const requirePageAuth = (req, res, next) => {
  if (!req.session.user) {
    req.session.returnTo = req.originalUrl;
    req.flash("error", "Please login first.");
    return res.redirect("/login");
  }

  next();
};

module.exports = {
  requireAuth,
  requirePageAuth
};