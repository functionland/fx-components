import React, { useCallback, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet } from 'react-native';

import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  withSpring,
  interpolate,
  useAnimatedGestureHandler,
} from 'react-native-reanimated';

import { useInterval } from '../hooks';
import type {
  BaseToastProps,
  ToastProps,
  ToastComponentsConfig,
} from '../types.toast';

import useToastContext from '../hooks/useToastContext';
import {
  FxErrorIcon,
  FxInfoIcon,
  FxSuccessIcon,
  FxWarningIcon,
} from '../../icons/icons';
import BaseToast from './BaseToast';
import { FxReanimatedBox } from '../../box/box';
import { PanGestureHandler } from 'react-native-gesture-handler';

interface GestureContext {
  startY?: number;
}

const defaultComponentsConfig: ToastComponentsConfig = {
  success: (props: BaseToastProps) => (
    <BaseToast
      localType={'success'}
      iconElement={<FxSuccessIcon />}
      {...props}
    />
  ),
  warning: (props: BaseToastProps) => (
    <BaseToast
      localType={'warning'}
      iconElement={<FxWarningIcon />}
      {...props}
    />
  ),
  error: (props: BaseToastProps) => (
    <BaseToast localType={'error'} iconElement={<FxErrorIcon />} {...props} />
  ),
  info: (props: BaseToastProps) => (
    <BaseToast localType={'info'} iconElement={<FxInfoIcon />} {...props} />
  ),
};

const ToasterInternal: React.FC = () => {
  const { activeToast, defaults, customToasts, hideToast, clearToastQueue } =
    useToastContext();

  const [currentToast, setCurrenToast] = useState<ToastProps | null>(
    activeToast
  );

  const toastTypes: ToastComponentsConfig = {
    ...defaultComponentsConfig,
    ...customToasts,
  };

  const [isVisible, setIsVisible] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);

  const heightRef = useRef<number | null>(
    currentToast?.height ?? defaults.height
  );
  const onLayout = useCallback((e: LayoutChangeEvent): void => {
    heightRef.current = e.nativeEvent.layout.height;
  }, []);

  const topOffset = currentToast?.topOffset ?? defaults.topOffset;
  const height = heightRef.current ?? defaults.height;

  const hiddenY = -(height + topOffset);
  const openY = topOffset;
  const translationY = useSharedValue(hiddenY);

  const reanimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: translationY.value,
        },
      ],
    };
  });

  const updateInteracting = (bool: boolean) => {
    setIsInteracting(bool);
  };

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: GestureContext) => {
      ctx.startY = translationY.value;
      runOnJS(updateInteracting)(true);
    },
    onActive: (event, ctx: GestureContext) => {
      translationY.value = Math.min(
        ctx.startY! + event.translationY,
        openY + 20
      );
    },
    onEnd: (event) => {
      translationY.value = withTiming(hiddenY, {
        duration: interpolate(-event.velocityY, [0, 2000], [500, 0]),
      });
      runOnJS(updateInteracting)(false);
    },
  });

  const transitionDuration =
    currentToast?.transitionDuration ?? defaults.transitionDuration;

  React.useEffect(() => {
    const onShow = activeToast?.onShow ?? defaults.onShow;
    const clearToasts = () => {
      setIsVisible(false);
      setCurrenToast(null);
    };

    if (activeToast) {
      setIsVisible(true);
      if (currentToast !== activeToast) {
        setCurrenToast(activeToast);
        translationY.value = withTiming(openY, {
          duration: transitionDuration.enter,
        });
      }
      onShow?.(activeToast);
    } else if (currentToast) {
      translationY.value = withTiming(
        hiddenY,
        {
          duration: transitionDuration.exit,
        },
        () => {
          runOnJS(clearToasts)();
        }
      );
      defaults.onHide?.(currentToast);
    }
  }, [
    activeToast,
    currentToast,
    setCurrenToast,
    openY,
    translationY,
    transitionDuration,
    hiddenY,
    clearToastQueue,
    defaults,
  ]);

  const autoHideDuration =
    currentToast?.autoHideDuration ?? defaults.autoHideDuration;

  // this will auto-cancel if inProgress flips to true or a toast is not visible
  useInterval(hideToast, isVisible && !isInteracting ? autoHideDuration : null);

  const toastType = currentToast?.type ?? defaults.type;
  const onPress = currentToast?.onPress ?? defaults.onPress;
  const onPressCallback = useMemo(() => {
    if (!onPress) {
      return undefined;
    }

    return (toast: ToastProps) => {
      hideToast();
      onPress?.(toast);
    };
  }, [hideToast, onPress]);
  const renderContent = (): React.ReactElement | null => {
    const toastComponent = toastTypes[toastType];

    if (!toastComponent) {
      return null;
    }

    return toastComponent({
      ...defaults,
      ...currentToast,
      onClose: hideToast,
      onPress: onPressCallback,
    });
  };

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <FxReanimatedBox
        onLayout={onLayout}
        style={[s.toastBox, reanimatedStyle]}
      >
        {renderContent()}
      </FxReanimatedBox>
    </PanGestureHandler>
  );
};

export const Toast = ToasterInternal;

const s = StyleSheet.create({
  toastBox: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    left: 0,
    top: 0,
    right: 0,
  },
});
