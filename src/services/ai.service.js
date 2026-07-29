const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function generateResponse(content) {
  const response = await ai.models.generateContent({
    model: 'gemini-flash-latest',
    contents: content,
  });

  return response.text;
}

module.exports = {
  generateResponse,
};
