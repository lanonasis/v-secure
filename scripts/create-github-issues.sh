#!/bin/bash

# Script to create GitHub issues from phase documents
# Requires: GitHub CLI (gh) installed and authenticated
# Usage: ./scripts/create-github-issues.sh [phase_number]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed${NC}"
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with GitHub CLI${NC}"
    echo "Run: gh auth login"
    exit 1
fi

# Function to create issue
create_issue() {
    local title="$1"
    local body="$2"
    local labels="$3"
    local milestone="$4"
    
    echo -e "${YELLOW}Creating issue: $title${NC}"
    
    if [ -n "$milestone" ]; then
        gh issue create \
            --title "$title" \
            --body "$body" \
            --label "$labels" \
            --milestone "$milestone"
    else
        gh issue create \
            --title "$title" \
            --body "$body" \
            --label "$labels"
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Created successfully${NC}"
    else
        echo -e "${RED}✗ Failed to create${NC}"
    fi
    echo ""
}

# Phase 1 Issues
create_phase_1() {
    echo -e "${GREEN}Creating Phase 1 Issues (Foundation & Documentation)${NC}"
    echo ""
    
    # Issue 1
    create_issue \
        "Create SECURITY.md File" \
        "Create a comprehensive SECURITY.md file to document our security policy and vulnerability reporting process.

**Tasks**:
- [ ] Create \`.github/SECURITY.md\` file
- [ ] Document supported versions
- [ ] Add vulnerability reporting instructions
- [ ] Include security contact: security@lanonasis.com
- [ ] Add expected response times
- [ ] Document security update process
- [ ] Reference existing security features from CONTRIBUTING.md

**Acceptance Criteria**:
- File follows GitHub's security policy format
- Clear instructions for reporting vulnerabilities
- Contact information is accurate
- Links to relevant documentation

**References**:
- See \`.github/ISSUES_PHASE_1_FOUNDATION.md\` for full details
- GitHub Security Policy Guide: https://docs.github.com/en/code-security/getting-started/adding-a-security-policy-to-your-repository" \
        "documentation,security,good first issue,priority: high,effort: S" \
        "Foundation Complete"
    
    # Issue 2
    create_issue \
        "Set Up GitHub Discussions" \
        "Enable and configure GitHub Discussions to foster community engagement.

**Tasks**:
- [ ] Enable Discussions in repository settings
- [ ] Create discussion categories (General, Q&A, Feature Requests, Show and Tell, Security, Announcements)
- [ ] Pin welcome discussion
- [ ] Create discussion guidelines
- [ ] Add discussion link to README

**Acceptance Criteria**:
- Discussions enabled and accessible
- All categories created with descriptions
- Welcome post pinned
- Guidelines documented

**References**:
- See \`.github/ISSUES_PHASE_1_FOUNDATION.md\` for full details" \
        "community,enhancement,priority: high,effort: M" \
        "Foundation Complete"
    
    # Issue 3
    create_issue \
        "Create Issue Templates" \
        "Create standardized issue templates to help contributors submit well-structured bug reports, feature requests, and questions.

**Tasks**:
- [ ] Create \`.github/ISSUE_TEMPLATE/bug_report.yml\`
- [ ] Create \`.github/ISSUE_TEMPLATE/feature_request.yml\`
- [ ] Create \`.github/ISSUE_TEMPLATE/question.yml\`
- [ ] Create \`.github/ISSUE_TEMPLATE/security_vulnerability.yml\`
- [ ] Create \`.github/ISSUE_TEMPLATE/config.yml\`
- [ ] Test each template
- [ ] Update CONTRIBUTING.md to reference templates

**Acceptance Criteria**:
- All templates use YAML format
- Templates include required fields
- Clear instructions in each template
- Security template directs to private reporting
- Templates appear when creating new issues

**References**:
- See \`.github/ISSUES_PHASE_1_FOUNDATION.md\` for full details" \
        "documentation,community,good first issue,priority: high,effort: M" \
        "Foundation Complete"
    
    # Issue 4
    create_issue \
        "Create Pull Request Template" \
        "Create a pull request template to ensure consistent and complete PR submissions.

**Tasks**:
- [ ] Create \`.github/pull_request_template.md\`
- [ ] Include comprehensive checklist
- [ ] Add PR guidelines
- [ ] Test template with a sample PR

**Acceptance Criteria**:
- Template appears automatically for new PRs
- Checklist is comprehensive but not overwhelming
- Clear instructions for contributors
- Links to CONTRIBUTING.md

**References**:
- See \`.github/ISSUES_PHASE_1_FOUNDATION.md\` for full details" \
        "documentation,community,good first issue,priority: high,effort: S" \
        "Foundation Complete"
    
    # Issue 5
    create_issue \
        "Set Up GitHub Actions for CI/CD" \
        "Implement automated testing, linting, and security checks using GitHub Actions.

**Tasks**:
- [ ] Create \`.github/workflows/ci.yml\` for continuous integration
- [ ] Add workflow for TypeScript, ESLint, tests, security audit
- [ ] Create \`.github/workflows/codeql.yml\` for security scanning
- [ ] Set up branch protection rules requiring CI to pass
- [ ] Add status badges to README
- [ ] Test workflows on a test branch

**Acceptance Criteria**:
- CI runs on all PRs and pushes to main
- All checks must pass before merge
- CodeQL security scanning enabled
- Status badges visible in README
- Workflows complete in < 5 minutes

**References**:
- See \`.github/ISSUES_PHASE_1_FOUNDATION.md\` for full details" \
        "ci/cd,automation,enhancement,priority: high,effort: L" \
        "Foundation Complete"
    
    # Issue 6
    create_issue \
        "Configure Branch Protection Rules" \
        "Set up branch protection rules to maintain code quality and prevent accidental changes to main branch.

**Tasks**:
- [ ] Enable branch protection for \`main\` branch
- [ ] Require pull request reviews (minimum 1)
- [ ] Require status checks to pass (CI/CD)
- [ ] Require branches to be up to date
- [ ] Enable \"Require linear history\"
- [ ] Document branch strategy in CONTRIBUTING.md

**Acceptance Criteria**:
- Cannot push directly to main
- PRs require at least 1 approval
- All CI checks must pass
- Branch protection rules documented

**Dependencies**: Issue #5 (CI/CD must be set up first)

**References**:
- See \`.github/ISSUES_PHASE_1_FOUNDATION.md\` for full details" \
        "repository-settings,security,priority: high,effort: S" \
        "Foundation Complete"
    
    # Issue 7
    create_issue \
        "Add Repository Topics and Description" \
        "Optimize repository discoverability by adding relevant topics and improving the description.

**Tasks**:
- [ ] Update repository description
- [ ] Add topics: security, secrets-management, api-keys, encryption, typescript, nodejs, compliance, soc2, iso27001, gdpr, audit-logs, mcp, ai-tools
- [ ] Set repository website URL (if applicable)
- [ ] Verify topics appear in search

**Acceptance Criteria**:
- Description is clear and concise (< 350 chars)
- All relevant topics added
- Repository appears in topic searches

**References**:
- See \`.github/ISSUES_PHASE_1_FOUNDATION.md\` for full details" \
        "repository-settings,good first issue,priority: medium,effort: S" \
        "Foundation Complete"
    
    echo -e "${GREEN}Phase 1 issues created!${NC}"
}

# Main script
echo ""
echo "================================================"
echo "  GitHub Issues Creation Script for v-secure"
echo "================================================"
echo ""

# Check for phase argument
PHASE=${1:-1}

case $PHASE in
    1)
        create_phase_1
        ;;
    all)
        echo -e "${YELLOW}Creating all phases...${NC}"
        create_phase_1
        # Add other phases here when ready
        ;;
    *)
        echo -e "${RED}Invalid phase number: $PHASE${NC}"
        echo "Usage: $0 [1|all]"
        echo ""
        echo "Phases:"
        echo "  1 - Foundation & Documentation (7 issues)"
        echo "  all - Create all issues (28 issues)"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Done! Check your GitHub repository for the new issues.${NC}"
echo ""
echo "Next steps:"
echo "1. Review and assign the issues"
echo "2. Set up GitHub Projects board"
echo "3. Start working on Phase 1"
echo ""
