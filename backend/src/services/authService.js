const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../config/postgres");

const registerUser = async ({
  name,
  email,
  password,
  organizationMode,
  organizationName,
  invitationCode,
}) => {
  const normalizedName = String(name || "").trim();
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedName) {
    throw Object.assign(new Error("Name is required"), {
      statusCode: 400,
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw Object.assign(new Error("A valid email is required"), {
      statusCode: 400,
    });
  }

  if (
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 72
  ) {
    throw Object.assign(
      new Error("Password must be between 8 and 72 characters"),
      { statusCode: 400 }
    );
  }

  if (!["create", "join"].includes(organizationMode)) {
    throw Object.assign(new Error("Invalid organization option"), {
      statusCode: 400,
    });
  }

  if (
    organizationMode === "create" &&
    (typeof organizationName !== "string" ||
      organizationName.trim().length < 2 ||
      organizationName.trim().length > 150)
  ) {
    throw Object.assign(new Error("A valid organization name is required"), {
      statusCode: 400,
    });
  }

  let invitationCodeHash = null;

  if (organizationMode === "join") {
    const normalizedInvitationCode = String(invitationCode || "")
      .trim()
      .toUpperCase();

    if (!/^[A-Z0-9-]{10,40}$/.test(normalizedInvitationCode)) {
      throw Object.assign(new Error("A valid invitation code is required"), {
        statusCode: 400,
      });
    }

    invitationCodeHash = crypto
      .createHash("sha256")
      .update(normalizedInvitationCode)
      .digest("hex");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingUser = await client.query(
      "SELECT id FROM users WHERE email = $1 LIMIT 1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      throw Object.assign(new Error("Email is already registered"), {
        statusCode: 409,
      });
    }

    let organization;
    let role;

    if (organizationMode === "create") {
      const trimmedOrganizationName = organizationName.trim();

      const slugBase =
        trimmedOrganizationName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "organization";

      const slug = `${slugBase}-${crypto.randomUUID().slice(0, 8)}`;

      const organizationResult = await client.query(
        `INSERT INTO organizations (name, slug)
         VALUES ($1, $2)
         RETURNING id, name, slug`,
        [trimmedOrganizationName, slug]
      );

      organization = organizationResult.rows[0];
      role = "admin";
    } else {
      const organizationResult = await client.query(
        `SELECT id, name, slug
         FROM organizations
         WHERE join_code_hash = $1
           AND join_code_expires_at > NOW()
           AND is_active = TRUE
         LIMIT 1
         FOR UPDATE`,
        [invitationCodeHash]
      );

      if (organizationResult.rows.length === 0) {
        throw Object.assign(
          new Error("Invalid or expired invitation code"),
          { statusCode: 403 }
        );
      }

      organization = organizationResult.rows[0];
      role = "user";
    }

    const userResult = await client.query(
      `INSERT INTO users
         (name, email, password_hash, role, organization_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, organization_id,
                 department_id, is_active, created_at`,
      [
        normalizedName,
        normalizedEmail,
        passwordHash,
        role,
        organization.id,
      ]
    );

    await client.query("COMMIT");

    return {
      ...userResult.rows[0],
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505" && error.constraint === "users_email_key") {
      throw Object.assign(new Error("Email is already registered"), {
        statusCode: 409,
      });
    }

    throw error;
  } finally {
    client.release();
  }
};

const loginUser = async ({ email, password }) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail || typeof password !== "string" || !password) {
    throw Object.assign(new Error("Email and password are required"), {
      statusCode: 400,
    });
  }

  const result = await pool.query(
    `SELECT
       u.id,
       u.name,
       u.email,
       u.password_hash,
       u.role,
       u.organization_id,
       u.department_id,
       u.is_active,
       o.name AS organization_name
     FROM users u
     LEFT JOIN organizations o ON o.id = u.organization_id
     WHERE u.email = $1
     LIMIT 1`,
    [normalizedEmail]
  );

  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw Object.assign(new Error("Invalid email or password"), {
      statusCode: 401,
    });
  }

  if (!user.is_active) {
    throw Object.assign(new Error("This account is inactive"), {
      statusCode: 403,
    });
  }

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  const token = jwt.sign(
    {
      sub: user.id,
      role: user.role,
      organizationId: user.organization_id,
      departmentId: user.department_id,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      issuer: process.env.JWT_ISSUER || "securecloud",
      audience: process.env.JWT_AUDIENCE || "securecloud-users",
    }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organization_id,
      departmentId: user.department_id,
      organizationName: user.organization_name,
    },
  };
};

module.exports = {
  registerUser,
  loginUser,
};
