import React from 'react';
import {
  FxBox,
  FxText,
  useFxTheme,
} from '@functionland/component-library';
import { useBloxsStore } from '../stores/useBloxsStore';
import { useTranslation } from 'react-i18next';
import { CircleFilledIcon } from './Icons';

interface CurrentBloxIndicatorProps {
  showConnectionStatus?: boolean;
  compact?: boolean;
}

export const CurrentBloxIndicator = ({ 
  showConnectionStatus = true, 
  compact = false 
}: CurrentBloxIndicatorProps) => {
  const { colors } = useFxTheme();
  const { t } = useTranslation();
  
  const [bloxs, currentBloxPeerId, bloxsConnectionStatus] = useBloxsStore((state) => [
    state.bloxs,
    state.currentBloxPeerId,
    state.bloxsConnectionStatus,
  ]);

  const currentBlox = currentBloxPeerId ? bloxs[currentBloxPeerId] : null;
  const connectionStatus = currentBloxPeerId ? bloxsConnectionStatus[currentBloxPeerId] : undefined;

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'CONNECTED':
        return 'successBase';
      case 'CHECKING':
        return 'warningBase';
      default:
        return 'errorBase';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'CONNECTED':
        return t('currentBloxIndicator.connected');
      case 'CHECKING':
        return t('currentBloxIndicator.checking');
      case 'DISCONNECTED':
        return t('currentBloxIndicator.disconnected');
      default:
        return t('currentBloxIndicator.disconnected');
    }
  };

  const truncatePeerId = (peerId: string, maxLength: number = 16) => {
    if (peerId.length <= maxLength) return peerId;
    return `${peerId.substring(0, 8)}...${peerId.substring(peerId.length - 8)}`;
  };

  if (!currentBlox || !currentBloxPeerId) {
    return (
      <FxBox
        backgroundColor="backgroundSecondary"
        paddingHorizontal={compact ? "12" : "16"}
        paddingVertical={compact ? "8" : "12"}
        borderColor="border"
      >
        <FxText variant="bodySmallRegular" color="content2" textAlign="center">
          {t('currentBloxIndicator.noBloxSelected')}
        </FxText>
      </FxBox>
    );
  }

  return (
    <FxBox
      backgroundColor="backgroundSecondary"
      paddingHorizontal={compact ? "12" : "16"}
      paddingVertical={compact ? "8" : "12"}
      borderColor="border"
    >
      <FxBox flexDirection="row" alignItems="center" justifyContent="space-between">
        <FxBox flex={1}>
          <FxBox flexDirection="row" alignItems="center">
            <FxText 
              variant={compact ? "bodySmallRegular" : "bodyLargeRegular"} 
              color="content1"
              numberOfLines={1}
            >
              {currentBlox.name}
            </FxText>
            {showConnectionStatus && (
              <FxBox flexDirection="row" alignItems="center" marginLeft="8">
                <CircleFilledIcon
                  color={getStatusColor()}
                />
                <FxText
                  variant="bodyXSRegular"
                  color={getStatusColor()}
                  marginLeft="4"
                >
                  {getStatusText()}
                </FxText>
              </FxBox>
            )}
          </FxBox>
          
          <FxText 
            variant="bodyXSRegular" 
            color="content3" 
            marginTop="4"
            numberOfLines={1}
          >
            {truncatePeerId(currentBloxPeerId, compact ? 12 : 20)}
          </FxText>
        </FxBox>
      </FxBox>
    </FxBox>
  );
};
