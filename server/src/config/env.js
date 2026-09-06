require('dotenv').config();

const REQUIRED_ENV_VARS = [
  'MONGODB_URL',
  'JWT_SECRET',
  'GEMINI_API_KEY',
  'PINECONE_API_KEY',
];

function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    const errorMsg = `[FATAL] Missing required environment variable(s): ${missing.join(', ')}. Please check your .env file or environment settings.`;
    console.error(errorMsg);
    if (process.env.NODE_ENV === 'production') {
      throw new Error(errorMsg);
    }
  }

  return {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    mongoUri: process.env.MONGODB_URL,
    jwtSecret: process.env.JWT_SECRET,
    geminiApiKey: process.env.GEMINI_API_KEY,
    pineconeApiKey: process.env.PINECONE_API_KEY,
    clientOrigin: process.env.CLIENT_ORIGIN || true,
  };
}

module.exports = {
  validateEnv,
};
