const User = require("../models/User");

const pickUpdateFields = (body) => {
  const updates = {};
  if (body.name) updates.name = body.name;
  if (body.email) updates.email = body.email;
  return updates;
};

exports.getAllUsers = async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
};

exports.getMe = async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
};

exports.updateMe = async (req, res) => {
  const updates = pickUpdateFields(req.body);
  if (!Object.keys(updates).length)
    return res.status(400).json({ message: "No fields to update" });

  const user = await User.findByIdAndUpdate(req.user.id, updates, {
    new: true,
    runValidators: true
  }).select("-password");

  res.json(user);
};
