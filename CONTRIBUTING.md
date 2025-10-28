# 🤝 Contributing to CARSA

Thank you for your interest in contributing to CARSA! This document provides guidelines and information for contributors to help maintain code quality and ensure smooth collaboration.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contribution Workflow](#contribution-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Security Vulnerabilities](#security-vulnerabilities)

## 📜 Code of Conduct

This project adheres to a Code of Conduct that we expect all contributors to follow. Please read our [Code of Conduct](./CODE_OF_CONDUCT.md) before contributing.

### Our Pledge
- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences

## 🚀 Getting Started

### Prerequisites
Before contributing, ensure you have:
- Node.js 18+ and yarn/npm
- Rust 1.70+ and Cargo
- Solana CLI 1.18+
- Anchor CLI 0.31+
- Git knowledge
- Basic understanding of Solana and blockchain concepts

### Areas for Contribution
We welcome contributions in the following areas:

- 🔧 **Smart Contract Development**: Anchor program improvements
- 🌐 **Frontend Development**: Next.js application features
- 📱 **Mobile Development**: React Native mobile app
- 📚 **Documentation**: Guides, tutorials, and API docs
- 🧪 **Testing**: Unit tests, integration tests, and QA
- 🎨 **Design**: UI/UX improvements and design systems
- 🔒 **Security**: Audits, vulnerability reports, and fixes
- 🌍 **Internationalization**: Translation and localization
- 📊 **Analytics**: Performance optimization and monitoring

## 🛠️ Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/yourusername/carsa-solana.git
   cd carsa-solana
   ```

2. **Install Dependencies**
   ```bash
   # Install all dependencies
   yarn install
   
   # Smart contracts
   cd carsa-contracts && yarn install
   
   # Frontend
   cd ../carsa-frontend && yarn install
   ```

3. **Set Up Environment**
   ```bash
   # Run complete setup
   ./setup.sh
   
   # Or setup for local development
   ./setup.sh --network localnet
   ```

4. **Verify Setup**
   ```bash
   # Test smart contracts
   cd carsa-contracts && anchor test
   
   # Test frontend
   cd carsa-frontend && yarn test
   
   # Start development environment
   ./dev.sh
   ```

## 🔄 Contribution Workflow

### 1. Create an Issue First
Before starting work, please:
- Check existing issues to avoid duplication
- Create a new issue describing your proposed changes
- Discuss the approach with maintainers
- Get approval for significant changes

### 2. Branch Strategy
```bash
# Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/your-feature-name

# For bug fixes
git checkout -b fix/issue-description

# For documentation
git checkout -b docs/documentation-topic
```

### 3. Development Process
```bash
# Make your changes
# Add tests for new functionality
# Update documentation as needed

# Run tests locally
yarn test

# Run linting
yarn lint

# Build to ensure no errors
yarn build
```

### 4. Commit Guidelines
We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: type(scope): description
feat(contracts): add merchant update functionality
fix(frontend): resolve wallet connection issue
docs(readme): update setup instructions
test(contracts): add reward calculation tests
refactor(frontend): improve component structure
chore(deps): update anchor to v0.31.1
```

**Types:**
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `test`: Test additions or modifications
- `refactor`: Code refactoring
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `style`: Code style changes

## 📏 Coding Standards

### Rust (Smart Contracts)
```rust
// Use descriptive names
pub fn process_purchase(
    ctx: Context<ProcessPurchase>,
    fiat_amount: u64,
    redeem_token_amount: Option<u64>,
    transaction_id: [u8; 32],
) -> Result<()> {
    // Check all preconditions
    require!(fiat_amount > 0, CarsaError::InvalidAmount);
    
    // Use checked arithmetic
    let total = fiat_amount
        .checked_add(token_value)
        .ok_or(CarsaError::ArithmeticOverflow)?;
    
    // Clear variable names
    let reward_calculation = calculate_rewards(total, rate)?;
    
    Ok(())
}

// Document complex functions
/// Calculates reward tokens based on transaction value and merchant rate
/// Returns the reward amount in token units (9 decimals)
fn calculate_rewards(amount: u64, rate: u16) -> Result<u64> {
    // Implementation
}
```

### TypeScript (Frontend)
```typescript
// Use explicit types
interface PurchaseParams {
  merchantWalletAddress: string;
  purchaseAmount: number;
  transactionId: Uint8Array;
}

// Use descriptive function names
export async function processPurchaseTransaction(
  params: PurchaseParams
): Promise<PurchaseResult> {
  // Validate inputs
  if (params.purchaseAmount <= 0) {
    throw new Error('Purchase amount must be positive');
  }
  
  // Use try-catch for error handling
  try {
    const signature = await anchorClient.processPurchase(params);
    return { success: true, signature };
  } catch (error) {
    logger.error('Purchase failed', { error, params });
    throw new Error(`Purchase failed: ${error.message}`);
  }
}

// Document complex logic
/**
 * Converts fiat amount to token units based on current exchange rate
 * @param fiatAmount Amount in IDR (Indonesian Rupiah)
 * @param exchangeRate Current LOKAL to IDR exchange rate
 * @returns Token amount in smallest units (9 decimals)
 */
export function fiatToTokenUnits(
  fiatAmount: number, 
  exchangeRate: number
): bigint {
  // Implementation with proper precision handling
}
```

### React Components
```typescript
// Use TypeScript interfaces
interface MerchantDashboardProps {
  walletAddress: string;
  onUpdate?: (merchant: MerchantProfile) => void;
}

// Prefer function components with hooks
export function MerchantDashboard({ 
  walletAddress, 
  onUpdate 
}: MerchantDashboardProps) {
  // State management
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Effects
  useEffect(() => {
    loadMerchantData();
  }, [walletAddress]);
  
  // Event handlers
  const handleUpdate = useCallback(async (data: UpdateMerchantData) => {
    try {
      const updated = await updateMerchant(data);
      setMerchant(updated);
      onUpdate?.(updated);
    } catch (error) {
      // Handle error appropriately
    }
  }, [onUpdate]);
  
  // Render
  if (loading) return <LoadingSpinner />;
  if (!merchant) return <MerchantNotFound />;
  
  return (
    <div className="merchant-dashboard">
      {/* Component JSX */}
    </div>
  );
}

// Export with display name for debugging
MerchantDashboard.displayName = 'MerchantDashboard';
```

## 🧪 Testing Guidelines

### Smart Contract Tests
```typescript
// Use descriptive test names
describe("ProcessPurchase Instruction", () => {
  it("should distribute correct rewards for fiat purchase", async () => {
    // Arrange
    const purchaseAmount = 50_000; // 50,000 IDR
    const cashbackRate = 500; // 5%
    const expectedReward = 2_500_000_000; // 2.5 LOKAL tokens
    
    // Act
    const tx = await program.methods
      .processPurchase(new BN(purchaseAmount), null, transactionId)
      .accounts({...})
      .rpc();
    
    // Assert
    const customerAccount = await getAccount(connection, customerTokenAccount);
    expect(customerAccount.amount).to.equal(expectedReward);
  });
  
  it("should handle token redemption correctly", async () => {
    // Test token redemption logic
  });
  
  it("should prevent arithmetic overflow", async () => {
    // Test overflow protection
    await expect(
      program.methods.processPurchase(new BN(u64.MAX), null, transactionId)
    ).to.be.rejectedWith("ArithmeticOverflow");
  });
});
```

### Frontend Tests
```typescript
// Component testing
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PurchaseTransaction } from '../PurchaseTransaction';

describe('PurchaseTransaction Component', () => {
  it('should process purchase successfully', async () => {
    // Mock dependencies
    const mockProcessPurchase = jest.fn().mockResolvedValue('signature123');
    
    render(
      <PurchaseTransaction 
        merchantWalletAddress="test-merchant"
        onSuccess={jest.fn()}
      />
    );
    
    // Interact with component
    fireEvent.change(screen.getByLabelText('Purchase Amount'), {
      target: { value: '100000' }
    });
    
    fireEvent.click(screen.getByText('Process Purchase'));
    
    // Assert results
    await waitFor(() => {
      expect(screen.getByText('Transaction Successful')).toBeInTheDocument();
    });
  });
});

// API testing
import { processPurchaseAPI } from '../api/anchor/process-purchase';

describe('Process Purchase API', () => {
  it('should validate merchant exists', async () => {
    const request = createMockRequest({
      merchantWalletAddress: 'invalid-address',
      purchaseAmount: 50000
    });
    
    const response = await processPurchaseAPI(request);
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Merchant not found');
  });
});
```

### Test Coverage Requirements
- **Smart Contracts**: Minimum 90% coverage
- **Frontend Components**: Minimum 80% coverage
- **API Endpoints**: 100% coverage for critical paths
- **Integration Tests**: All major user flows

## 📚 Documentation

### Code Documentation
```typescript
/**
 * Processes a purchase transaction and distributes rewards
 * 
 * @param merchantWallet - The merchant's Solana wallet address
 * @param purchaseAmount - Purchase amount in IDR (Indonesian Rupiah)
 * @param redeemTokens - Optional tokens to redeem during purchase
 * @returns Promise<PurchaseResult> Transaction signature and details
 * 
 * @throws {InvalidMerchantError} When merchant is not found or inactive
 * @throws {InsufficientBalanceError} When customer lacks required tokens
 * @throws {TransactionFailedError} When blockchain transaction fails
 * 
 * @example
 * ```typescript
 * const result = await processPurchase({
 *   merchantWallet: "ABC123...",
 *   purchaseAmount: 50000,
 *   redeemTokens: 5000000000 // 5 LOKAL tokens
 * });
 * 
 * console.log('Transaction:', result.signature);
 * console.log('Tokens earned:', result.tokensAwarded);
 * ```
 */
```

### Documentation Requirements
- All public APIs must be documented
- Complex algorithms need detailed explanations
- Examples for all major features
- Architecture decisions should be recorded
- Security considerations must be documented

## 🔍 Pull Request Process

### Before Submitting
- [ ] Code follows project style guidelines
- [ ] All tests pass locally
- [ ] New tests added for new functionality
- [ ] Documentation updated as needed
- [ ] No conflicts with main branch
- [ ] Commit messages follow conventional format

### PR Template
```markdown
## Description
Brief description of changes and why they're needed.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

### Review Process
1. **Automated Checks**: CI/CD runs tests and linting
2. **Code Review**: At least one maintainer reviews the code
3. **Testing**: Reviewers test the changes locally
4. **Documentation Review**: Ensure docs are updated
5. **Merge**: Once approved, changes are merged

## 🐛 Issue Reporting

### Bug Reports
Use the bug report template:

```markdown
**Bug Description**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
- OS: [e.g. iOS]
- Browser [e.g. chrome, safari]
- Version [e.g. 22]
- Network [e.g. devnet, mainnet]

**Additional Context**
Add any other context about the problem here.
```

### Feature Requests
```markdown
**Is your feature request related to a problem?**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
```

## 🔒 Security Vulnerabilities

### Reporting Security Issues
**DO NOT** create public issues for security vulnerabilities.

Instead:
1. Email security@carsa.app with details
2. Include proof of concept if possible
3. Allow reasonable time for fix before disclosure
4. We will acknowledge receipt within 48 hours

### Security Considerations
When contributing, consider:
- Input validation and sanitization
- Authentication and authorization
- Smart contract security best practices
- Private key management
- Rate limiting and DDoS protection

## 🏆 Recognition

### Contributor Recognition
We recognize contributors through:
- **Contributors page** on our website
- **Release notes** mentioning contributors
- **Special badges** for significant contributions
- **Annual contributor awards**

### Types of Contributions Recognized
- Code contributions
- Bug reports and testing
- Documentation improvements
- Community support
- Security audits
- Design contributions

## 📞 Getting Help

### Communication Channels
- 💬 **Discord**: [CARSA Development Community](https://discord.gg/carsa-dev)
- 📧 **Email**: developers@carsa.app
- 🐛 **Issues**: [GitHub Issues](https://github.com/yourusername/carsa-solana/issues)
- 📚 **Docs**: [Documentation Portal](https://docs.carsa.app)

### Mentorship Program
New contributors can request mentorship:
- Assign yourself to beginner-friendly issues
- Ask questions in Discord #newcomers channel
- Request code review sessions
- Pair programming opportunities

## 📈 Roadmap

See our [project roadmap](./ROADMAP.md) for planned features and improvements. Contributors are encouraged to work on roadmap items.

---

Thank you for contributing to CARSA! Your efforts help build a better future for hyperlocal communities worldwide. 🚀

**Questions?** Don't hesitate to reach out to our maintainers or community!