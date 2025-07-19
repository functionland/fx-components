/**
 * Validation script for contract integration
 * This script validates that all the contract integration components are properly set up
 */

import { getChainConfigByName, CONTRACT_ADDRESSES } from '../contracts/config';
import { POOL_STORAGE_ABI, REWARD_ENGINE_ABI } from '../contracts/abis';
import { SupportedChain } from '../contracts/types';

// Validation functions
const validateChainConfig = (chain: SupportedChain) => {
  console.log(`\n🔍 Validating ${chain} chain configuration...`);
  
  const config = getChainConfigByName(chain);
  
  // Check required fields
  const requiredFields = ['chainId', 'name', 'rpcUrl', 'blockExplorer', 'contracts'];
  const missingFields = requiredFields.filter(field => !config[field]);
  
  if (missingFields.length > 0) {
    console.error(`❌ Missing required fields for ${chain}: ${missingFields.join(', ')}`);
    return false;
  }
  
  // Check contract addresses
  if (!config.contracts.poolStorage || !config.contracts.rewardEngine) {
    console.error(`❌ Missing contract addresses for ${chain}`);
    return false;
  }
  
  // Check if addresses are placeholder values
  if (config.contracts.poolStorage === '0x0000000000000000000000000000000000000000') {
    console.warn(`⚠️  ${chain} pool storage contract address is placeholder`);
  }
  
  if (config.contracts.rewardEngine === '0x0000000000000000000000000000000000000000') {
    console.warn(`⚠️  ${chain} reward engine contract address is placeholder`);
  }
  
  console.log(`✅ ${chain} configuration is valid`);
  console.log(`   Chain ID: ${config.chainId}`);
  console.log(`   Name: ${config.name}`);
  console.log(`   RPC URL: ${config.rpcUrl}`);
  console.log(`   Requires Auth: ${config.requiresAuth || false}`);
  
  return true;
};

const validateABIs = () => {
  console.log('\n🔍 Validating contract ABIs...');
  
  // Check if ABIs are arrays and not empty
  if (!Array.isArray(POOL_STORAGE_ABI) || POOL_STORAGE_ABI.length === 0) {
    console.error('❌ Pool Storage ABI is invalid or empty');
    return false;
  }
  
  if (!Array.isArray(REWARD_ENGINE_ABI) || REWARD_ENGINE_ABI.length === 0) {
    console.error('❌ Reward Engine ABI is invalid or empty');
    return false;
  }
  
  // Check for required functions in Pool Storage ABI
  const poolStorageFunctions = POOL_STORAGE_ABI
    .filter(item => item.type === 'function')
    .map(item => item.name);
  
  const requiredPoolFunctions = [
    'createPool', 'joinPool', 'leavePool', 'cancelJoinRequest', 
    'voteJoinRequest', 'getPool', 'listPools', 'getUserPool', 'getJoinRequest'
  ];
  
  const missingPoolFunctions = requiredPoolFunctions.filter(
    func => !poolStorageFunctions.includes(func)
  );
  
  if (missingPoolFunctions.length > 0) {
    console.error(`❌ Missing Pool Storage functions: ${missingPoolFunctions.join(', ')}`);
    return false;
  }
  
  // Check for required functions in Reward Engine ABI
  const rewardEngineFunctions = REWARD_ENGINE_ABI
    .filter(item => item.type === 'function')
    .map(item => item.name);
  
  const requiredRewardFunctions = [
    'claimRewards', 'distributeRewards', 'getRewards', 
    'getTotalRewards', 'getClaimableRewards'
  ];
  
  const missingRewardFunctions = requiredRewardFunctions.filter(
    func => !rewardEngineFunctions.includes(func)
  );
  
  if (missingRewardFunctions.length > 0) {
    console.error(`❌ Missing Reward Engine functions: ${missingRewardFunctions.join(', ')}`);
    return false;
  }
  
  console.log('✅ Contract ABIs are valid');
  console.log(`   Pool Storage functions: ${poolStorageFunctions.length}`);
  console.log(`   Reward Engine functions: ${rewardEngineFunctions.length}`);
  
  return true;
};

const validateHooks = () => {
  console.log('\n🔍 Validating React hooks...');
  
  try {
    // Try to import hooks (this will fail if there are syntax errors)
    require('../hooks/useContractIntegration');
    require('../hooks/usePools');
    require('../hooks/useRewards');
    
    console.log('✅ All hooks imported successfully');
    return true;
  } catch (error) {
    console.error('❌ Error importing hooks:', error.message);
    return false;
  }
};

const validateStores = () => {
  console.log('\n🔍 Validating store integration...');
  
  try {
    // Try to import updated stores
    require('../stores/useSettingsStore');
    require('../stores/useUserProfileStore');
    
    console.log('✅ All stores imported successfully');
    return true;
  } catch (error) {
    console.error('❌ Error importing stores:', error.message);
    return false;
  }
};

const validateComponents = () => {
  console.log('\n🔍 Validating component integration...');
  
  try {
    // Try to import updated components
    require('../screens/Settings/ChainSelection.screen');
    
    console.log('✅ All components imported successfully');
    return true;
  } catch (error) {
    console.error('❌ Error importing components:', error.message);
    return false;
  }
};

// Main validation function
const runValidation = () => {
  console.log('🚀 Starting Contract Integration Validation\n');
  
  let allValid = true;
  
  // Validate chain configurations
  const supportedChains: SupportedChain[] = ['skale', 'base'];
  for (const chain of supportedChains) {
    if (!validateChainConfig(chain)) {
      allValid = false;
    }
  }
  
  // Validate ABIs
  if (!validateABIs()) {
    allValid = false;
  }
  
  // Validate hooks
  if (!validateHooks()) {
    allValid = false;
  }
  
  // Validate stores
  if (!validateStores()) {
    allValid = false;
  }
  
  // Validate components
  if (!validateComponents()) {
    allValid = false;
  }
  
  console.log('\n📊 Validation Summary:');
  if (allValid) {
    console.log('✅ All validations passed! Contract integration is ready.');
    console.log('\n📝 Next Steps:');
    console.log('1. Deploy contracts to SKALE and Base networks');
    console.log('2. Update contract addresses in config.ts');
    console.log('3. Test with real wallet connections');
    console.log('4. Verify pool operations work end-to-end');
  } else {
    console.log('❌ Some validations failed. Please fix the issues above.');
  }
  
  return allValid;
};

// Export for use in other scripts
export { runValidation, validateChainConfig, validateABIs };

// Run validation if this script is executed directly
if (require.main === module) {
  runValidation();
}
