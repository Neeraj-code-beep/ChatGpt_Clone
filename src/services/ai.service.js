const { GoogleGenAI } = require('@google/genai');
const { HELPER_SYSTEM_INSTRUCTION } = require('./prompts/helper.system');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const AI_TIMEOUT_MS = 45 * 1000; // 45s bounded timeout for Gemini API calls

function withTimeout(promise, timeoutMs, operationName) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

async function generateResponse(content) {
  const response = await withTimeout(
    ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: content,
      config: {
        temperature: 0.7,
        systemInstruction: HELPER_SYSTEM_INSTRUCTION,
      },
    }),
    AI_TIMEOUT_MS,
    'Gemini response generation',
  );

  return response.text;
}

async function generateVector(content) {
  if (!content || typeof content !== 'string') {
    throw new Error('Content for embedding must be a non-empty string');
  }

  const response = await withTimeout(
    ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: content,
      config: {
        outputDimensionality: 768,
      },
    }),
    AI_TIMEOUT_MS,
    'Gemini embedding generation',
  );

  const vector = response.embeddings?.[0]?.values;

  if (!Array.isArray(vector)) {
    throw new Error('Gemini did not return a valid embedding');
  }

  if (vector.length !== 768) {
    throw new Error(`Invalid embedding dimension: ${vector.length}`);
  }

  if (!vector.every(Number.isFinite)) {
    throw new Error('Embedding contains invalid numbers');
  }

  return vector;
}

module.exports = {
  generateResponse,
  generateVector,
};
