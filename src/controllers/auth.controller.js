const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createTransporter } = require("../config/mail");

const cloudinary = require("../config/cloudinary");

const MAX_PROFILE_PIC_BYTES = 5 * 1024 * 1024;

exports.signup = async (req, res) => {
  const { name, email, password, profilePic, profilePicContentType } = req.body;
  const hash = await bcrypt.hash(password, 10);

  let profilePicUrl;
  if (profilePic) {
    const profilePicBuffer = Buffer.from(profilePic, "base64");
    if (profilePicBuffer.length > MAX_PROFILE_PIC_BYTES) {
      return res.status(400).json({ message: "Profile picture must be 5MB or smaller" });
    }

    const uploadResult = await cloudinary.uploader.upload(
      `data:${profilePicContentType || "image/jpeg"};base64,${profilePic}`,
      { folder: "profile-pictures" }
    );

    profilePicUrl = uploadResult.secure_url;
  }

  const user = await User.create({
    name,
    email,
    password: hash,
    ...(profilePicUrl ? { profilePicUrl } : {})
  });

  const response = user.toObject();
  delete response.password;
  res.json(response);
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET
  );

  const isProd = process.env.NODE_ENV === "production";

  res.cookie("token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 1000 * 60 * 60 * 24
  });

  res.json({ user });
};

exports.logout = async (req, res) => {
  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax"
  });

  res.json({ message: "Logged out" });
};

exports.forgotPassword = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.json({ message: "Email sent if exists" });

  const rawToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "15m" });
  const tokenHash = await bcrypt.hash(rawToken, 10);

  user.resetTokenHash = tokenHash;
  user.resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await user.save();

  const transporter = createTransporter();

  await transporter.sendMail({
    to: user.email,
    subject: "Reset Password",
    html: `<a href="${process.env.CLIENT_URL}/reset/${rawToken}">Reset Password</a>`
  });

  res.json({ message: "Reset link sent" });
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password)
    return res.status(400).json({ message: "Token and password required" });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }

  const user = await User.findById(payload.id);
  if (!user || !user.resetTokenHash || !user.resetTokenExpiresAt)
    return res.status(400).json({ message: "Invalid or expired token" });

  if (user.resetTokenExpiresAt.getTime() < Date.now())
    return res.status(400).json({ message: "Invalid or expired token" });

  const isMatch = await bcrypt.compare(token, user.resetTokenHash);
  if (!isMatch) return res.status(400).json({ message: "Invalid or expired token" });

  const hash = await bcrypt.hash(password, 10);
  user.password = hash;
  user.resetTokenHash = undefined;
  user.resetTokenExpiresAt = undefined;
  await user.save();

  res.json({ message: "Password updated" });
};
