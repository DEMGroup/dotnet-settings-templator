/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[t]sx?$',
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'testReports',
        outputName: 'jest-junit.xml',
      },
    ],
  ],
};