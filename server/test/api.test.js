require('dotenv').config();
const http = require('http');
const assert = require('assert');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const userModel = require('../src/models/user.model');
const chatModel = require('../src/models/chat.model');
const messageModel = require('../src/models/message.model');

/**
 * Backend API Integration Test Suite
 * Tests Auth Session and Chat APIs against actual Express routes and MongoDB.
 */

let server;
let baseUrl;

async function startTestServer() {
  await mongoose.connect(process.env.MONGODB_URL);
  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
}

async function stopTestServer() {
  await new Promise((resolve) => server.close(resolve));
  await mongoose.connection.close();
}

async function request(path, options = {}) {
  const { method = 'GET', body, cookie, headers = {} } = options;
  const reqHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };
  if (cookie) {
    reqHeaders['Cookie'] = cookie;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  const resCookie = response.headers.get('set-cookie');
  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return {
    status: response.status,
    body: data,
    cookie: resCookie,
  };
}

async function runTests() {
  console.log('--- Starting Backend API Test Suite ---\n');
  await startTestServer();

  let testUserA;
  let testUserB;
  let tokenCookieA;
  let tokenCookieB;
  let chatA;

  try {
    // Clean up any previous test data
    await userModel.deleteMany({ email: { $in: ['test_a@example.com', 'test_b@example.com'] } });

    // 1. REGISTER USER A (Verify standardized fullName shape)
    console.log('Test 1: POST /api/auth/register returns standardized fullName');
    const regRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: { firstName: 'Alice', lastName: 'Tester' },
        email: 'test_a@example.com',
        password: 'password123',
      },
    });
    assert.strictEqual(regRes.status, 201, 'Expected 201 Created');
    assert.strictEqual(regRes.body.user.fullName.firstName, 'Alice');
    assert.strictEqual(regRes.body.user.fullName.lastName, 'Tester');
    assert.strictEqual(regRes.body.user.fullname, undefined, 'Legacy fullname should be undefined');
    assert.ok(regRes.cookie.includes('token='), 'Expected JWT cookie to be set');
    tokenCookieA = regRes.cookie.split(';')[0];
    testUserA = regRes.body.user;
    console.log('✓ Passed: Register returns standardized fullName and sets cookie\n');

    // 2. REGISTER USER B
    console.log('Test 2: Setup User B for IDOR / Ownership verification');
    const regBRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: { firstName: 'Bob', lastName: 'Tester' },
        email: 'test_b@example.com',
        password: 'password123',
      },
    });
    assert.strictEqual(regBRes.status, 201);
    tokenCookieB = regBRes.cookie.split(';')[0];
    testUserB = regBRes.body.user;
    console.log('✓ Passed: User B registered\n');

    // 3. GET /api/auth/me AUTHENTICATED
    console.log('Test 3: GET /api/auth/me with valid session cookie');
    const meRes = await request('/api/auth/me', { cookie: tokenCookieA });
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.user.email, 'test_a@example.com');
    assert.strictEqual(meRes.body.user.fullName.firstName, 'Alice');
    assert.strictEqual(meRes.body.user.password, undefined, 'Password must never be exposed');
    console.log('✓ Passed: GET /api/auth/me returns safe profile\n');

    // 4. GET /api/auth/me UNAUTHENTICATED
    console.log('Test 4: GET /api/auth/me without cookie (unauthenticated)');
    const meUnauthRes = await request('/api/auth/me');
    assert.strictEqual(meUnauthRes.status, 401);
    assert.strictEqual(meUnauthRes.body.message, 'Unauthorized');
    console.log('✓ Passed: Unauthenticated request rejected with 401\n');

    // 5. POST /api/auth/logout
    console.log('Test 5: POST /api/auth/logout clears token cookie');
    const logoutRes = await request('/api/auth/logout', { method: 'POST' });
    assert.strictEqual(logoutRes.status, 200);
    assert.strictEqual(logoutRes.body.message, 'User logged out successfully');
    assert.ok(logoutRes.cookie.includes('token=;'), 'Expected cookie to be cleared');
    console.log('✓ Passed: Logout clears session cookie\n');

    // 6. CREATE CHAT (POST /api/chat)
    console.log('Test 6: POST /api/chat creates chat for User A');
    const createChatRes = await request('/api/chat', {
      method: 'POST',
      cookie: tokenCookieA,
      body: { title: 'Project Architecture' },
    });
    assert.strictEqual(createChatRes.status, 201);
    assert.strictEqual(createChatRes.body.chat.title, 'Project Architecture');
    assert.strictEqual(createChatRes.body.chat.user.toString(), testUserA._id.toString());
    chatA = createChatRes.body.chat;
    console.log('✓ Passed: Chat created successfully\n');

    // 7. LIST CHATS (GET /api/chat)
    console.log('Test 7: GET /api/chat lists chats for User A');
    const listChatsRes = await request('/api/chat', { cookie: tokenCookieA });
    assert.strictEqual(listChatsRes.status, 200);
    assert.ok(Array.isArray(listChatsRes.body.chats));
    assert.strictEqual(listChatsRes.body.chats.length, 1);
    assert.strictEqual(listChatsRes.body.chats[0]._id.toString(), chatA._id.toString());
    console.log('✓ Passed: Chat listing returned correctly\n');

    // 8. EMPTY CHATS FOR USER B
    console.log('Test 8: GET /api/chat for User B returns empty list (isolated)');
    const listChatsBRes = await request('/api/chat', { cookie: tokenCookieB });
    assert.strictEqual(listChatsBRes.status, 200);
    assert.strictEqual(listChatsBRes.body.chats.length, 0);
    console.log('✓ Passed: User isolation in chat listing verified\n');

    // 9. INSERT TEST MESSAGES & RETRIEVE HISTORY (GET /api/chat/:id/messages)
    console.log('Test 9: GET /api/chat/:id/messages returns chronological message turns');
    const msg1 = await messageModel.create({
      chat: chatA._id,
      user: testUserA._id,
      role: 'user',
      content: 'Hello Helper',
      requestId: 'req-001',
      requestStatus: 'completed',
    });
    const msg2 = await messageModel.create({
      chat: chatA._id,
      user: testUserA._id,
      role: 'model',
      content: 'Hello! How can I help you today?',
    });

    const getMsgRes = await request(`/api/chat/${chatA._id}/messages`, { cookie: tokenCookieA });
    assert.strictEqual(getMsgRes.status, 200);
    assert.strictEqual(getMsgRes.body.messages.length, 2);
    assert.strictEqual(getMsgRes.body.messages[0].role, 'user');
    assert.strictEqual(getMsgRes.body.messages[1].role, 'model');
    console.log('✓ Passed: Message history retrieved in chronological order\n');

    // 10. IDOR / OWNERSHIP CHECK: User B cannot read User A's messages
    console.log('Test 10: IDOR protection on GET /api/chat/:id/messages');
    const idorReadRes = await request(`/api/chat/${chatA._id}/messages`, { cookie: tokenCookieB });
    assert.strictEqual(idorReadRes.status, 404, 'Must return 404 to avoid leaking resource existence');
    console.log('✓ Passed: User B cannot access User A chat messages\n');

    // 11. UPDATE CHAT TITLE (PATCH /api/chat/:id)
    console.log('Test 11: PATCH /api/chat/:id updates title');
    const updateRes = await request(`/api/chat/${chatA._id}`, {
      method: 'PATCH',
      cookie: tokenCookieA,
      body: { title: 'Updated System Design' },
    });
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.chat.title, 'Updated System Design');
    console.log('✓ Passed: Chat title updated\n');

    // 12. IDOR / OWNERSHIP CHECK: User B cannot update User A's chat
    console.log('Test 12: IDOR protection on PATCH /api/chat/:id');
    const idorUpdateRes = await request(`/api/chat/${chatA._id}`, {
      method: 'PATCH',
      cookie: tokenCookieB,
      body: { title: 'Hacked Title' },
    });
    assert.strictEqual(idorUpdateRes.status, 404);
    console.log('✓ Passed: User B cannot update User A chat\n');

    // 13. INVALID OBJECTID HANDLING
    console.log('Test 13: Invalid ObjectId validation across endpoints');
    const invalidIdRes = await request('/api/chat/invalid-id-123/messages', { cookie: tokenCookieA });
    assert.strictEqual(invalidIdRes.status, 400);
    assert.strictEqual(invalidIdRes.body.message, 'Invalid chat ID');
    console.log('✓ Passed: Invalid ObjectId returns 400\n');

    // 14. DELETE CHAT (DELETE /api/chat/:id)
    console.log('Test 14: DELETE /api/chat/:id deletes chat and associated messages');
    const deleteRes = await request(`/api/chat/${chatA._id}`, {
      method: 'DELETE',
      cookie: tokenCookieA,
    });
    assert.strictEqual(deleteRes.status, 200);
    assert.strictEqual(deleteRes.body.message, 'Chat deleted successfully');

    // Verify chat and messages are removed from DB
    const chatInDb = await chatModel.findById(chatA._id);
    assert.strictEqual(chatInDb, null, 'Chat should be deleted from DB');
    const messagesInDb = await messageModel.find({ chat: chatA._id });
    assert.strictEqual(messagesInDb.length, 0, 'Associated messages should be deleted');
    console.log('✓ Passed: Chat and associated messages cleanly deleted\n');

    console.log('=== All 14 Test Cases Passed Successfully! ===\n');
  } finally {
    // Clean up created test data
    if (testUserA) await userModel.deleteOne({ _id: testUserA._id });
    if (testUserB) await userModel.deleteOne({ _id: testUserB._id });
    if (chatA) {
      await chatModel.deleteOne({ _id: chatA._id });
      await messageModel.deleteMany({ chat: chatA._id });
    }
    await stopTestServer();
  }
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
