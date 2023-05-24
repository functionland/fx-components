import React, { useEffect, useRef, useState } from 'react';
import {
  FxBox,
  FxButton,
  FxProgressBar,
  FxText,
  FxSafeAreaBox,
  useToast,
  FxSpacer,
  FxCard,
  FxRadioButton,
  FxRadioButtonWithLabel,
  FxRefreshIcon,
  FxTag,
  FxExclamationIcon,
} from '@functionland/component-library';
import { ActivityIndicator, FlatList, ListRenderItem } from 'react-native';
import { SmallHeaderText, SubHeaderText } from '../../components/Text';
type DicoveryDeviceType = {
  ipAddress: string;
  peerId: string;
  authorizer: string;
  hardwareId: string;
};
import Zeroconf from 'react-native-zeroconf'
import { MDNSBloxService, TBloxProperty } from '../../models';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import shallow from 'zustand/shallow';
import { Helper } from '../../utils';
import { useLogger, useRootNavigation } from '../../hooks';
import { useBloxsStore } from '../../stores';
import { Routes } from '../../navigation/navigationConfig';

const zeroconf = new Zeroconf()
export const ConnectToExistingBloxScreen = () => {
  const [data, setData] = useState<MDNSBloxService[]>([])
  const [scanning, setScanning] = useState(false)
  const [addingBloxs, setAddingBloxs] = useState(false)

  const mDnsTimer = useRef<NodeJS.Timeout>()
  const logger = useLogger()
  const rootNavigation = useRootNavigation();

  const [appPeerId, setAppPeerId, signiture, password] = useUserProfileStore(
    (state) => [
      state.appPeerId,
      state.setAppPeerId,
      state.signiture,
      state.password,
    ],
    shallow
  );
  const [bloxs = {}, bloxsPropertyInfo = {}, addBlox, removeBlox, updateBloxStore] = useBloxsStore((state) => [
    state.bloxs,
    state.bloxsPropertyInfo,
    state.addBlox,
    state.removeBlox,
    state.update
  ], shallow);
  const [checkboxState, setCheckboxState] = React.useState<Record<string, boolean>>({});

  useEffect(() => {
    zeroconf.on('start', () => {
      setScanning(true)
      setData([])
      clearTimeout(mDnsTimer.current)
      mDnsTimer.current = setTimeout(() => {
        zeroconf.stop()
        setScanning(false)
      }, 5000);
      console.log('The scan has started.\n\r')
    })
    zeroconf.on('resolved', (resolved: MDNSBloxService) => {
      setData(prev => [resolved, ...prev])
      console.log('The scan has resolved.\n\r', resolved)
    })
    if (!appPeerId) {
      generateAppPeerId()
    }
    scanMDNS()
  }, [])


  const generateAppPeerId = async () => {
    try {
      const peerId = await Helper.initFula({
        password,
        signiture,
      });
      setAppPeerId(peerId);
    } catch (error) {
      logger.logError('ConnectToExistingBloxScreen:generateAppPeerId', error)
    }
  };

  const handleOnItemPress = (id: string) => {
    if (checkboxState[id])
      delete checkboxState[id]
    else
      checkboxState[id] = true
    setCheckboxState({ ...checkboxState })
  }

  const scanMDNS = () => {
    zeroconf.stop()
    zeroconf.scan('fulatower', 'tcp', 'local.')
  }

  const addBloxs = () => {
    const bloxsCount = Object.values(bloxs).length
    let firstBlox = true
    setAddingBloxs(true)

    const bloxsProperties: Record<string, string> = Object.keys(bloxsPropertyInfo).reduce((obj, peerId) => {
      if (bloxsPropertyInfo[peerId]?.hardwareID)
        obj[bloxsPropertyInfo[peerId]?.hardwareID] = peerId
      return obj
    }, {})

    setTimeout(() => {
      try {
        data.forEach((device, index) => {
          if (device?.txt?.bloxPeerIdString && checkboxState[device?.txt?.bloxPeerIdString]) {

            // Remove bloxes with same hardware Id and defferent peerId
            if (bloxsProperties[device?.txt.hardwareID] && bloxsProperties[device?.txt.hardwareID] != device?.txt?.bloxPeerIdString) {
              removeBlox(bloxsProperties[device?.txt.hardwareID])
            }
            addBlox({
              peerId: device?.txt?.bloxPeerIdString,
              name: bloxs[device?.txt?.bloxPeerIdString]?.name ?? `Blox unit #${bloxsCount + index + 1}`
            })
            if (firstBlox) {
              firstBlox = false
              updateBloxStore({
                currentBloxPeerId: device?.txt?.bloxPeerIdString
              })
            }
          }
          rootNavigation.reset({
            index: 0,
            routes: [{ name: Routes.MainTabs }],
          });
        })
      } catch (error) {
        setAddingBloxs(false)
        console.log(error)
        logger.logError('ConnectToExistingBloxScreen:addBloxs', error)
      }
    }, 0);
  }

  const renderItem = React.useCallback<ListRenderItem<MDNSBloxService>>(
    ({ item }) => {
      const authorized = item.txt?.authorizer === appPeerId
      const alreadyExist = !!bloxs[item.txt?.bloxPeerIdString]
      return (
        <FxCard
          disabled={authorized || alreadyExist}
          onPress={() => handleOnItemPress(item.txt?.bloxPeerIdString)}
        >
          <FxCard.Row>
            <FxBox flexDirection='row' alignItems='center'>
              <FxRadioButton value={item.txt?.bloxPeerIdString} />
              <FxText variant="bodyMediumRegular" paddingStart='16'>{item.host}</FxText>
            </FxBox>
          </FxCard.Row>
          <FxText variant="bodySmallLight">{item.txt?.bloxPeerIdString}</FxText>
          <FxText variant="bodySmallLight">{item.txt?.hardwareID}</FxText>
          <FxBox flexDirection='row'>
            {item.txt?.bloxPeerIdString === item.txt?.authorizer &&
              <FxExclamationIcon color='warningBase' width={22} height={22} marginEnd='8' />
            }
            <FxTag key={item.txt?.hardwareID} alignSelf='flex-start' marginRight="8" backgroundColor={appPeerId && authorized ? 'successBase' : (appPeerId ? 'errorBase' : 'warningBase')}>
              {(appPeerId && authorized) ? 'Autorized' : (appPeerId ? 'Not Authorized' : 'Checking...')}
            </FxTag>
            {alreadyExist &&
              <FxTag alignSelf='flex-start' marginStart='0'>
                Already exist
              </FxTag>
            }

          </FxBox>

        </FxCard >
      );
    },
    [bloxs]
  );
  return (
    <FxSafeAreaBox flex={1} paddingHorizontal="20" paddingVertical="16">
      <FxProgressBar progress={60} />
      <FxBox marginTop='16' flexDirection='row' justifyContent='space-between' alignItems='center'>
        <SmallHeaderText >Bloxs in your network</SmallHeaderText>
        {scanning ? <ActivityIndicator /> : <FxRefreshIcon onPress={scanMDNS} color='white' />}
      </FxBox>
      <SubHeaderText marginTop='4' variant='bodySmallLight'>Select bloxs you want to add</SubHeaderText>
      <FxSpacer height={16} />
      <FxRadioButton.Group
        value={Object.keys(checkboxState)}
        onValueChange={() => null}
      >
        <FlatList
          data={data}
          renderItem={renderItem}
          ItemSeparatorComponent={ItemSeparatorComponent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 180
          }}
        />
      </FxRadioButton.Group>
      <FxBox position='absolute' justifyContent='center' bottom={0} right={0} left={0} paddingVertical='20' paddingHorizontal='20'>
        <FxButton

          size='large'
          disabled={!appPeerId || !(Object.values(checkboxState).length > 0)}
          onPress={!addingBloxs ? addBloxs : null}
        >
          {addingBloxs ? <ActivityIndicator /> : 'Add selected blox(s)'}
        </FxButton>
      </FxBox>
    </FxSafeAreaBox>
  );
};

const ItemSeparatorComponent = () => {
  return <FxSpacer marginTop="4" />;
};

const MockData: DicoveryDeviceType[] = [{
  ipAddress: '192.168.1.100',
  peerId: '2342342-234234-sdf234234',
  hardwareId: '2sdsfsf-asfasff-asfafsasf-zvzxa-asqwqwr-afasfsdf-asafafa',
  authorizer: '12sd1-123123as-asdas-12123',
},
{
  ipAddress: '192.168.1.102',
  peerId: '2342342-234234-sdf234234-1231',
  hardwareId: '2sdsfsf-asfasff-asfafsasf-zvzxa-asqwqwr-afasfsdf-asafafa-123123-asd',
  authorizer: '12sd1-123123as-asdas-12123-asdasd',
}]