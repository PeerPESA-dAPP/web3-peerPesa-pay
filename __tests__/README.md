# MiniPay Connection Tests

Comprehensive test suite for MiniPay detection and connection functionality.

## Test Structure

The test suite is organized into 5 main test suites covering different aspects of MiniPay integration:

### 1. MiniPay Detection Methods (Tests 1-7)
Tests the three primary detection methods:
- **Direct `window.ethereum.isMiniPay`** - Native provider detection
- **WalletConnect + localStorage flags** - Connector-based detection  
- **UserAgent detection** - Browser identification fallback
- **Fallback chain** - Tests detection method fallbacks

### 2. MiniPay Connection States (Tests 8-10)
Tests connection state transitions:
- Initial disconnected state
- Successful connection flow
- Version capture on connection

### 3. MiniPay Network Detection (Tests 11-12)
Tests network-related detection:
- Celo network chain ID detection
- Network persistence

### 4. Edge Cases (Tests 13-15)
Tests error handling and edge cases:
- Missing ethereum object handling
- localStorage quota/access errors
- Concurrent detection calls

## Running the Tests

### Option 1: Jest (Recommended for Next.js)
```bash
# Install Jest (if not already installed)
npm install --save-dev jest @testing-library/react @testing-library/jest-dom

# Run tests
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run specific test file
npm run test -- minipay-connect.test.ts
```

### Option 2: Vitest (Alternative)
```bash
# Install Vitest
npm install --save-dev vitest

# Run tests
npm run test:vitest

# Run in watch mode
npm run test:vitest -- --watch
```

## Test Coverage

The test suite covers:
- ✅ 3 detection methods
- ✅ Connection state management
- ✅ Version capture
- ✅ Network detection
- ✅ Error handling
- ✅ Concurrent calls

**Total: 15 comprehensive test cases**

## Key Test Scenarios

| Test | Purpose | Expected Result |
|------|---------|-----------------|
| Test 1 | Direct isMiniPay detection | ✓ Detects via window.ethereum |
| Test 2 | WalletConnect detection | ✓ Detects via localStorage |
| Test 3 | Connector name detection | ✓ Identifies WalletConnect |
| Test 4 | UserAgent detection | ✓ Detects via browser string |
| Test 5 | No MiniPay detection | ✓ Returns false when absent |
| Test 6 | Disconnection | ✓ Clears connection state |
| Test 7 | Fallback chain | ✓ Uses next method if first fails |
| Test 8 | Initial state | ✓ Starts disconnected |
| Test 9 | Connect flow | ✓ Transitions to connected |
| Test 10 | Version capture | ✓ Stores version number |
| Test 11 | Celo network | ✓ Detects Celo chain ID |
| Test 12 | Chain persistence | ✓ Saves chain ID |
| Test 13 | Error handling | ✓ Gracefully handles missing ethereum |
| Test 14 | Storage errors | ✓ Handles storage issues |
| Test 15 | Concurrency | ✓ Handles parallel calls |

## Setup Instructions

### 1. Update `package.json`

Add test scripts:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "@testing-library/react": "^14.0.0"
  }
}
```

### 2. Create `jest.config.js` (Root of project)

```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
}
```

### 3. Create `jest.setup.js` (Root of project)

```javascript
// jest.setup.js
import '@testing-library/jest-dom'
```

## Debugging Tests

### View test output
```bash
npm run test -- --verbose
```

### Run single test
```bash
npm run test -- minipay-connect.test.ts -t "should detect MiniPay"
```

### Generate coverage report
```bash
npm run test:coverage
```

## Integration with CI/CD

Add to GitHub Actions (`.github/workflows/test.yml`):
```yaml
- name: Run Tests
  run: npm run test -- --coverage
  
- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

## Troubleshooting

### Issue: Tests not found
**Solution:** Ensure `__tests__` folder is in the root of the web3 project

### Issue: localStorage errors
**Solution:** The test file mocks localStorage, but ensure test environment is set to `jsdom`

### Issue: window object missing
**Solution:** Use `typeof window !== 'undefined'` checks in tests

## Future Test Enhancements

- [ ] Add integration tests with actual MiniPay provider
- [ ] Add e2e tests with browser automation (Cypress/Playwright)
- [ ] Add performance benchmarks for detection
- [ ] Add snapshot tests for connection flow
- [ ] Add visual regression tests

## Related Files

- Hook: `hooks/use-minipay.ts`
- Component: `components/thirdweb-wallet-interface.tsx`
- Config: `lib/wagmi-config.ts`
