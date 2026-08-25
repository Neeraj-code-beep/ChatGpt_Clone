require('dotenv').config();
const crypto = require('crypto');
const { GoogleGenAI } = require('@google/genai');
const {
  upsertMemory,
  findSimilarMemories,
  updateMemoryStatus,
} = require('./vector.service');
const aiService = require('./ai.service');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const MIN_RETRIEVAL_SIMILARITY = 0.7;

async function extractMemories({ userMessage, aiResponse }) {
  const prompt = `
You are a memory extraction system for an AI assistant called Helper.

Your job is to identify information from the conversation that would be
useful for Helper to remember in future conversations.

USER MESSAGE:
${userMessage}

AI RESPONSE:
${aiResponse}

Only extract information that is genuinely useful as long-term memory.

Good memories include:
- User preferences
- User goals
- User interests
- User projects
- Important decisions
- Skills the user is learning
- Important personal context explicitly provided by the user
- Technical/project decisions
- Important facts the user wants Helper to remember

Do NOT store:
- Greetings
- Small talk
- Temporary questions
- Generic questions
- Generic AI explanations
- AI-generated opinions
- Repetitive information
- Information that is only true for this single response

For every memory, classify it as one of:

fact
preference
goal
project
decision
skill
context

Return ONLY valid JSON.

The JSON must follow this exact structure:

{
  "memories": [
    {
      "type": "fact",
      "text": "Short standalone memory.",
      "importance": 0.8,
      "confidence": 0.9
    }
  ]
}

If there is nothing worth remembering, return:

{
  "memories": []
}

Rules:
- importance must be between 0 and 1.
- confidence must be between 0 and 1.
- Keep memory text short and standalone.
- Write memories from Helper's perspective so they make sense later.
- Never invent information.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: prompt,
    config: {
      temperature: 0,
      responseMimeType: 'application/json',
    },
  });

  const text = response.text;

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('Memory extraction JSON error:', error);
    return { memories: [] };
  }
}

function decideMemoryAction({ newMemory, similarMemories }) {
  if (!similarMemories || similarMemories.length === 0) {
    return {
      action: 'create',
      existingMemory: null,
    };
  }

  const bestMatch = similarMemories[0];

  const MIN_SIMILARITY_FOR_JUDGING = 0.7;

  if (bestMatch.score >= MIN_SIMILARITY_FOR_JUDGING) {
    return {
      action: 'judge',
      existingMemory: bestMatch,
    };
  }

  return {
    action: 'create',
    existingMemory: null,
  };
}

async function judgeMemory({ existingMemory, newMemory }) {
  const prompt = `
You are the memory management system for an AI assistant called Helper.

Your job is to compare an existing long-term memory with a newly extracted
memory and decide what should happen.

EXISTING MEMORY:
${existingMemory?.metadata?.text || ''}

EXISTING MEMORY TYPE:
${existingMemory?.metadata?.type || ''}

NEW MEMORY:
${newMemory.text}

NEW MEMORY TYPE:
${newMemory.type}

Decide exactly one action:

1. "update"
   Use this when the new memory adds information, changes the existing
   memory, corrects it, or provides a newer version of the same fact.

2. "ignore"
   Use this when the new memory does not add meaningful information
   or is essentially redundant.

3. "create"
   Use this only if the new memory represents a genuinely different
   piece of information.

If the action is "update", create a concise final memory that combines
the useful information from both memories.

Important rules:

- Never invent information.
- Prefer newer user-provided information when memories conflict.
- User statements have higher authority than AI-generated statements.
- Keep the final memory short and standalone.
- Preserve important context.
- Do not include explanations.
- Do not include markdown.

Return ONLY valid JSON using exactly this structure:

{
  "action": "update",
  "memory": {
    "type": "preference",
    "text": "User prefers C++ for DSA.",
    "importance": 0.9,
    "confidence": 0.95
  }
}

For "ignore":

{
  "action": "ignore",
  "memory": null
}

For "create":

{
  "action": "create",
  "memory": {
    "type": "fact",
    "text": "Some new memory.",
    "importance": 0.8,
    "confidence": 0.9
  }
}
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
    const decision = JSON.parse(response.text);
    if (!validateMemoryDecision(decision)) {
      console.error('Invalid memory decision from Gemini:', decision);

      return {
        action: 'ignore',
        memory: null,
      };
    }
    return decision;
  } catch (error) {
    console.error('Memory judge JSON error:', error);
    return {
      action: 'ignore',
      memory: null,
    };
  }
}

function validateMemoryDecision(decision) {
  if (!decision || typeof decision !== 'object') {
    return false;
  }

  if (!['create', 'update', 'ignore'].includes(decision.action)) {
    return false;
  }

  if (decision.action === 'ignore') {
    return true;
  }

  if (!decision.memory || typeof decision.memory !== 'object') {
    return false;
  }

  if (!decision.memory.type || typeof decision.memory.text !== 'string') {
    return false;
  }

  if (
    typeof decision.memory.importance !== 'number' ||
    decision.memory.importance < 0 ||
    decision.memory.importance > 1
  ) {
    return false;
  }

  if (
    typeof decision.memory.confidence !== 'number' ||
    decision.memory.confidence < 0 ||
    decision.memory.confidence > 1
  ) {
    return false;
  }

  return true;
}

async function saveMemory({ decision, userId, chatId }) {
  if (!decision || !decision.action) {
    throw new Error('Invalid memory decision');
  }

  // Nothing to save
  if (decision.action === 'ignore') {
    console.log('Memory ignored.');

    return {
      action: 'ignore',
      memoryId: null,
    };
  }

  if (!decision.memory) {
    throw new Error('Memory data is required for create/update');
  }

  const memory = decision.memory;

  // -----------------------------------
  // UPDATE
  // -----------------------------------
  if (decision.action === 'update') {
    const existingMemoryId = decision.existingMemory?.id;

    if (!existingMemoryId) {
      throw new Error('Existing memory ID is required for update');
    }

    const now = new Date().toISOString();

    // 1. Mark old memory as superseded
    await updateMemoryStatus({
      id: existingMemoryId,
      status: 'superseded',
      updatedAt: now,
    });

    // 2. Create a NEW ID for the new version
    const newMemoryId = crypto.randomUUID();

    // 3. Generate embedding for the new memory
    const vector = await aiService.generateVector(memory.text);

    // 4. Store the new memory as active
    const metadata = {
      user: userId.toString(),
      chat: chatId.toString(),
      text: memory.text,
      type: memory.type,
      importance: memory.importance,
      confidence: memory.confidence,
      source: 'conversation',
      status: 'active',
      createdAt: now,
      updatedAt: now,

      // Keep track of what this memory replaced
      supersedes: existingMemoryId,
    };

    await upsertMemory({
      id: newMemoryId,
      vector,
      metadata,
    });

    console.log(
      `Memory updated successfully: ${existingMemoryId} → ${newMemoryId}`,
    );

    return {
      action: 'update',
      memoryId: newMemoryId,
      previousMemoryId: existingMemoryId,
      memory,
    };
  }

  // -----------------------------------
  // CREATE
  // -----------------------------------
  if (decision.action === 'create') {
    const memoryId = crypto.randomUUID();

    const vector = await aiService.generateVector(memory.text);

    const now = new Date().toISOString();

    const metadata = {
      user: userId.toString(),
      chat: chatId.toString(),
      text: memory.text,
      type: memory.type,
      importance: memory.importance,
      confidence: memory.confidence,
      source: 'conversation',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    await upsertMemory({
      id: memoryId,
      vector,
      metadata,
    });

    console.log(`Memory created successfully: ${memoryId}`);

    return {
      action: 'create',
      memoryId,
      memory,
    };
  }

  throw new Error(`Unsupported memory action: ${decision.action}`);
}

function calculateRecencyScore(updatedAt) {
  if (!updatedAt) {
    return 0;
  }

  const updatedTime = new Date(updatedAt).getTime();

  if (Number.isNaN(updatedTime)) {
    return 0;
  }

  const ageInDays = (Date.now() - updatedTime) / (1000 * 60 * 60 * 24);

  // Exponential decay.
  // Half-life = 30 days.
  return Math.exp(-ageInDays / 30);
}

function scoreMemory(memory) {
  const similarity = Number(memory.score ?? 0);

  const importance = Number(memory.metadata?.importance ?? 0);

  const confidence = Number(memory.metadata?.confidence ?? 0);

  const recency = calculateRecencyScore(memory.metadata?.updatedAt);

  return (
    similarity * 0.55 + importance * 0.2 + confidence * 0.1 + recency * 0.15
  );
}

function rankMemories(memories) {
  return memories
    .filter((memory) => Number(memory.score ?? 0) >= MIN_RETRIEVAL_SIMILARITY)
    .map((memory) => ({
      ...memory,
      retrievalScore: scoreMemory(memory),
      recencyScore: calculateRecencyScore(memory.metadata?.updatedAt),
    }))
    .sort((a, b) => b.retrievalScore - a.retrievalScore);
}

async function processMemories({ userMessage, aiResponse, userId, chatId }) {
  // 1. Extract useful long-term memories
  const extraction = await extractMemories({
    userMessage,
    aiResponse,
  });

  const memories = extraction?.memories || [];

  if (memories.length === 0) {
    console.log('No useful memories found.');

    return {
      processed: 0,
      results: [],
    };
  }

  const results = [];

  // 2. Process every extracted memory
  for (const newMemory of memories) {
    try {
      // Generate embedding for the new memory
      const vector = await aiService.generateVector(newMemory.text);

      // Find potentially similar existing memories
      const similarMemories = await findSimilarMemories({
        vector,
        user: userId,
        limit: 10,
      });

      const rankedMemories = rankMemories(similarMemories);

      console.log('Ranked memories:', rankedMemories);

      // 3. Decide whether this is a new memory
      // or potentially related to an existing memory
      const candidateDecision = decideMemoryAction({
        newMemory,
        similarMemories: rankedMemories,
      });

      let finalDecision;

      // 4. If there is no strong match,
      // directly create the memory.
      if (candidateDecision.action === 'create') {
        finalDecision = {
          action: 'create',
          memory: newMemory,
          existingMemory: null,
        };
      } else {
        finalDecision = await judgeMemory({
          existingMemory: candidateDecision.existingMemory,
          newMemory,
        });

        if (finalDecision.action === 'update') {
          finalDecision.existingMemory = candidateDecision.existingMemory;
        }
      }

      console.log('Final memory decision:', finalDecision);

      // 6. Persist the final decision
      const saved = await saveMemory({
        decision: finalDecision,
        userId,
        chatId,
      });

      results.push(saved);
    } catch (error) {
      console.error('Memory processing error:', error);

      results.push({
        action: 'error',
        error: error.message,
      });
    }
  }

  return {
    processed: results.length,
    results,
  };
}

module.exports = {
  extractMemories,
  decideMemoryAction,
  judgeMemory,
  saveMemory,
  processMemories,
  scoreMemory,
};

async function testMemoryLifecycle() {
  const result = await processMemories({
    userMessage:
      'I changed my project stack again. I will now use Next.js, TypeScript, and MongoDB instead of PostgreSQL.',
    aiResponse:
      'Got it. Your current project stack is Next.js, TypeScript, and MongoDB.',
    userId: 'test-user-123',
    chatId: 'test-chat-123',
  });

  console.log('LIFECYCLE TEST RESULT:', JSON.stringify(result, null, 2));
}

if (require.main === module) {
  testMemoryLifecycle().catch((error) => {
    console.error('LIFECYCLE TEST ERROR:', error);
  });
}
