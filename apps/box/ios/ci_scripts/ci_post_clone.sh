#!/bin/bash

set -e

# Install and activate Ruby
RUBY_VERSION=3.3.5
brew install ruby@$RUBY_VERSION
echo 'export PATH="/usr/local/opt/ruby@$RUBY_VERSION/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
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
brew install cocoapods

# Navigate to the project root
cd $CI_WORKSPACE

# Print current directory for debugging
pwd
ls -la

# Install yarn dependencies
yarn install

# Run ensure:symlink
npm run ensure:symlink

# Navigate to the iOS directory
cd apps/box/ios

# Install pods
pod install --repo-update

# Return to the project root
cd $CI_WORKSPACE

# Get npm package version
NPM_PACKAGE_VERSION=$(node -p "require('./apps/box/package.json').version")

# Set Xcode build number
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $NPM_PACKAGE_VERSION" "./apps/box/ios/Box/Info.plist"

# Print versions for debugging
node --version
npm --version
yarn --version
ruby --version
pod --version