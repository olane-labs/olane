#!/bin/bash

# ============================================================================
# Lerna Release Script with pnpm Lock File Management
# ============================================================================
# This script handles versioning, lock file updates, and publishing for
# Lerna monorepos using pnpm.
#
# Usage:
#   ./scripts/release.sh <version-type> [options]
#
# Version Types:
#   patch       - Bump patch version (0.0.x)
#   minor       - Bump minor version (0.x.0)
#   major       - Bump major version (x.0.0)
#   alpha       - Create alpha prerelease (x.x.x-alpha.x)
#   beta        - Create beta prerelease (x.x.x-beta.x)
#   rc          - Create release candidate (x.x.x-rc.x)
#
# Options:
#   --dry-run   - Run without publishing or pushing to git
#   --no-push   - Skip git push (useful for testing)
#   --no-publish - Skip npm publish step
#   --help      - Show this help message
#
# Examples:
#   ./scripts/release.sh patch
#   ./scripts/release.sh alpha --dry-run
#   ./scripts/release.sh minor --no-publish
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DRY_RUN=false
NO_PUSH=false
NO_PUBLISH=false
VERSION_TYPE=""

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

show_help() {
    sed -n '/^# ====/,/^# ====/p' "$0" | sed 's/^# //g' | sed 's/^#//g'
    exit 0
}

check_git_status() {
    if [[ -n $(git status -s) ]]; then
        log_error "Working directory is not clean. Please commit or stash changes."
        git status -s
        exit 1
    fi
    log_success "Git working directory is clean"
}

check_git_branch() {
    local current_branch=$(git branch --show-current)
    if [[ "$current_branch" != "main" && "$current_branch" != "master" ]]; then
        log_warning "Not on main/master branch (current: $current_branch)"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Aborted by user"
            exit 0
        fi
    fi
}

check_pnpm_installed() {
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm is not installed. Please install it first:"
        echo "  npm install -g pnpm"
        exit 1
    fi
    log_success "pnpm is installed"
}

get_lerna_command() {
    local version_type=$1

    case $version_type in
        patch|minor|major)
            echo "lerna version $version_type --yes"
            ;;
        alpha)
            echo "lerna version prerelease --force-publish --preid alpha --yes"
            ;;
        beta)
            echo "lerna version prerelease --force-publish --preid beta --yes"
            ;;
        rc)
            echo "lerna version prerelease --force-publish --preid rc --yes"
            ;;
        *)
            log_error "Invalid version type: $version_type"
            echo "Valid types: patch, minor, major, alpha, beta, rc"
            exit 1
            ;;
    esac
}

# ============================================================================
# Main Release Steps
# ============================================================================

step_version() {
    local lerna_cmd=$(get_lerna_command "$VERSION_TYPE")

    log_info "Running: pnpm $lerna_cmd"

    if [[ "$DRY_RUN" == true ]]; then
        log_warning "DRY RUN: Would execute: pnpm $lerna_cmd"
    else
        pnpm $lerna_cmd
        log_success "Version bumped successfully"
    fi
}

step_update_lock() {
    log_info "Updating pnpm-lock.yaml..."

    if [[ "$DRY_RUN" == true ]]; then
        log_warning "DRY RUN: Would execute: pnpm install"
    else
        pnpm install
        log_success "Lock file updated"
    fi
}

step_commit_lock() {
    if [[ -z $(git status -s pnpm-lock.yaml) ]]; then
        log_info "No changes to pnpm-lock.yaml, skipping commit"
        return
    fi

    log_info "Committing pnpm-lock.yaml changes..."

    if [[ "$DRY_RUN" == true ]]; then
        log_warning "DRY RUN: Would commit pnpm-lock.yaml"
        git diff pnpm-lock.yaml | head -20
    else
        git add pnpm-lock.yaml
        git commit -m "chore: update pnpm-lock.yaml after version bump"
        log_success "Lock file changes committed"
    fi
}

step_push_git() {
    if [[ "$NO_PUSH" == true ]]; then
        log_warning "Skipping git push (--no-push flag)"
        return
    fi

    log_info "Pushing changes and tags to remote..."

    if [[ "$DRY_RUN" == true ]]; then
        log_warning "DRY RUN: Would execute: git push && git push --tags"
    else
        git push
        git push --tags
        log_success "Changes and tags pushed to remote"
    fi
}

step_publish() {
    if [[ "$NO_PUBLISH" == true ]]; then
        log_warning "Skipping npm publish (--no-publish flag)"
        return
    fi

    log_info "Publishing packages to npm..."

    if [[ "$DRY_RUN" == true ]]; then
        log_warning "DRY RUN: Would execute: pnpm lerna publish from-package --yes"
        pnpm lerna publish from-package --no-push --no-git-tag-version
    else
        pnpm lerna publish from-package --yes
        log_success "Packages published successfully"
    fi
}

# ============================================================================
# Argument Parsing
# ============================================================================

if [[ $# -eq 0 ]]; then
    log_error "No version type specified"
    echo ""
    show_help
fi

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        patch|minor|major|alpha|beta|rc)
            VERSION_TYPE=$1
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --no-push)
            NO_PUSH=true
            shift
            ;;
        --no-publish)
            NO_PUBLISH=true
            shift
            ;;
        --help|-h)
            show_help
            ;;
        *)
            log_error "Unknown option: $1"
            echo ""
            show_help
            ;;
    esac
done

# Validate version type was provided
if [[ -z "$VERSION_TYPE" ]]; then
    log_error "Version type is required"
    echo ""
    show_help
fi

# ============================================================================
# Main Execution
# ============================================================================

echo ""
log_info "======================================"
log_info "Lerna Release Script"
log_info "======================================"
log_info "Version Type: $VERSION_TYPE"
log_info "Dry Run: $DRY_RUN"
log_info "Skip Push: $NO_PUSH"
log_info "Skip Publish: $NO_PUBLISH"
log_info "======================================"
echo ""

# Pre-flight checks
log_info "Running pre-flight checks..."
check_pnpm_installed
check_git_status
check_git_branch
echo ""

# Execute release steps
log_info "Starting release process..."
echo ""

step_version
echo ""

step_update_lock
echo ""

step_commit_lock
echo ""

step_push_git
echo ""

step_publish
echo ""

# Summary
log_info "======================================"
if [[ "$DRY_RUN" == true ]]; then
    log_warning "DRY RUN COMPLETED"
    log_info "No actual changes were made"
else
    log_success "RELEASE COMPLETED SUCCESSFULLY"
fi
log_info "======================================"
echo ""

# Show next steps if needed
if [[ "$NO_PUSH" == true && "$DRY_RUN" == false ]]; then
    log_warning "Remember to push your changes:"
    echo "  git push && git push --tags"
fi

if [[ "$NO_PUBLISH" == true && "$DRY_RUN" == false ]]; then
    log_warning "Remember to publish your packages:"
    echo "  pnpm lerna publish from-package --yes"
fi
