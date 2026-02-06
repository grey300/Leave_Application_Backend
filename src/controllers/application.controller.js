const Application = require("../models/Application");
const User = require("../models/User");
const { createTransporter } = require("../config/mail");

const buildFrom = () => {
  const name = process.env.SMTP_FROM_NAME || "No Reply";
  const email = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  return email ? `"${name}" <${email}>` : undefined;
};

const sendMailSafe = async (message) => {
  try {
    const transporter = createTransporter();
    await transporter.sendMail(message);
  } catch (error) {
    if (error.code !== "SMTP_CONFIG_MISSING") {
      throw error;
    }
  }
};

exports.createApplication = async (req, res) => {
  const app = await Application.create({ ...req.body, user: req.user.id });

  const [admins, applicant] = await Promise.all([
    User.find({ role: "admin" }).select("email name"),
    User.findById(req.user.id).select("name email")
  ]);
  const adminEmails = admins.map((admin) => admin.email).filter(Boolean);

  if (adminEmails.length) {
    await sendMailSafe({
      to: adminEmails,
      from: buildFrom(),
      subject: "New application submitted",
      html: `<p>A new application has been submitted.</p>
        <p>Subject: ${app.subject || "(no subject)"}</p>
        <p>Reason: ${app.reason || "(no reason provided)"}</p>
        <p>Applicant: ${applicant?.name || "(unknown)"}</p>
        <p>Applicant Email: ${applicant?.email || "(unknown)"}</p>`
    });
  }

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

exports.getStatusCounts = async (req, res) => {
  const [pending, approved, rejected] = await Promise.all([
    Application.countDocuments({ status: "pending" }),
    Application.countDocuments({ status: "approved" }),
    Application.countDocuments({ status: "rejected" })
  ]);

  res.json({ pending, approved, rejected });
};

exports.getUsersOnLeaveCount = async (req, res) => {
  const now = new Date();
  const totalUsersOnLeave = await Application.distinct("user", {
    status: "approved",
    startDate: { $lte: now },
    endDate: { $gte: now }
  });

  res.json({ totalUsersOnLeave: totalUsersOnLeave.length });
};

exports.updateStatus = async (req, res) => {
  const app = await Application.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  ).populate("user", "email name");

  if (!app) return res.status(404).json({ message: "Application not found" });

  if (["approved", "rejected"].includes(app.status) && app.user?.email) {
    await sendMailSafe({
      to: app.user.email,
      from: buildFrom(),
      subject: `Your application was ${app.status}`,
      html: `<p>Hello ${app.user.name || ""},</p>
        <p>Your application${app.subject ? ` (${app.subject})` : ""} was ${app.status}.</p>
        <p>Reason: ${app.reason || "(no reason provided)"}</p>`
    });
  }

  res.json(app);
};
