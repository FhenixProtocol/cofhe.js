module.exports = {
  preset: "ts-jest",
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
    "^.+\\.jsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
    "^.+\\.bin$": ["<rootDir>config/rawLoader.cjs"],
  },
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "src/**/*.tsx",
    "!src/**/*.story.**",
  ],
  testRegex: "\\.test\\.tsx?$",
  coverageReporters: ["lcov", "text-summary", "json"],
  transformIgnorePatterns: ['node_modules/(?!@sindresorhus)'],
  coveragePathIgnorePatterns: [],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
    },
  },
  globalSetup: "<rootDir>/test/globalSetup.ts",
  globalTeardown: '<rootDir>/test/globalTeardown.cjs'
};
