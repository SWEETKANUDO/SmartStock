const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { z } = require("zod");

const User = require("../models/User");
const Business = require("../models/Business");
const Membership = require("../models/Membership");

const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
  businessName: z.string().trim().min(2).max(120),
});

async function signup(req, res, next) {
  try {
    const parsed = signupSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Please check your input",
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { name, email, password, businessName } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    let user;
    let business;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        [user] = await User.create(
          [{ name, email: normalizedEmail, passwordHash }],
          { session },
        );

        const slug =
          businessName
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "") +
          "-" +
          user._id.toString().slice(-6);

        [business] = await Business.create(
          [{ name: businessName, slug, ownerId: user._id }],
          { session },
        );

        await Membership.create(
          [
            {
              userId: user._id,
              businessId: business._id,
              role: "owner",
              status: "active",
            },
          ],
          { session },
        );
      });
    } finally {
      await session.endSession();
    }

    const token = jwt.sign(
      {
        sub: user._id.toString(),
        businessId: business._id.toString(),
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "1h" },
    );

    return res.status(201).json({
      message: "Account created successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      business: {
        id: business._id,
        name: business.name,
        slug: business.slug,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const loginSchema = z.object({
      email: z.string().trim().email().max(254),
      password: z.string().min(1).max(128),
    });

    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Please enter a valid email and password",
      });
    }

    const { email, password } = parsed.data;

    const user = await User.findOne({
      email: email.toLowerCase(),
    }).select("+passwordHash");

    if (!user || user.status !== "active") {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const membership = await Membership.findOne({
      userId: user._id,
      status: "active",
      role: "owner",
    });

    if (!membership) {
      return res.status(403).json({
        message: "No active business membership found",
      });
    }

    const business = await Business.findOne({
      _id: membership.businessId,
      status: "active",
    });

    if (!business) {
      return res.status(403).json({
        message: "Business is not active",
      });
    }

    const token = jwt.sign(
      {
        sub: user._id.toString(),
        businessId: business._id.toString(),
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "1h" },
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      business: {
        id: business._id,
        name: business.name,
        slug: business.slug,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.userId).select("name email status");

    if (!user || user.status !== "active") {
      return res.status(401).json({
        message: "User not found or inactive",
      });
    }

    const business = await Business.findById(req.businessId).select(
      "name slug status",
    );

    if (!business || business.status !== "active") {
      return res.status(403).json({
        message: "Business is not active",
      });
    }

    const membership = await Membership.findOne({
      userId: user._id,
      businessId: business._id,
      status: "active",
    }).select("role");

    if (!membership) {
      return res.status(403).json({
        message: "Active membership not found",
      });
    }

    return res.status(200).json({
      message: "Authentication successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: membership.role,
        business: {
          id: business._id,
          name: business.name,
          slug: business.slug,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

function getBusiness(req, res) {
  return res.status(200).json({
    message: "Business access verified",
    business: {
      id: req.business._id,
      name: req.business.name,
      slug: req.business.slug,
    },
    role: req.membership.role,
  });
}

module.exports = { signup, login, getMe, getBusiness };
