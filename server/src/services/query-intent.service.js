require('dotenv').config();

const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const VALID_MEMORY_TYPES = [
  'fact',
  'preference',
  'goal',
  'project',
  'decision',
  'skill',
  'context',
];

async function classifyQueryIntent(query) {
  if (!query || typeof query !== 'string') {
    throw new Error('Query must be a non-empty string');
  }

  const prompt = `
You are the query intent classifier for an AI assistant called Helper.

Analyze the user's query and determine what type of long-term memory
would be most useful for answering it.

USER QUERY:
${query}

Possible memory types:

- fact
- preference
- goal
- project
- decision
- skill
- context

You may return multiple relevant types.

Examples:

"What technologies am I currently using?"
=> ["project", "decision"]

"What am I learning?"
=> ["skill"]

"What are my goals?"
=> ["goal"]

"What do I prefer?"
=> ["preference"]

"Tell me about my current project."
=> ["project"]

"What did I decide about the database?"
=> ["decision"]

"What do you know about me?"
=> ["fact", "context"]

Return ONLY valid JSON.

Exact format:

{
  "types": ["project", "decision"],
  "confidence": 0.95
}

Rules:

- types must contain only valid memory types.
- confidence must be between 0 and 1.
- Never invent information.
- Use the user's query only.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: prompt,
    config: {
      temperature: 0,
      responseMimeType: 'application/json',
    },
  });

  try {
    const result = JSON.parse(response.text);

    if (!validateQueryIntent(result)) {
      console.error('Invalid query intent:', result);

      return {
        types: [],
        confidence: 0,
      };
    }

    return result;
  } catch (error) {
    console.error('Query intent JSON error:', error);

    return {
      types: [],
      confidence: 0,
    };
  }
}

function validateQueryIntent(result) {
  if (!result || typeof result !== 'object') {
    return false;
  }

  if (!Array.isArray(result.types)) {
    return false;
  }

  if (
    typeof result.confidence !== 'number' ||
    result.confidence < 0 ||
    result.confidence > 1
  ) {
    return false;
  }

  return result.types.every((type) => VALID_MEMORY_TYPES.includes(type));
}

module.exports = {
  classifyQueryIntent,
  validateQueryIntent,
};

async function testQueryIntent() {
  const queries = [
    'What technologies am I currently using for my project?',
    'What am I learning right now?',
    'What are my goals?',
    'What programming language do I prefer for DSA?',
    'What did I decide about my database?',
  ];

  for (const query of queries) {
    const result = await classifyQueryIntent(query);

    console.log('\nQUERY:', query);
    console.log('INTENT:', JSON.stringify(result, null, 2));
  }
}

if (require.main === module) {
  testQueryIntent().catch(console.error);
}
