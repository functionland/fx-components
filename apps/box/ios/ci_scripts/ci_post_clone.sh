#!/bin/bash

set -e

# Install Node.js
NODE_VERSION=18
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install $NODE_VERSION
nvm use $NODE_VERSION

# Install Yarn
npm install -g yarn

# Install CocoaPods
brew install cocoapods

# Navigate to the project root
cd /Volumes/workspace/repository

# Print current directory for debugging
pwd
ls -la

# Install yarn dependencies
yarn install

# Navigate to the iOS directory
cd apps/box/ios

# Install pods
pod install

# Return to the project root
cd /Volumes/workspace/repository

# Print Node.js, npm, and Yarn versions for debugging
node --version
npm --version
yarn --version