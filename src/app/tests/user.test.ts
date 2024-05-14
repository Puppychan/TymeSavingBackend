// tests/user.test.js
import { createMocks } from 'node-mocks-http';

describe('/api/user', () => {
  test('GET /api/user - Success', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    // await POS(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(Array.isArray(JSON.parse(res._getData()))).toBeTruthy();
  });

  test('POST /api/user - Success', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { name: 'John Doe', email: 'john@example.com' }
    });

    // await handleUsers(req, res);

    expect(res._getStatusCode()).toBe(201);
    expect(JSON.parse(res._getData()).name).toEqual('John Doe');
  });

  // Additional tests for PUT, DELETE, and other scenarios like error handling
});

describe('/api/user/[id]', () => {
  test('GET /api/user/[id] - Success', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { id: '1' },
    });

    await handleUserById(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData()).id).toEqual('1');
  });

  test('PUT /api/user/[id] - Success', async () => {
    const { req, res } = createMocks({
      method: 'PUT',
      query: { id: '1' },
      body: { name: 'Jane Doe' }
    });

    await handleUserById(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData()).name).toEqual('Jane Doe');
  });

  test('DELETE /api/user/[id] - Success', async () => {
    const { req, res } = createMocks({
      method: 'DELETE',
      query: { id: '1' }
    });

    await handleUserById(req, res);

    expect(res._getStatusCode()).toBe(204);
  });
});

