module.exports = {
    testEnvironment: 'node',  // since we're testing the API, not the browser
    testPathIgnorePatterns: [
      "<rootDir>/.next/", 
      "<rootDir>/node_modules/"
    ],
    transform: {
      // Handle TypeScript files
      '^.+\\.tsx?$': 'babel-jest',
      // Handle JS files
      '^.+\\.jsx?$': 'babel-jest',
    },
    setupFilesAfterEnv: ['<rootDir>/setupTests.js'] // if you have global setups like extending expect
  };
  