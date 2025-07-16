export const POOL_STORAGE_ABI = [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [],
      "name": "AIP",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "ARQ",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "AV",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "AccessControlBadConfirmation",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "internalType": "bytes32",
          "name": "neededRole",
          "type": "bytes32"
        }
      ],
      "name": "AccessControlUnauthorizedAccount",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "target",
          "type": "address"
        }
      ],
      "name": "AddressEmptyCode",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "target",
          "type": "address"
        }
      ],
      "name": "AlreadyOwnsRole",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "AlreadyUpgraded",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "AmountMustBePositive",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "CR",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "CannotRemoveSelf",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "waitUntil",
          "type": "uint256"
        }
      ],
      "name": "CoolDownActive",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "implementation",
          "type": "address"
        }
      ],
      "name": "ERC1967InvalidImplementation",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "ERC1967NonPayable",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "EnforcedPause",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "allowedTime",
          "type": "uint256"
        }
      ],
      "name": "ExecutionDelayNotMet",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "target",
          "type": "address"
        }
      ],
      "name": "ExistingActiveProposal",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "ExpectedPause",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint8",
          "name": "status",
          "type": "uint8"
        }
      ],
      "name": "Failed",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "FailedCall",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "IA",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "ITA",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint16",
          "name": "requiredApprovals",
          "type": "uint16"
        },
        {
          "internalType": "uint16",
          "name": "approvals",
          "type": "uint16"
        }
      ],
      "name": "InsufficientApprovals",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidAddress",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidInitialization",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint8",
          "name": "proposalType",
          "type": "uint8"
        }
      ],
      "name": "InvalidProposalType",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "uint16",
          "name": "quorum",
          "type": "uint16"
        }
      ],
      "name": "InvalidQuorumErr",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        }
      ],
      "name": "InvalidRole",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "LimitTooHigh",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "walletBalance",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "requiredBalance",
          "type": "uint256"
        }
      ],
      "name": "LowBalance",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "MinimumRoleNoRequired",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "NAR",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "NM",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "NotInitializing",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "NotPendingOwner",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "OCA",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "OwnableInvalidOwner",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "OwnableUnauthorizedAccount",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "PNE",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "PNF",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "PNF2",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "PRE",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint8",
          "name": "err",
          "type": "uint8"
        }
      ],
      "name": "ProposalErr",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "ReentrancyGuardReentrantCall",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "uint8",
          "name": "status",
          "type": "uint8"
        }
      ],
      "name": "RoleAssignment",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "token",
          "type": "address"
        }
      ],
      "name": "SafeERC20FailedOperation",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "operator",
          "type": "address"
        }
      ],
      "name": "TimeLockActive",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "TransferRestricted",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "UF",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "UUPSUnauthorizedCallContext",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "slot",
          "type": "bytes32"
        }
      ],
      "name": "UUPSUnsupportedProxiableUUID",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "oldAmount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "newAmount",
          "type": "uint256"
        }
      ],
      "name": "CreatePoolLockAmountUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint8",
          "name": "action",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "caller",
          "type": "address"
        }
      ],
      "name": "EA",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "EmergencyTokensRecovered",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "ForfeitFlagCleared",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "ForfeitFlagSet",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint64",
          "name": "version",
          "type": "uint64"
        }
      ],
      "name": "Initialized",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint32",
          "name": "poolId",
          "type": "uint32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "peerId",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "approved",
          "type": "bool"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "tokensForfeited",
          "type": "bool"
        }
      ],
      "name": "JoinRequestResolved",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint32",
          "name": "poolId",
          "type": "uint32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "peerId",
          "type": "bytes32"
        }
      ],
      "name": "JoinRequestSubmitted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint32",
          "name": "poolId",
          "type": "uint32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "peerId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "addedBy",
          "type": "address"
        }
      ],
      "name": "MemberAdded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint32",
          "name": "poolId",
          "type": "uint32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "peerId",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "tokensForfeited",
          "type": "bool"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "removedBy",
          "type": "address"
        }
      ],
      "name": "MemberRemoved",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferStarted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "Paused",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint32",
          "name": "poolId",
          "type": "uint32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "creator",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "region",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "requiredTokens",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint32",
          "name": "maxMembers",
          "type": "uint32"
        }
      ],
      "name": "PoolCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint32",
          "name": "poolId",
          "type": "uint32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "creator",
          "type": "address"
        }
      ],
      "name": "PoolDeleted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint32",
          "name": "poolId",
          "type": "uint32"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "requiredTokens",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint32",
          "name": "maxMembers",
          "type": "uint32"
        }
      ],
      "name": "PoolParametersUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "proposalId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "uint8",
          "name": "proposalType",
          "type": "uint8"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "approver",
          "type": "address"
        }
      ],
      "name": "ProposalApproved",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "proposalId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "uint8",
          "name": "proposalType",
          "type": "uint8"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "target",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "tokenAddress",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "proposer",
          "type": "address"
        }
      ],
      "name": "ProposalCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "proposalId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "uint8",
          "name": "proposalType",
          "type": "uint8"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "target",
          "type": "address"
        }
      ],
      "name": "ProposalExecuted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "proposalId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "uint8",
          "name": "proposalType",
          "type": "uint8"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "target",
          "type": "address"
        }
      ],
      "name": "ProposalExpired",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "proposalId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "uint8",
          "name": "proposalType",
          "type": "uint8"
        }
      ],
      "name": "ProposalReadyForExecution",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "newQuorum",
          "type": "uint256"
        }
      ],
      "name": "QuorumUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "target",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "caller",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "status",
          "type": "bool"
        }
      ],
      "name": "RU",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "previousAdminRole",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "newAdminRole",
          "type": "bytes32"
        }
      ],
      "name": "RoleAdminChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        }
      ],
      "name": "RoleGranted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        }
      ],
      "name": "RoleRevoked",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "peerId",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "TokensClaimed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "peerId",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "TokensMarkedClaimable",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "newLimit",
          "type": "uint256"
        }
      ],
      "name": "TransactionLimitUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "Unpaused",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "implementation",
          "type": "address"
        }
      ],
      "name": "Upgraded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint32",
          "name": "poolId",
          "type": "uint32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "voterPeerId",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "peerIdToVote",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "approve",
          "type": "bool"
        }
      ],
      "name": "Voted",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "DEFAULT_ADMIN_ROLE",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "UPGRADE_INTERFACE_VERSION",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "acceptOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "poolId",
          "type": "uint32"
        },
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "internalType": "bytes32",
          "name": "peerId",
          "type": "bytes32"
        }
      ],
      "name": "addMember",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "adminCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "poolId",
          "type": "uint32"
        },
        {
          "internalType": "bytes32",
          "name": "peerId",
          "type": "bytes32"
        }
      ],
      "name": "approveJoinRequest",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "proposalId",
          "type": "bytes32"
        }
      ],
      "name": "approveProposal",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "poolId",
          "type": "uint32"
        },
        {
          "internalType": "bytes32",
          "name": "peerId",
          "type": "bytes32"
        }
      ],
      "name": "cancelJoinRequest",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "peerId",
          "type": "bytes32"
        }
      ],
      "name": "claimTokens",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "claimableTokens",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "maxProposalsToCheck",
          "type": "uint256"
        }
      ],
      "name": "cleanupExpiredProposals",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "region",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "requiredTokens",
          "type": "uint256"
        },
        {
          "internalType": "uint32",
          "name": "maxChallengeResponsePeriod",
          "type": "uint32"
        },
        {
          "internalType": "uint256",
          "name": "minPingTime",
          "type": "uint256"
        },
        {
          "internalType": "uint32",
          "name": "maxMembers",
          "type": "uint32"
        },
        {
          "internalType": "bytes32",
          "name": "peerId",
          "type": "bytes32"
        }
      ],
      "name": "createPool",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "createPoolLockAmount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint8",
          "name": "proposalType",
          "type": "uint8"
        },
        {
          "internalType": "uint40",
          "name": "id",
          "type": "uint40"
        },
        {
          "internalType": "address",
          "name": "target",
          "type": "address"
        },
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "uint96",
          "name": "amount",
          "type": "uint96"
        },
        {
          "internalType": "address",
          "name": "tokenAddress",
          "type": "address"
        }
      ],
      "name": "createProposal",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "poolId",
          "type": "uint32"
        }
      ],
      "name": "deletePool",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint8",
          "name": "op",
          "type": "uint8"
        }
      ],
      "name": "emergencyAction",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "emergencyRecoverTokens",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "proposalId",
          "type": "bytes32"
        }
      ],
      "name": "executeProposal",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "poolId",
          "type": "uint32"
        },
        {
          "internalType": "address",
          "name": "member",
          "type": "address"
        }
      ],
      "name": "getMemberIndex",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "poolId",
          "type": "uint32"
        },
        {
          "internalType": "address",
          "name": "member",
          "type": "address"
        }
      ],
      "name": "getMemberPeerIds",
      "outputs": [
        {
          "internalType": "bytes32[]",
          "name": "",
          "type": "bytes32[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "poolId",
          "type": "uint32"
        },
        {
          "internalType": "bytes32",
          "name": "peerId",
          "type": "bytes32"
        }
      ],
      "name": "getPeerIdInfo",
      "outputs": [
        {
          "internalType": "address",
          "name": "member",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "lockedTokens",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "poolId",
          "type": "uint32"
        }
      ],
      "name": "getPoolMembers",
      "outputs": [
        {
          "internalType": "address[]",
          "name": "",
          "type": "address[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        }
      ],
      "name": "getRoleAdmin",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getTotalMembers",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "total",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "poolId",
          "type": "uint32"
        },
        {
          "internalType": "bytes32",
          "name": "peerId",
          "type": "bytes32"
        },
        {
          "internalType": "bytes32",
          "name": "voterPeerId",
          "type": "bytes32"
        }
      ],
      "name": "getVote",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "grantRole",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "proposalId",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "hasProposalApproval",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "hasRole",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_storageToken",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_tokenPool",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "initialOwner",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "initialAdmin",
          "type": "address"
        }
      ],
      "name": "initialize",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "isForfeited",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "isMemberOfAnyPool",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "poolId",
          "type": "uint32"
        },
        {
          "internalType": "bytes32",
          "name": "peerId",
          "type": "bytes32"
        }
      ],
      "name": "isPeerIdMemberOfPool",
      "outputs": [
        {
          "internalType": "bool",
          "name": "isMember",
          "type": "bool"
        },
        {
          "internalType": "address",
          "name": "memberAddress",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "poolId",
          "type": "uint32"
        },
        {
          "internalType": "bytes32",
          "name": "peerId",
          "type": "bytes32"
        }
      ],
      "name": "joinPoolRequest",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "",
          "type": "uint32"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "joinRequestKeys",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "",
          "type": "uint32"
        },
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "joinRequests",
      "outputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "internalType": "uint32",
          "name": "poolId",
          "type": "uint32"
        },
        {
          "internalType": "uint32",
          "name": "timestamp",
          "type": "uint32"
        },
        {
          "internalType": "uint32",
          "name": "index",
          "type": "uint32"
        },
        {
          "internalType": "uint128",
          "name": "approvals",
          "type": "uint128"
        },
        {
          "internalType": "uint128",
          "name": "rejections",
          "type": "uint128"
        },
        {
          "internalType": "uint8",
          "name": "status",
          "type": "uint8"
        },
        {
          "internalType": "bytes32",
          "name": "peerId",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "joinTimestamp",
      "outputs": [
        {
          "internalType": "uint32",
          "name": "",
          "type": "uint32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "paused",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "pendingOwner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "pendingProposals",
      "outputs": [
        {
          "internalType": "uint8",
          "name": "proposalType",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "poolIds",
      "outputs": [
        {
          "internalType": "uint32",
          "name": "",
          "type": "uint32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "",
          "type": "uint32"
        }
      ],
      "name": "pools",
      "outputs": [
        {
          "internalType": "address",
          "name": "creator",
          "type": "address"
        },
        {
          "internalType": "uint32",
          "name": "id",
          "type": "uint32"
        },
        {
          "internalType": "uint32",
          "name": "maxChallengeResponsePeriod",
          "type": "uint32"
        },
        {
          "internalType": "uint32",
          "name": "memberCount",
          "type": "uint32"
        },
        {
          "internalType": "uint32",
          "name": "maxMembers",
          "type": "uint32"
        },
        {
          "internalType": "uint256",
          "name": "requiredTokens",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "minPingTime",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "region",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "proposalCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "proposalIndex",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "proposalRegistry",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "proposals",
      "outputs": [
        {
          "internalType": "uint8",
          "name": "proposalType",
          "type": "uint8"
        },
        {
          "internalType": "address",
          "name": "target",
          "type": "address"
        },
        {
          "internalType": "uint40",
          "name": "id",
          "type": "uint40"
        },
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "tokenAddress",
          "type": "address"
        },
        {
          "internalType": "uint96",
          "name": "amount",
          "type": "uint96"
        },
        {
          "components": [
            {
              "internalType": "uint64",
              "name": "expiryTime",
              "type": "uint64"
            },
            {
              "internalType": "uint64",
              "name": "executionTime",
              "type": "uint64"
            },
            {
              "internalType": "uint16",
              "name": "approvals",
              "type": "uint16"
            },
            {
              "internalType": "uint8",
              "name": "status",
              "type": "uint8"
            }
          ],
          "internalType": "struct ProposalTypes.ProposalConfig",
          "name": "config",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "proxiableUUID",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "poolId",
          "type": "uint32"
        },
        {
          "internalType": "bytes32",
          "name": "peerId",
          "type": "bytes32"
        }
      ],
      "name": "removeMemberPeerId",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "poolId",
          "type": "uint32"
        },
        {
          "internalType": "uint256",
          "name": "count",
          "type": "uint256"
        }
      ],
      "name": "removeMembersBatch",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "callerConfirmation",
          "type": "address"
        }
      ],
      "name": "renounceRole",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "revokeRole",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "roleConfigs",
      "outputs": [
        {
          "internalType": "uint16",
          "name": "quorum",
          "type": "uint16"
        },
        {
          "internalType": "uint240",
          "name": "transactionLimit",
          "type": "uint240"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "safeTransferWrapper",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_amount",
          "type": "uint256"
        }
      ],
      "name": "setCreatePoolLockAmount",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "internalType": "bool",
          "name": "flag",
          "type": "bool"
        }
      ],
      "name": "setForfeitFlag",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "poolId",
          "type": "uint32"
        },
        {
          "internalType": "uint32",
          "name": "newMax",
          "type": "uint32"
        }
      ],
      "name": "setMaxMembers",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "poolId",
          "type": "uint32"
        },
        {
          "internalType": "uint256",
          "name": "newRequired",
          "type": "uint256"
        }
      ],
      "name": "setRequiredTokens",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "uint16",
          "name": "quorum",
          "type": "uint16"
        }
      ],
      "name": "setRoleQuorum",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "uint240",
          "name": "limit",
          "type": "uint240"
        }
      ],
      "name": "setRoleTransactionLimit",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "storageToken",
      "outputs": [
        {
          "internalType": "contract IERC20",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes4",
          "name": "interfaceId",
          "type": "bytes4"
        }
      ],
      "name": "supportsInterface",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "timeConfigs",
      "outputs": [
        {
          "internalType": "uint64",
          "name": "lastActivityTime",
          "type": "uint64"
        },
        {
          "internalType": "uint64",
          "name": "roleChangeTimeLock",
          "type": "uint64"
        },
        {
          "internalType": "uint64",
          "name": "whitelistLockTime",
          "type": "uint64"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "tokenPool",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "upgradeProposals",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newImplementation",
          "type": "address"
        },
        {
          "internalType": "bytes",
          "name": "data",
          "type": "bytes"
        }
      ],
      "name": "upgradeToAndCall",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "poolId",
          "type": "uint32"
        },
        {
          "internalType": "bytes32",
          "name": "peerId",
          "type": "bytes32"
        },
        {
          "internalType": "bytes32",
          "name": "voterPeerId",
          "type": "bytes32"
        },
        {
          "internalType": "bool",
          "name": "approve",
          "type": "bool"
        }
      ],
      "name": "voteOnJoinRequest",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];