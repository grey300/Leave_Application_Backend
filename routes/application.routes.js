const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const ctrl = require("../controllers/application.controller");

router.post("/", auth, ctrl.createApplication);
router.get("/my", auth, ctrl.getMyApplications);
router.get("/", auth, role("admin"), ctrl.getAllApplications);
router.put("/:id", auth, role("admin"), ctrl.updateStatus);

module.exports = router;
