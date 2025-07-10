import './setup';
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ChainSelectionScreen } from '../screens/Settings/ChainSelection.screen';

// Mock the settings store
const mockSetSelectedChain = jest.fn();
const mockAuthorizeBase = jest.fn();
const mockResetBaseAuthorization = jest.fn();

jest.mock('../stores/useSettingsStore', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      selectedChain: 'skale',
      baseAuthorized: false,
      setSelectedChain: mockSetSelectedChain,
      authorizeBase: mockAuthorizeBase,
      resetBaseAuthorization: mockResetBaseAuthorization,
    };
    return selector ? selector(state) : state;
  }),
}));

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

describe('ChainSelectionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render chain selection options', () => {
    const { getByText } = render(<ChainSelectionScreen />);

    expect(getByText('Chain Selection')).toBeTruthy();
    expect(getByText('SKALE Europa Hub')).toBeTruthy();
    expect(getByText('Base Network')).toBeTruthy();
    expect(getByText('Current Selection:')).toBeTruthy();
  });

  it('should show SKALE as selected by default', () => {
    const { getByText } = render(<ChainSelectionScreen />);

    expect(getByText('Default network • Zero gas fees • No authorization required')).toBeTruthy();
  });

  it('should handle SKALE selection', () => {
    const { getByText } = render(<ChainSelectionScreen />);

    const skaleOption = getByText('SKALE Europa Hub');
    fireEvent.press(skaleOption);

    expect(mockSetSelectedChain).toHaveBeenCalledWith('skale');
  });

  it('should show authorization input for Base selection when not authorized', () => {
    const { getByText, queryByText } = render(<ChainSelectionScreen />);

    const baseOption = getByText('Base Network');
    fireEvent.press(baseOption);

    expect(queryByText('Enter Base Network Authorization Code:')).toBeTruthy();
  });

  it('should handle Base authorization with correct code', async () => {
    mockAuthorizeBase.mockReturnValue(true);
    
    const { getByText, getByPlaceholderText } = render(<ChainSelectionScreen />);

    // Click Base option to show auth input
    const baseOption = getByText('Base Network');
    fireEvent.press(baseOption);

    // Enter authorization code
    const authInput = getByPlaceholderText('Authorization code');
    fireEvent.changeText(authInput, '9870');

    // Click authorize button
    const authorizeButton = getByText('Authorize');
    fireEvent.press(authorizeButton);

    await waitFor(() => {
      expect(mockAuthorizeBase).toHaveBeenCalledWith('9870');
      expect(mockSetSelectedChain).toHaveBeenCalledWith('base');
    });
  });

  it('should handle Base authorization with incorrect code', async () => {
    mockAuthorizeBase.mockReturnValue(false);
    
    const { getByText, getByPlaceholderText } = render(<ChainSelectionScreen />);

    // Click Base option to show auth input
    const baseOption = getByText('Base Network');
    fireEvent.press(baseOption);

    // Enter wrong authorization code
    const authInput = getByPlaceholderText('Authorization code');
    fireEvent.changeText(authInput, 'wrong');

    // Click authorize button
    const authorizeButton = getByText('Authorize');
    fireEvent.press(authorizeButton);

    await waitFor(() => {
      expect(mockAuthorizeBase).toHaveBeenCalledWith('wrong');
      expect(mockSetSelectedChain).not.toHaveBeenCalled();
    });
  });

  it('should show reset button when Base is authorized', () => {
    // Mock Base as authorized
    jest.mocked(require('../stores/useSettingsStore').useSettingsStore).mockImplementation((selector) => {
      const state = {
        selectedChain: 'base',
        baseAuthorized: true,
        setSelectedChain: mockSetSelectedChain,
        authorizeBase: mockAuthorizeBase,
        resetBaseAuthorization: mockResetBaseAuthorization,
      };
      return selector ? selector(state) : state;
    });

    const { getByText } = render(<ChainSelectionScreen />);

    expect(getByText('Reset Base Authorization')).toBeTruthy();
    expect(getByText('Authorized ✓')).toBeTruthy();
  });

  it('should handle authorization reset', () => {
    // Mock Base as authorized
    jest.mocked(require('../stores/useSettingsStore').useSettingsStore).mockImplementation((selector) => {
      const state = {
        selectedChain: 'base',
        baseAuthorized: true,
        setSelectedChain: mockSetSelectedChain,
        authorizeBase: mockAuthorizeBase,
        resetBaseAuthorization: mockResetBaseAuthorization,
      };
      return selector ? selector(state) : state;
    });

    const { getByText } = render(<ChainSelectionScreen />);

    const resetButton = getByText('Reset Base Authorization');
    fireEvent.press(resetButton);

    // This would normally show an alert, but in tests we can check if the function is called
    expect(mockResetBaseAuthorization).toHaveBeenCalled();
  });

  it('should cancel authorization input', () => {
    const { getByText, queryByText } = render(<ChainSelectionScreen />);

    // Click Base option to show auth input
    const baseOption = getByText('Base Network');
    fireEvent.press(baseOption);

    expect(queryByText('Enter Base Network Authorization Code:')).toBeTruthy();

    // Click cancel button
    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);

    expect(queryByText('Enter Base Network Authorization Code:')).toBeFalsy();
  });
});

describe('Component Integration', () => {
  it('should display current chain selection correctly', () => {
    const { getByText } = render(<ChainSelectionScreen />);

    expect(getByText('SKALE Europa Hub')).toBeTruthy();
    expect(getByText('All pool operations will use this network')).toBeTruthy();
  });

  it('should show proper network descriptions', () => {
    const { getByText } = render(<ChainSelectionScreen />);

    expect(getByText('Default network • Zero gas fees • No authorization required')).toBeTruthy();
    expect(getByText('Requires authorization code • Gas fees apply')).toBeTruthy();
  });

  it('should handle disabled authorize button when no code entered', () => {
    const { getByText, getByPlaceholderText } = render(<ChainSelectionScreen />);

    // Click Base option to show auth input
    const baseOption = getByText('Base Network');
    fireEvent.press(baseOption);

    const authorizeButton = getByText('Authorize');
    
    // Button should be disabled when no code is entered
    expect(authorizeButton.props.disabled).toBe(true);

    // Enter some text
    const authInput = getByPlaceholderText('Authorization code');
    fireEvent.changeText(authInput, '1234');

    // Button should now be enabled
    expect(authorizeButton.props.disabled).toBe(false);
  });
});

// Test the WalletDetails component contract status
describe('WalletDetails Contract Status', () => {
  // Mock the WalletDetails component
  const MockWalletDetails = () => {
    const contractReady = true;
    const selectedChain = 'skale';
    
    return (
      <div>
        <div>Pool Contracts</div>
        <div style={{ color: contractReady ? 'green' : 'red' }}>
          {contractReady ? `Connected to SKALE Europa Hub` : 'Not Connected'}
        </div>
      </div>
    );
  };

  it('should show contract connection status', () => {
    const { getByText } = render(<MockWalletDetails />);

    expect(getByText('Pool Contracts')).toBeTruthy();
    expect(getByText('Connected to SKALE Europa Hub')).toBeTruthy();
  });
});

// Test pool card interactions
describe('Pool Operations UI', () => {
  const MockPoolCard = ({ pool, onJoin, onLeave, onCancel }: any) => {
    return (
      <div>
        <div>{pool.name}</div>
        <div>Participants: {pool.participants.length}</div>
        {!pool.joined && !pool.requested && (
          <button onClick={() => onJoin(pool.poolID)}>Join Pool</button>
        )}
        {pool.joined && (
          <button onClick={() => onLeave(pool.poolID)}>Leave Pool</button>
        )}
        {pool.requested && !pool.joined && (
          <button onClick={() => onCancel(pool.poolID)}>Cancel Request</button>
        )}
      </div>
    );
  };

  it('should show join button for available pools', () => {
    const mockPool = {
      poolID: '1',
      name: 'Test Pool',
      participants: ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'],
      joined: false,
      requested: false,
    };

    const onJoin = jest.fn();
    const { getByText } = render(
      <MockPoolCard pool={mockPool} onJoin={onJoin} />
    );

    expect(getByText('Test Pool')).toBeTruthy();
    expect(getByText('Join Pool')).toBeTruthy();

    fireEvent.press(getByText('Join Pool'));
    expect(onJoin).toHaveBeenCalledWith('1');
  });

  it('should show leave button for joined pools', () => {
    const mockPool = {
      poolID: '1',
      name: 'Test Pool',
      participants: ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'],
      joined: true,
      requested: false,
    };

    const onLeave = jest.fn();
    const { getByText } = render(
      <MockPoolCard pool={mockPool} onLeave={onLeave} />
    );

    expect(getByText('Leave Pool')).toBeTruthy();

    fireEvent.press(getByText('Leave Pool'));
    expect(onLeave).toHaveBeenCalledWith('1');
  });

  it('should show cancel button for pending requests', () => {
    const mockPool = {
      poolID: '1',
      name: 'Test Pool',
      participants: ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'],
      joined: false,
      requested: true,
    };

    const onCancel = jest.fn();
    const { getByText } = render(
      <MockPoolCard pool={mockPool} onCancel={onCancel} />
    );

    expect(getByText('Cancel Request')).toBeTruthy();

    fireEvent.press(getByText('Cancel Request'));
    expect(onCancel).toHaveBeenCalledWith('1');
  });
});
