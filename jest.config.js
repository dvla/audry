// jest.config.js
const {pathsToModuleNameMapper} = require('ts-jest')
// In the following statement, replace `./tsconfig` with the path to your `tsconfig` file
// which contains the path mapping (ie the `compilerOptions.paths` option):
const {compilerOptions} = require('./tsconfig.json')

/** @type {import('ts-jest/dist/types').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                diagnostics: {
                    warnOnly: true
                }
            }
        ]
    },
    testEnvironment: 'node',
    moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {prefix: '<rootDir>/'}),
    testPathIgnorePatterns: ['node_modules/', 'lib/'],
    resetMocks: true,
    restoreMocks: true,
}