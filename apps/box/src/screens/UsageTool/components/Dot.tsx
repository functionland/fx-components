import React from 'react';
import {
  FxBox,
  FxCloseIcon,
  FxPressableOpacity,
} from '@functionland/component-library';

type TDot = {
  color: string;
  removable?: boolean;
  onRemove?: VoidFunction;
};

export const Dot = ({ color, removable = false, onRemove }: TDot) => {
  const handleRemove = () => {
    onRemove && onRemove();
  };

  return (
    <FxBox
      width={removable ? 14 : 12}
      height={removable ? 14 : 12}
      justifyContent="center"
      alignItems="center"
      style={{
        backgroundColor: removable ? 'white' : color,
        borderRadius: removable ? 7 : 6,
        borderWidth: removable ? 1 : 0,
        borderColor: color,
      }}
    >
      {removable && (
        <FxPressableOpacity onPress={handleRemove}>
          <FxCloseIcon width={6} height={6} fill={color} />
        </FxPressableOpacity>
      )}
    </FxBox>
  );
};
