require('dotenv').config();
const aiService = require('./ai.service');
const { findSimilarMemories } = require('./vector.service');
const { classifyQueryIntent } = require('./query-intent.service');

const MIN_SIMILARITY = 0.6;

// How much each signal contributes to retrieval.
const WEIGHTS = {
  similarity: 0.55,
  importance: 0.2,
  confidence: 0.1,
  recency: 0.1,
  typeRelevance: 0.05,
};

const MEMORY_TYPE_KEYWORDS = {
  project: [
    'project',
    'application',
    'app',
    'system',
    'build',
    'building',
    'develop',
    'development',
    'stack',
    'architecture',
    'codebase',
  ],

  decision: [
    'decide',
    'decision',
    'choose',
    'chose',
    'selected',
    'switched',
    'changed',
    'using',
    'use',
  ],

  skill: [
    'learn',
    'learning',
    'study',
    'studying',
    'skill',
    'practice',
    'improve',
    'improving',
  ],

  goal: [
    'goal',
    'want',
    'wants',
    'plan',
    'planning',
    'aim',
    'achieve',
    'become',
  ],

  preference: [
    'prefer',
    'preference',
    'favorite',
    'favourite',
    'like',
    'likes',
    'dislike',
    'avoid',
  ],

  fact: ['fact', 'know', 'information', 'remember'],

  context: ['context', 'background', 'situation'],
};

function calculateRecencyScore(updatedAt) {
  if (!updatedAt) {
    return 0;
  }

  const updatedTime = new Date(updatedAt).getTime();

  if (Number.isNaN(updatedTime)) {
    return 0;
  }

  const ageInDays =
    Math.max(0, Date.now() - updatedTime) / (1000 * 60 * 60 * 24);

  // 30-day half-life style decay.
  return Math.exp(-ageInDays / 30);
}

function calculateTypeRelevance(memoryType, queryTypes) {
  if (!memoryType || !Array.isArray(queryTypes)) {
    return 0;
  }

  if (queryTypes.length === 0) {
    return 0.5;
  }

  return queryTypes.includes(memoryType) ? 1 : 0;
}

function calculateRetrievalScore({ memory, query, queryIntent }) {
  const similarity = Number(memory.score ?? 0);

  const importance = Number(memory.metadata?.importance ?? 0);

  const confidence = Number(memory.metadata?.confidence ?? 0);

  const recency = calculateRecencyScore(memory.metadata?.updatedAt);

  const typeRelevance = calculateTypeRelevance(
    memory.metadata?.type,
    queryIntent?.types,
  );

  const retrievalScore =
    similarity * WEIGHTS.similarity +
    importance * WEIGHTS.importance +
    confidence * WEIGHTS.confidence +
    recency * WEIGHTS.recency +
    typeRelevance * WEIGHTS.typeRelevance;

  return {
    ...memory,
    retrievalScore,
    retrievalSignals: {
      similarity,
      importance,
      confidence,
      recency,
      typeRelevance,
    },
  };
}

function rankMemories({ memories, query, queryIntent }) {
  return memories
    .filter((memory) => Number(memory.score ?? 0) >= MIN_SIMILARITY)
    .map((memory) =>
      calculateRetrievalScore({
        memory,
        query,
        queryIntent,
      }),
    )
    .sort((a, b) => b.retrievalScore - a.retrievalScore);
}

// Reuses the pre-computed queryVector if provided to avoid a duplicate embedding API call.
// Generating an embedding adds latency and cost; when the caller (socket.server.js)
// already generated the vector in parallel during Step 1, we reuse it directly here.
async function retrieveMemories({ query, queryVector, userId, limit = 5 }) {
  const vector =
    Array.isArray(queryVector) && queryVector.length === 768
      ? queryVector
      : await aiService.generateVector(query);

  const candidates = await findSimilarMemories({
    vector,
    user: userId,
    limit: 10,
  });

  const queryIntent = await classifyQueryIntent(query);

  console.log('QUERY INTENT:', JSON.stringify(queryIntent, null, 2));

  const ranked = rankMemories({
    memories: candidates,
    query,
    queryIntent,
  });

  return ranked.slice(0, limit);
}

module.exports = {
  calculateRecencyScore,
  calculateTypeRelevance,
  calculateRetrievalScore,
  rankMemories,
  retrieveMemories,
};

if (require.main === module) {
  async function testRetrieval() {
    const memories = await retrieveMemories({
      query: 'What technologies am I currently using for my project?',
      userId: 'test-user-123',
      limit: 5,
      candidateLimit: 10,
    });

    console.log('RETRIEVED MEMORIES:', JSON.stringify(memories, null, 2));
  }

  testRetrieval().catch((error) => {
    console.error('RETRIEVAL TEST ERROR:', error);
  });
}
