const { GoogleGenAI } = require('@google/genai');
const { HELPER_SYSTEM_INSTRUCTION } = require('./prompts/helper.system');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function generateResponse(content) {
  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: content,
    config: {
      temperature: 0.7 /* 0 <= n => 2 , low value means more predictive answers... , high values gives answers soo creative but chances of wrong reposnes too */,
      systemInstruction: HELPER_SYSTEM_INSTRUCTION,
    },
  });

  return response.text;
}

async function generateVector(content) {
  if (!content || typeof content !== 'string') {
    throw new Error('Content for embedding must be a non-empty string');
  }

  const response = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: content,
    config: {
      outputDimensionality: 768,
    },
  });

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
