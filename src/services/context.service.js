const MAX_MEMORY_COUNT = 5;
const MAX_HISTORY_MESSAGES = 20;
const MAX_MEMORY_CHARS = 4000;
const MAX_HISTORY_CHARS = 12000;

function buildContext({ userMessage, chatHistory = [], memories = [] }) {
  if (!userMessage || typeof userMessage !== 'string') {
    throw new Error('userMessage must be a non-empty string');
  }

  const selectedMemories = selectMemories(memories);

  const selectedHistory = selectHistory(chatHistory);

  const memoryText = formatMemories(selectedMemories);

  const history = formatHistory(selectedHistory);

  return {
    memories: selectedMemories,
    history: selectedHistory,

    contents: [
      {
        role: 'user',
        parts: [
          {
            text: buildMemoryContext(memoryText),
          },
        ],
      },

      ...history,

      {
        role: 'user',
        parts: [
          {
            text: userMessage,
          },
        ],
      },
    ],
  };
}

function selectMemories(memories) {
  return memories
    .filter((memory) => {
      return (
        memory && memory.metadata && memory.metadata.status !== 'superseded'
      );
    })
    .sort(
      (a, b) =>
        Number(b.retrievalScore ?? b.score ?? 0) -
        Number(a.retrievalScore ?? a.score ?? 0),
    )
    .slice(0, MAX_MEMORY_COUNT);
}

function selectHistory(chatHistory) {
  return chatHistory
    .filter((message) => {
      return (
        message &&
        typeof message.content === 'string' &&
        ['user', 'model'].includes(message.role)
      );
    })
    .slice(-MAX_HISTORY_MESSAGES);
}

function formatMemories(memories) {
  let result = '';

  for (const memory of memories) {
    const text = memory.metadata.text;

    if (!text) {
      continue;
    }

    const candidate = `- ${text}\n`;

    if (result.length + candidate.length > MAX_MEMORY_CHARS) {
      break;
    }

    result += candidate;
  }

  return result.trim();
}

function formatHistory(history) {
  let totalChars = 0;
  const result = [];

  for (let i = history.length - 1; i >= 0; i--) {
    const message = history[i];

    if (totalChars + message.content.length > MAX_HISTORY_CHARS) {
      break;
    }

    result.unshift({
      role: message.role,
      parts: [
        {
          text: message.content,
        },
      ],
    });

    totalChars += message.content.length;
  }

  return result;
}

function buildMemoryContext(memoryText) {
  if (!memoryText) {
    return `
Relevant long-term memory:

No relevant long-term memories were found.
`.trim();
  }

  return `
Relevant long-term memory:

${memoryText}

Use these memories only when they are relevant to the user's current request.

Do not mention that these memories were retrieved from a database or vector store.
Do not assume a memory is relevant if it does not help answer the current request.
`.trim();
}

module.exports = {
  buildContext,
};

if (require.main === module) {
  const { buildContext } = module.exports;

  const testMemories = [
    {
      id: 'memory-1',
      score: 0.8,
      retrievalScore: 0.91,
      metadata: {
        status: 'active',
        type: 'project',
        text: "The user's current project stack is TypeScript, Next.js, and MongoDB.",
      },
    },

    {
      id: 'memory-2',
      score: 0.7,
      retrievalScore: 0.82,
      metadata: {
        status: 'superseded',
        type: 'project',
        text: "The user's previous project stack used PostgreSQL.",
      },
    },
  ];

  const testHistory = [
    {
      role: 'user',
      content: 'What database should I use?',
    },
    {
      role: 'model',
      content: 'MongoDB could be a good choice.',
    },
  ];

  const result = buildContext({
    userMessage: 'What technologies am I currently using?',
    chatHistory: testHistory,
    memories: testMemories,
  });

  console.log('CONTEXT RESULT:', JSON.stringify(result, null, 2));
}
