const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const ctrl = require("../controllers/user.controller");

router.get("/", auth, role("admin"), ctrl.getAllUsers);
router.get("/count", auth, role("admin"), ctrl.getUserCount);
router.get("/me", auth, ctrl.getMe);
router.put("/me", auth, ctrl.updateMe);
router.put("/me/password", auth, ctrl.changePassword);

module.exports = router;
