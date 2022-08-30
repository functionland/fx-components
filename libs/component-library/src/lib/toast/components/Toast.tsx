import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LayoutChangeEvent, StyleSheet } from 'react-native';

import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
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
  const { activeToast, defaults, customToasts, hideToast } = useToastContext();

  const toastTypes: ToastComponentsConfig = {
    ...defaultComponentsConfig,
    ...customToasts,
  };

  const [inProgress, setInProgress] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const onHide = defaults.onHide;

  const onShow = useMemo(
    () => activeToast?.onShow ?? defaults.onShow,
    [activeToast?.onShow, defaults.onShow]
  );

  const prevHeightRef = useRef<number | null>();
  const heightRef = useRef<number | null>(
    activeToast?.height ?? defaults.height
  );
  const onLayout = useCallback((e: LayoutChangeEvent): void => {
    prevHeightRef.current = heightRef.current;
    heightRef.current = e.nativeEvent.layout.height;
  }, []);

  const topOffset = activeToast?.topOffset ?? defaults.topOffset;
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

  const prevToastRef = useRef<ToastProps | null>();

  const transitionDuration =
    activeToast?.transitionDuration ?? defaults.transitionDuration;

  useLayoutEffect(() => {
    // no toasts or correct one is already shown
    if (
      activeToast === prevToastRef.current ||
      (!activeToast && !prevToastRef.current)
    ) {
      return;
    }

    const hide = async () => {
      setInProgress(true);

      translationY.value = withTiming(hiddenY, {
        duration: transitionDuration.exit,
      });
      setIsVisible(false);
      setInProgress(false);
      onHide?.(prevToastRef.current as ToastProps);
      prevToastRef.current = null;
    };

    const show = async () => {
      if (inProgress || isVisible) {
        await hide();
      }
      setInProgress(true);

      translationY.value = withTiming(openY, {
        duration: transitionDuration.enter,
      });

      prevToastRef.current = activeToast;
      setIsVisible(true);
      setInProgress(false);
      onShow?.(activeToast as ToastProps);
    };

    // no toasts left but one is visible and not yet animating
    if (!activeToast && isVisible && !inProgress) {
      hide();
    }

    // toast that isn't visible and not yet animating
    if (activeToast && !isVisible && !inProgress) {
      show();
    }

    // activeToast was replaced and the wrong one is showing
    if (activeToast && !inProgress && activeToast !== prevToastRef.current) {
      show();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeToast, hideToast, inProgress, isVisible, onHide, onShow]);

  const autoHideDuration =
    activeToast?.autoHideDuration ?? defaults.autoHideDuration;

  // this will auto-cancel if inProgress flips to true or a toast is not visible
  useInterval(hideToast, isVisible && !inProgress ? autoHideDuration : null);

  const toastType = activeToast?.type ?? defaults.type;
  const onPress = activeToast?.onPress ?? defaults.onPress;
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
      console.error(`Toast of type '${toastType}' does not exist.`);
      return null;
    }

    return toastComponent({
      ...defaults,
      ...activeToast,
      onClose: hideToast,
      onPress: onPressCallback,
    });
  };

  return (
    <FxReanimatedBox onLayout={onLayout} style={[s.toastBox, reanimatedStyle]}>
      {renderContent()}
    </FxReanimatedBox>
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
