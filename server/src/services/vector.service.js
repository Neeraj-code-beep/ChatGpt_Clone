const { Pinecone } = require('@pinecone-database/pinecone');

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const chatGpt_clone_index = pc.Index('chatgptclone');
// const index = pc.describeIndex('chatgptclone');
// console.log(index);

async function upsertMemory({ id, vector, metadata }) {
  if (!id) {
    throw new Error('Memory ID is required');
  }

  if (!Array.isArray(vector)) {
    throw new Error('Memory vector must be an array');
  }

  if (vector.length !== 768) {
    throw new Error(`Invalid memory vector dimension: ${vector.length}`);
  }

  if (!vector.every(Number.isFinite)) {
    throw new Error('Memory vector contains invalid values');
  }

  await chatGpt_clone_index.upsert({
    records: [
      {
        id,
        values: vector,
        metadata,
      },
    ],
  });

  console.log(`Memory ${id} upserted successfully.`);
}

async function updateMemoryStatus({ id, status, updatedAt }) {
  if (!id) {
    throw new Error('Memory ID is required');
  }

  if (!['active', 'superseded'].includes(status)) {
    throw new Error('Invalid memory status');
  }

  const existing = await chatGpt_clone_index.fetch({
    ids: [id],
  });

  const record = existing.records?.[id];

  if (!record) {
    throw new Error(`Memory ${id} not found`);
  }

  await chatGpt_clone_index.upsert({
    records: [
      {
        id,
        values: record.values,
        metadata: {
          ...record.metadata,
          status,
          updatedAt,
        },
      },
    ],
  });

  console.log(`Memory ${id} marked as ${status}.`);
}

async function queryMemory({ queryVector, limit = 5, metadata }) {
  const data = await chatGpt_clone_index.query({
    vector: queryVector,
    topK: limit,
    filter: {
      // chat: { $eq: metadata.chat },
      user: { $eq: metadata.user.toString() },
    },
    includeMetadata: true,
  });

  return data.matches;
}

async function findSimilarMemories({ vector, user, limit = 10 }) {
  if (!Array.isArray(vector) || vector.length !== 768) {
    throw new Error('Invalid memory vector');
  }

  const data = await chatGpt_clone_index.query({
    vector,
    topK: limit,
    filter: {
      user: {
        $eq: user.toString(),
      },
      status: {
        $eq: 'active',
      },
    },
    includeMetadata: true,
  });

  return data.matches || [];
}

module.exports = {
  queryMemory,
  findSimilarMemories,
  upsertMemory,
  updateMemoryStatus,
};
