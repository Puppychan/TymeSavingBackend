// setupTests.js
// import '@testing-library/jest-dom/extend-expect';

import { connectMongoDB, disconnectDB } from "src/config/connectMongoDB";

// At the top of your test setup file
require('dotenv').config({ path: '.env.test' });

beforeAll(async () => {
    await connectMongoDB();
});

afterAll(async () => {
    // await mongoose.connection.dropDatabase();
    jest.clearAllMocks();
    await disconnectDB();
});