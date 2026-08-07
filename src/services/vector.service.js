const { Pinecone } = require('@pinecone-database/pinecone');

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const chatGpt_clone_index = pc.Index('chatgptclone');
const index = pc.describeIndex('chatgptclone');
console.log(index);

async function createMemory(vectors, metadata, messageId) {
  console.log('vectors is array:', Array.isArray(vectors));
  console.log('vectors length:', vectors.length);
  console.log('first value:', vectors[0]);

  await chatGpt_clone_index.upsert({
    records: [
      {
        id: messageId,
        values: vectors,
        metadata,
      },
    ],
  });

  console.log('Memory stored successfully in Pinecone.');
}

async function queryMemory({ queryVector, limit = 5, metadata }) {
  const data = await chatGpt_clone_index.query({
    vector: queryVector,
    topK: limit,
    filter: {
      chat: { $eq: metadata.chat },
      user: { $eq: metadata.user.toString() },
    },
    includeMetadata: true,
  });

  return data.matches;
}

module.exports = {
  createMemory,
  queryMemory,
};
