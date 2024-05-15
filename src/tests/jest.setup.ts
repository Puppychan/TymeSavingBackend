// setupTests.js
// import '@testing-library/jest-dom/extend-expect';
import { connectMongoDBTest, disconnectDBTest } from './mongodbTestConfig';
// At the top of your test setup file
require('dotenv').config({ path: '.env.test' });

beforeAll(async () => {
    await disconnectDBTest();
});

beforeEach(async () => {
    // await connectMongoDB();
    await connectMongoDBTest();

    jest.resetAllMocks();
})

afterEach(async () => {
    // await mongoose.connection.dropDatabase();
    // await mongoose.connection.close();
    await disconnectDBTest();
    jest.clearAllMocks();
})

afterAll(async () => {
    // await mongoose.connection.dropDatabase();
    jest.clearAllMocks();
});