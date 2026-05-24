/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.test.tsx'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
          module: 'commonjs',
          target: 'es2020',
          moduleResolution: 'node',
          baseUrl: '.',
          paths: { '@/*': ['src/*'] },
          skipLibCheck: true,
          resolveJsonModule: true,
          isolatedModules: true,
          strict: false,
          allowSyntheticDefaultImports: true,
        },
        diagnostics: false,
      },
    ],
  },
}
