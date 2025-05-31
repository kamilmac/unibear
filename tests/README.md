# Unibear Tests

This directory contains unit tests for the Unibear application, focusing on the file editing functionality.

## Running Tests

```bash
# Run all tests
deno task test

# Run tests in watch mode
deno task test:watch

# Run specific test file
deno test --allow-read --allow-write --allow-net tests/file-editor.test.ts
```

## Test Coverage

### `file-editor.test.ts`
Core functionality tests for the `applyFileEdits` function:

1. **Basic exact match replacement** - Simple string replacement
2. **Multiple edits in correct order** - Multiple changes applied in correct sequence
3. **Whitespace normalization** - Handling of tabs, spaces, and formatting
4. **Unicode and special characters** - International characters, emojis, smart quotes
5. **Large multiline replacement** - Complex multiline code changes
6. **Edge case: Empty replacement** - Removing code sections
7. **Line ending normalization** - Mixed `\r\n` and `\n` handling
8. **Complex TypeScript interface modification** - Real-world TypeScript changes
9. **Error case: Non-existent text** - Proper error handling
10. **Error case: Conflicting edits** - Overlapping edit detection
11. **Fuzzy matching with whitespace differences** - Tolerant matching

### `file-editor-advanced.test.ts`
Advanced functionality and edge cases:

1. **sortEditsByPosition** - Edit ordering logic
2. **validateEdits** - Edit validation system
3. **detectEditConflicts** - Conflict detection algorithm
4. **normalizeForMatching** - Text normalization strategies
5. **findBestMatch** - Fuzzy matching capabilities
6. **calculateTextSimilarity** - Similarity scoring
7. **Performance with large file** - Scalability testing
8. **Real-world React component edit** - Complex React/TypeScript changes
9. **JSON configuration file edit** - Structured data file editing

## Test Utilities

- **createTempFile()** - Creates temporary files for testing
- **cleanupTempFile()** - Cleanup helper for test isolation
- **readTempFile()** - Reads test file content

## Coverage Areas

- ✅ Exact text matching
- ✅ Fuzzy text matching with multiple normalization levels
- ✅ Multiple simultaneous edits
- ✅ Unicode and international character handling
- ✅ Whitespace normalization (tabs, spaces, line endings)
- ✅ Large file performance
- ✅ Error handling and validation
- ✅ Conflict detection
- ✅ Real-world code scenarios (TypeScript, React, JSON)
- ✅ Edge cases (empty replacements, overlapping edits)

## Notes

Tests use Deno's built-in testing framework with assertions from the standard library. All tests create temporary files and clean up after themselves to ensure test isolation.