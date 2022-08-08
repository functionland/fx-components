import {
  configureEaseInOutLayoutAnimation,
  FxBox,
  FxButton,
  FxPressableOpacity,
  FxReanimatedBox,
  FxSafeAreaBox,
  FxSpacer,
  FxText,
} from '@functionland/component-library';
import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { SubHeaderText } from '../../components/Text';
import { UserCardCondensed } from './UserCardCondensed';
import Reanimated, {
  Extrapolate,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { UsersCardCarousel } from '../../components/Cards/UsersCard';
import { mockFriendData, mockUserData, User } from '../../api/users';
import { UserHeader } from './UserHeader';

const FADE_OFFSET = 50;

export const UsersScreen = () => {
  const breakpoint = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const [change, setChange] = React.useState<boolean>(false);
  const scrollViewRef = React.useRef<Reanimated.ScrollView>(null);

  const condensedHeaderPressHandler = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const headerStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        scrollY.value,
        [breakpoint.value - FADE_OFFSET, breakpoint.value],
        [0, 1],
        Extrapolate.CLAMP
      ),
    };
  });

  const onScroll = useAnimatedScrollHandler((evt) => {
    scrollY.value = evt.contentOffset.y;
  });

  const changeHandler = React.useCallback(() => {
    setChange((prev) => !prev);
    configureEaseInOutLayoutAnimation();
  }, [setChange]);

  const SubHeaderBar = React.useMemo(() => {
    return (
      <FxBox flexDirection="row" justifyContent="space-between">
        <SubHeaderText>All Users</SubHeaderText>
        <FxButton onPress={changeHandler}>Change</FxButton>
      </FxBox>
    );
  }, [changeHandler]);

  return (
    <FxSafeAreaBox flex={1}>
      <FxBox>
        <Reanimated.ScrollView
          ref={scrollViewRef}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollViewContainer}
        >
          <FxSpacer marginTop="56" />
          <FxBox
            onLayout={(evt) => {
              const { height } = evt.nativeEvent.layout;
              breakpoint.value = height;
            }}
          >
            <UserHeader userData={mockUserData} />
          </FxBox>
          <FxSpacer marginTop="48" />
          {SubHeaderBar}
          <FxSpacer marginTop="24" />
          {change ? (
            <UsersCardCarousel data={mockFriendData} />
          ) : (
            <>
              {mockFriendData.map((friend) => {
                return <UserCardCondensed marginTop="16" userData={friend} />;
              })}
            </>
          )}
        </Reanimated.ScrollView>
        <FxReanimatedBox
          backgroundColor="backgroundApp"
          paddingVertical="8"
          position="absolute"
          top={0}
          left={0}
          right={0}
          style={headerStyle}
        >
          <PrimaryUserCondensed
            userData={mockUserData}
            onPress={condensedHeaderPressHandler}
          />
        </FxReanimatedBox>
      </FxBox>
    </FxSafeAreaBox>
  );
};

type PrimaryUserCondensedProps = {
  onPress: () => void;
  userData: User;
};
const PrimaryUserCondensed = ({
  userData,
  onPress,
}: PrimaryUserCondensedProps) => {
  return (
    <FxPressableOpacity onPress={onPress}>
      <FxBox flexDirection="row" alignItems="center">
        <Image
          source={Number(userData.imageUrl)}
          style={styles.condensedImage}
        />
        <FxSpacer marginLeft="16" />
        <FxText variant="bodySmallRegular" color="content1">
          @{userData.username}
        </FxText>
      </FxBox>
    </FxPressableOpacity>
  );
};

const styles = StyleSheet.create({
  scrollViewContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  condensedImage: {
    width: 50,
    height: 50,
  },
});
