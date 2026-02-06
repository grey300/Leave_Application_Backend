const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  resetTokenHash: { type: String },
  resetTokenExpiresAt: { type: Date },
  profilePicUrl: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
