# Testing Guide

This project uses [Vitest](https://vitest.dev/) for unit and integration testing.

## Setup

Install dependencies:
```bash
npm install
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Structure

```
__tests__/
├── setup.ts                    # Global test setup and mocks
├── unit/
│   ├── utils/                  # Utility function tests
│   │   ├── batchENSResolution.test.ts
│   │   ├── exportUtils.test.ts
│   │   └── pdf-generator.test.ts
│   ├── cache/                  # Cache tests
│   │   └── ensCache.test.ts
│   ├── hooks/                  # Custom hook tests
│   │   ├── useFormValidation.test.ts
│   │   ├── useLocalStorage.test.ts
│   │   └── useAssetLoading.test.ts
│   └── components/            # Component tests
│       ├── WalletConnect.test.tsx
│       └── BeneficiaryForm.test.tsx
└── integration/               # Integration tests (future)
    └── user-flows.test.tsx
```

## Writing Tests

### Testing Utilities

```typescript
import { describe, it, expect } from 'vitest'
import { myFunction } from '@/lib/utils/myFunction'

describe('myFunction', () => {
  it('should do something', () => {
    expect(myFunction()).toBe(expected)
  })
})
```

### Testing Hooks

```typescript
import { renderHook, act } from '@testing-library/react'
import { useMyHook } from '@/components/hooks/useMyHook'

describe('useMyHook', () => {
  it('should return initial value', () => {
    const { result } = renderHook(() => useMyHook())
    expect(result.current.value).toBe(initialValue)
  })
})
```

### Testing Components

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MyComponent } from '@/components/MyComponent'

describe('MyComponent', () => {
  it('should render', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('should handle user interaction', async () => {
    const user = userEvent.setup()
    render(<MyComponent />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    expect(screen.getByText('Clicked')).toBeInTheDocument()
  })
})
```

## Mocks

Common mocks are set up in `__tests__/setup.ts`:
- Next.js router
- Wagmi hooks
- Viem
- localStorage
- window.btc (Bitcoin wallet)

## Coverage

Coverage reports are generated in the `coverage/` directory. Open `coverage/index.html` in a browser to view the interactive report.

## Best Practices

1. **Test behavior, not implementation** - Focus on what the code does, not how it does it
2. **Use descriptive test names** - Test names should clearly describe what is being tested
3. **Keep tests isolated** - Each test should be independent and not rely on other tests
4. **Mock external dependencies** - Mock API calls, browser APIs, and third-party libraries
5. **Test edge cases** - Include tests for error conditions, empty states, and boundary values
6. **Maintain test coverage** - Aim for high coverage of critical paths

## Common Patterns

### Mocking API Calls

```typescript
import axios from 'axios'
vi.mock('axios')

mockedAxios.post.mockResolvedValue({
  data: { result: 'success' }
})
```

### Testing Async Code

```typescript
it('should handle async operations', async () => {
  const { result } = renderHook(() => useMyHook())
  
  await act(async () => {
    await result.current.loadData()
  })
  
  await waitFor(() => {
    expect(result.current.data).toBeDefined()
  })
})
```

### Testing Form Validation

```typescript
it('should validate required fields', () => {
  const { result } = renderHook(() => useFormValidation())
  const errors = result.current.validateForm({ name: '' })
  expect(errors).toContain('Name is required')
})
```

