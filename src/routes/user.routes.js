const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const ctrl = require("../controllers/user.controller");

router.get("/", auth, role("admin"), ctrl.getAllUsers);
router.get("/me", auth, ctrl.getMe);
router.put("/me", auth, ctrl.updateMe);

module.exports = router;
