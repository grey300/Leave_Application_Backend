const User = require("../models/User");
const bcrypt = require("bcryptjs");
const cloudinary = require("../config/cloudinary");

const pickUpdateFields = async (body) => {
  const updates = {};
  if (body.name) updates.name = body.name;
  if (body.email) updates.email = body.email;
  if (body.profilePic) {
    const profilePicBuffer = Buffer.from(body.profilePic, "base64");
    if (profilePicBuffer.length > MAX_PROFILE_PIC_BYTES) {
      throw Object.assign(new Error("Profile picture must be 5MB or smaller"), {
        statusCode: 400
      });
    }

    const uploadResult = await cloudinary.uploader.upload(
      `data:${body.profilePicContentType || "image/jpeg"};base64,${body.profilePic}`,
      { folder: "profile-pictures" }
    );

    updates.profilePicUrl = uploadResult.secure_url;
  }
  return updates;
};

const MAX_PROFILE_PIC_BYTES = 5 * 1024 * 1024;

const mapUserWithProfilePic = (user) => user.toObject();

exports.getAllUsers = async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users.map(mapUserWithProfilePic));
};

exports.getUserCount = async (req, res) => {
  const totalUsers = await User.countDocuments();
  res.json({ totalUsers });
};

exports.getMe = async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  if (!user) return res.status(404).json({ message: "User not found" });

  const response = user.toObject();
  if (response.profilePic?.data) {
    response.profilePic = {
      contentType: response.profilePic.contentType,
      data: response.profilePic.data.toString("base64")
    };
  }

  res.json(response);
};

exports.updateMe = async (req, res) => {
  try {
    const updates = await pickUpdateFields(req.body);
    if (!Object.keys(updates).length)
      return res.status(400).json({ message: "No fields to update" });

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true
    }).select("-password");

    res.json(mapUserWithProfilePic(user));
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ message: error.message });
    }
    throw error;
  }
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ message: "Current and new password required" });

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) return res.status(400).json({ message: "Current password incorrect" });

  if (currentPassword === newPassword)
    return res.status(400).json({ message: "New password must be different" });

  const hash = await bcrypt.hash(newPassword, 10);
  user.password = hash;
  await user.save();

  res.json({ message: "Password updated" });
};
