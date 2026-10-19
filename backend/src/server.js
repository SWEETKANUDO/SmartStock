require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

function validateEnvironment(env = process.env) {
  const secret = env.JWT_ACCESS_SECRET?.trim();
  if (
    !secret ||
    secret === "replace_with_a_long_random_secret" ||
    (env.NODE_ENV === "production" && secret.length < 32)
  ) {
    throw new Error(
      "JWT_ACCESS_SECRET must be configured with at least 32 characters in production",
    );
  }

  if (env.NODE_ENV === "production") {
    if (!env.FRONTEND_URL) {
      throw new Error("FRONTEND_URL must be configured in production");
    }

    let frontendUrl;
    try {
      frontendUrl = new URL(env.FRONTEND_URL);
    } catch {
      throw new Error("FRONTEND_URL must be a valid HTTPS origin in production");
    }
    if (frontendUrl.protocol !== "https:" || frontendUrl.origin !== env.FRONTEND_URL) {
      throw new Error("FRONTEND_URL must be a valid HTTPS origin in production");
    }
  }
}

async function startServer() {
  try {
    validateEnvironment();
    await connectDB();

    app.listen(PORT, () => {
      console.log(`SmartStock API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer, validateEnvironment };
