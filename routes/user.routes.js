const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const ctrl = require("../controllers/user.controller");

router.get("/", auth, role("admin"), ctrl.getAllUsers);

module.exports = router;
