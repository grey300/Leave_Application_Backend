const Application = require("../models/Application");

exports.createApplication = async (req, res) => {
  const app = await Application.create({ ...req.body, user: req.user.id });
  res.json(app);
};

exports.getMyApplications = async (req, res) => {
  const apps = await Application.find({ user: req.user.id });
  res.json(apps);
};

exports.getAllApplications = async (req, res) => {
  const apps = await Application.find().populate("user");
  res.json(apps);
};

exports.updateStatus = async (req, res) => {
  const app = await Application.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  );
  res.json(app);
};
