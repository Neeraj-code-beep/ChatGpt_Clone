const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function generateResponse(content) {
  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: content,
    config: {
      temperature: 0.7 /* 0 <= n => 2 , low value means more predictive answers... , high values gives answers soo creative but chances of wrong reposnes too */,
    },
  });

  return response.text;
}

async function generateVector(content) {
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: content,
    config: {
      outputDimensionality: 768,
    },
  });

  console.log(response);

  return response.embeddings[0].values;
}

module.exports = {
  generateResponse,
  generateVector,
};
