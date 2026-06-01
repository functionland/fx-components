#!/bin/bash

set -e
CI_WORKSPACE="/Volumes/workspace/repository"

# Update Homebrew
brew update

# Install Ruby
brew install ruby

# Set up Ruby environment
export PATH="/usr/local/opt/ruby/bin:$PATH"
export LDFLAGS="-L/usr/local/opt/ruby/lib"
export CPPFLAGS="-I/usr/local/opt/ruby/include"
export GEM_HOME="$HOME/.gem"
export PATH="$GEM_HOME/bin:$PATH"

# Verify Ruby installation
which ruby
ruby --version

# Install bundler
gem install bundler

# Install Node.js
NODE_VERSION=20
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install $NODE_VERSION
nvm use $NODE_VERSION
echo "export NODE_BINARY=$(command -v node)" > .xcode.env

# Install Yarn
npm install -g yarn

# Install CocoaPods
gem install cocoapods

# Verify CocoaPods installation
which pod
pod --version

# Print environment variables
echo "PATH: $PATH"
echo "GEM_HOME: $GEM_HOME"
echo "RUBY_HOME: $(which ruby)"

# Navigate to the project root
cd $CI_WORKSPACE

corepack enable

# Print current directory for debugging
pwd
ls -la

# Install yarn dependencies
yarn install

# Run ensure:symlink
npm run ensure:symlink

# Navigate to the iOS directory
cd apps/box/ios

# Ensure CocoaPods CDN trunk repo is set up cleanly
rm -rf "$HOME/.cocoapods/repos/trunk"
pod repo add-cdn trunk https://cdn.cocoapods.org/

# Install pods.
#
# The `Fula` pod is sourced from the go-fula `main` branch (a moving target), so
# whenever upstream bumps its podspec version the version pinned in the committed
# Podfile.lock no longer matches. `pod install` refuses to rewrite the lock and
# aborts, asking for `pod update Fula --no-repo-update`. Detect exactly that case
# and self-heal by re-locking only Fula — so a `pod update Fula` on a Mac is no
# longer required after every version bump. Any OTHER install failure is left to
# fail the build (we do not blindly fall back, to avoid masking real problems).
#
# Note: if go-fula `main` moves to a version outside react-native-fula's
# `Fula (~> 1.58.2)` constraint (i.e. >= 1.59.0), `pod update Fula` will still
# fail with a genuine conflict — that requires a coordinated bump of the
# @functionland/react-native-fula package and cannot be fixed here.
set -o pipefail
if ! pod install --repo-update 2>&1 | tee pod-install.log; then
  if grep -qE 'compatible versions for pod "Fula"|pod update Fula' pod-install.log; then
    echo "Fula podspec drifted from Podfile.lock — re-locking Fula only and retrying…"
    pod update Fula --no-repo-update
  else
    echo "pod install failed for a reason unrelated to Fula drift — failing the build."
    exit 1
  fi
fi
rm -f pod-install.log

# Return to the project root
cd $CI_WORKSPACE

# Get npm package version
NPM_PACKAGE_VERSION=$(node -p "require('./apps/box/package.json').version")

# Set Xcode build number
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $NPM_PACKAGE_VERSION" "./apps/box/ios/Box/Info.plist"

# Print versions for debugging
ruby --version
gem --version
node --version
npm --version
yarn --version
pod --version