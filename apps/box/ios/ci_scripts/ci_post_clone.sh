#!/bin/bash

set -e

# Install Node.js
NODE_VERSION=16
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install $NODE_VERSION
nvm use $NODE_VERSION

# Install CocoaPods
brew install cocoapods

# Navigate to the fx-components directory
cd $CI_WORKSPACE/fx-components

# Install yarn dependencies
yarn install

# Navigate to the iOS directory
cd apps/box/ios

# Install pods
pod install

# Return to the project root
cd $CI_WORKSPACE

# Print Node.js and npm versions for debugging
node --version
npm --version