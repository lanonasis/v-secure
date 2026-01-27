# Contributing to v-secure

First off, thank you for considering contributing to v-secure! It's people like you that make v-secure such a great tool for the community.

## 🌟 Ways to Contribute

- **Report Bugs**: Found a bug? Let us know!
- **Suggest Features**: Have an idea? We'd love to hear it!
- **Write Code**: Fix bugs, implement features, improve performance
- **Improve Documentation**: Help others understand v-secure better
- **Security Research**: Responsibly disclose security vulnerabilities

## 🔒 Security Vulnerabilities

**IMPORTANT**: If you discover a security vulnerability, please **DO NOT** open a public issue. Instead, email us at:

📧 **security@lanonasis.com**

We take security seriously and will respond promptly to address any vulnerabilities.

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Clear Title**: Summarize the issue in the title
2. **Description**: What happened vs. what you expected
3. **Steps to Reproduce**: Detailed steps to reproduce the issue
4. **Environment**:
   - OS (macOS, Linux, Windows)
   - Node.js/Bun version
   - v-secure version
   - Database (PostgreSQL version, Supabase)
5. **Relevant Logs**: Any error messages or stack traces (sanitize sensitive info!)
6. **Screenshots**: If applicable

### Bug Report Template

```markdown
## Bug Description
[Clear description of the bug]

## Steps to Reproduce
1.
2.
3.

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- OS:
- Node.js/Bun:
- v-secure:
- Database:

## Additional Context
[Any other relevant information]
```

## 💡 Feature Requests

We love new ideas! When suggesting features:

1. **Search First**: Check if someone else has suggested it
2. **Use Case**: Explain the problem you're trying to solve
3. **Proposed Solution**: Describe your ideal solution
4. **Alternatives**: What alternatives have you considered?
5. **Additional Context**: Mockups, examples, related issues

### Feature Request Template

```markdown
## Problem Statement
[Describe the problem this feature would solve]

## Proposed Solution
[Describe your ideal solution]

## Use Cases
1.
2.

## Alternatives Considered
[What other solutions have you thought about?]

## Additional Context
[Mockups, examples, related issues]
```

## 🔧 Development Setup

### Prerequisites

- Node.js 18+ or Bun
- PostgreSQL 14+ (or Supabase account)
- Git

### Setting Up Your Development Environment

1. **Fork the Repository**

   Click the "Fork" button on GitHub to create your own copy.

2. **Clone Your Fork**

   ```bash
   git clone https://github.com/YOUR_USERNAME/v-secure.git
   cd v-secure
   ```

3. **Add Upstream Remote**

   ```bash
   git remote add upstream https://github.com/lanonasis/v-secure.git
   ```

4. **Install Dependencies**

   ```bash
   npm install
   # or
   bun install
   ```

5. **Set Up Environment**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

6. **Run Database Migrations**

   ```bash
   npm run migrate
   ```

7. **Run Tests**

   ```bash
   npm test
   ```

8. **Start Development Server**

   ```bash
   npm run dev
   ```

## 📝 Pull Request Process

### Before You Start

1. **Create an Issue First**: For significant changes, create an issue to discuss your approach
2. **Check Existing PRs**: Make sure someone isn't already working on it
3. **Keep It Focused**: One PR = One feature/fix

### Development Workflow

1. **Create a Branch**

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

   Branch naming conventions:
   - `feature/` for new features
   - `fix/` for bug fixes
   - `docs/` for documentation
   - `refactor/` for refactoring
   - `test/` for test improvements
   - `security/` for security improvements

2. **Make Your Changes**

   - Write clean, readable code
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed
   - Keep commits atomic and well-described

3. **Write Good Commit Messages**

   ```
   feat: add support for custom encryption algorithms

   - Implement plugin system for encryption providers
   - Add AES-512 support
   - Update documentation with examples

   Closes #123
   ```

   Commit prefixes:
   - `feat:` new feature
   - `fix:` bug fix
   - `docs:` documentation changes
   - `style:` formatting, missing semicolons, etc.
   - `refactor:` code restructuring
   - `test:` adding tests
   - `chore:` maintenance tasks
   - `security:` security improvements

4. **Test Thoroughly**

   ```bash
   # Run all tests
   npm test

   # Run type checking
   npm run type-check

   # Run linting
   npm run lint

   # Test the build
   npm run build
   ```

5. **Update Documentation**

   - Update README.md if you've added features
   - Add JSDoc comments to new functions
   - Update API documentation
   - Add examples if helpful

6. **Push to Your Fork**

   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create Pull Request**

   - Go to GitHub and create a PR from your branch
   - Fill out the PR template completely
   - Link related issues
   - Request review from maintainers

### Pull Request Template

```markdown
## Description
[Brief description of the changes]

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Security improvement

## Related Issues
Closes #[issue number]

## Changes Made
-
-
-

## Testing
- [ ] All existing tests pass
- [ ] Added new tests for new functionality
- [ ] Manual testing completed

## Checklist
- [ ] My code follows the project's code style
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

## Screenshots (if applicable)
[Add screenshots here]

## Additional Context
[Any other relevant information]
```

## 🎨 Code Style Guidelines

### TypeScript/JavaScript

- Use TypeScript for all new code
- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings (unless template literals)
- Prefer `const` over `let`, avoid `var`
- Use meaningful variable names
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Example

```typescript
/**
 * Retrieves an encrypted secret from the database
 * @param key - The unique identifier for the secret
 * @param userId - The ID of the user requesting the secret
 * @returns The decrypted secret value or null if not found
 * @throws {UnauthorizedError} If user doesn't have access
 */
export async function getSecret(
  key: string,
  userId: string
): Promise<string | null> {
  // Validate inputs
  if (!key || !userId) {
    throw new Error('Key and userId are required');
  }

  // Fetch from database
  const secret = await db.secrets.findUnique({
    where: { key, userId }
  });

  // Return decrypted value
  return secret ? decrypt(secret.value) : null;
}
```

### Database

- Use parameterized queries (never string concatenation)
- Add indexes for frequently queried columns
- Use transactions for multi-step operations
- Include migration files for schema changes

### Security

- Never log sensitive information
- Always validate and sanitize inputs
- Use prepared statements for database queries
- Follow the principle of least privilege
- Encrypt sensitive data at rest
- Use secure random number generation

## 🧪 Testing Guidelines

- Write tests for all new features
- Maintain >80% code coverage
- Include unit tests and integration tests
- Test edge cases and error conditions
- Mock external dependencies

### Test Structure

```typescript
describe('SecretService', () => {
  describe('getSecret', () => {
    it('should return decrypted secret for valid key', async () => {
      // Arrange
      const key = 'DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
      const userId = 'user-123';

      // Act
      const result = await secretService.getSecret(key, userId);

      // Assert
      expect(result).toBe('postgresql://<user>:<password>@<host>:<port>/<db>);
    });

    it('should return null for non-existent key', async () => {
      // Test implementation
    });

    it('should throw error for unauthorized access', async () => {
      // Test implementation
    });
  });
});
```

## 📚 Documentation

Good documentation is crucial for v-secure. When contributing:

- Update README.md for new features
- Add JSDoc comments to all public APIs
- Include code examples in documentation
- Update architecture diagrams if applicable
- Keep the CHANGELOG.md updated

## 🚀 Release Process

Maintainers handle releases, but here's the process:

1. Update CHANGELOG.md
2. Bump version in package.json
3. Create git tag
4. Push to GitHub
5. Create GitHub release
6. Publish to npm (if applicable)

## 📋 Code Review Process

All submissions require review. We look for:

- **Correctness**: Does the code work as intended?
- **Security**: Are there any security implications?
- **Performance**: Is the code efficient?
- **Maintainability**: Is the code readable and well-structured?
- **Testing**: Are there adequate tests?
- **Documentation**: Is the code well-documented?

### Review Turnaround

- We aim to review PRs within 48 hours
- Complex PRs may take longer
- Feel free to ping us if we're slow!

## 🏷️ Issue Labels

We use labels to organize issues:

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Documentation improvements
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention needed
- `security`: Security-related issue
- `breaking change`: Breaking API changes
- `needs discussion`: Needs community input

## 💬 Communication

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and discussions
- **Discord**: Real-time chat and community support
- **Email**: security@lanonasis.com for security issues

## 🙏 Recognition

Contributors are recognized in:

- GitHub contributors page
- CHANGELOG.md (for significant contributions)
- README.md acknowledgments section

## 📜 Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you're expected to uphold this code.

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## Questions?

Don't hesitate to ask! We're here to help:

- Open a GitHub Discussion
- Join our Discord
- Email us at support@lanonasis.com

Thank you for contributing to v-secure! 🎉
