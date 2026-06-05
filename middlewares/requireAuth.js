import { getAuthSession } from "../config/auth.js";

const requireAuth = async (req, res, next) => {
  try {
    const session = await getAuthSession(req.headers);

    if (!session?.user) {
      return res.status(401).json({ error: "Unauthorized. Please log in." });
    }

    // Attach to req so controllers can use it without re-fetching
    req.authUser = session.user;
    req.authSession = session.session;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(401).json({ error: "Invalid or expired session." });
  }
};

export default requireAuth;