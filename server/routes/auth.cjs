const { Router } = require("express");
const { ADMIN_TOKEN } = require("../middleware.cjs");

const router = Router();

router.post("/admin/auth", (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password required" });
  if (password === ADMIN_TOKEN) {
    res.json({ token: ADMIN_TOKEN });
  } else {
    res.status(401).json({ error: "Incorrect password" });
  }
});

module.exports = router;
