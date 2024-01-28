import { ColorValue } from 'react-native';

//import { Color as SvgColor } from 'react-native-svg';

export type LocalType = 'info' | 'success' | 'error' | 'warning';

export interface ToastProps {
  /**
   * Use predefined types for standard colors/icons. Defaults to 'info'
   */
  type?: LocalType;

  /**
   * Top line of text
   */
  title?: string;

  /**
   * Bottom line of text
   */
  message?: string;

  /**
   * Number of milliseconds to wait before automatically calling `onHide`.
   * Set autoHideDuration to `null` to prevent the toast from automatically hiding.
   *
   * Default: `5000`
   */
  autoHideDuration?: number;

  /**
   * Duration of transition in milliseconds. Enter and exit durations can be specified.
   *
   * Default: `{ enter: 250, exit: 100 }`
   */
  transitionDuration?: { enter: number; exit: number };

  /**
   * Height of the toast component. Defaults to 60
   */
  height?: number;

  /**
   * Points from the top of the screen. Defaults to 40
   */
  topOffset?: number;

  /**
   * Callback when a toast is shown
   */
  onShow?: (toast: ToastProps) => void;

  /**
   * Callback when a toast is queued
   */
  onQueue?: (toast: ToastProps) => void;

  /**
   * Callback when a toast is pressed
   */
  onPress?: (toast: ToastProps) => void;
}

export interface ToastProviderProps {
  /**
   * Optionally provide defaults for all toasts (settings here can be overridden when showing or queueing a toast)
   */
  defaults?: ToastProps;
  /**
   * Configure your own toast components to render. Object keys maps to the `ToastProps` `type` prop while the values are render functions to render the toast.
   */
  customToasts?: ToastComponentsConfig;
  /**
   * The Toast will be rendered by default unless this is set this to false.
   * To render it in a place other than where the provider is placed the useToast hook will get you the Toast you need to render.
   * react-navigation is known to interfere with the rendering of the toasts. Place the Toaster just before your </NavigationContainer> to fix it.
   */
  renderToaster?: boolean;
  children?: React.ReactNode;
}

export interface UseToastHook {
  /**
   * Pops up a toast (jumps to the front of the queue and hides the existing toast if there is one)
   */
  showToast: (props: ToastProps) => void;
  /**
   * Queues up a toast (or shows it instantly if there are no toasts showing and in the queue)
   */
  queueToast: (props: ToastProps) => void;
  /**
   * Hides the current toast, which will show the next toast in the queue if there is one
   */
  hideToast: () => void;
  /**
   * Purges the toast queue (but does not hide the one being shown)
   */
  clearToastQueue: () => void;
}

export interface IToastContext extends ToastContextSettings, UseToastHook {
  toasts: Readonly<ToastProps[]>;
  activeToast: ToastProps | null;
}

type OptionalSettings = Pick<
  ToastProps,
  'title' | 'message' | 'onShow' | 'onQueue' | 'onPress'
>;

interface ToastContextSettings {
  customToasts?: ToastComponentsConfig;
  defaults: Required<Omit<ToastProps, keyof OptionalSettings>> &
    OptionalSettings & { onHide?: (props: ToastProps) => void };
}

export type Color = ColorValue; // This covers the color types for both SVG and regular components.

export interface ToastComponentsConfig {
  [x: string]: (toast: BaseToastProps) => React.ReactElement;
}

export interface SvgProps {
  color?: Color;
  size?: number;
}

export interface BaseToastProps extends ToastProps {
  /**
   * Color of the title and icon
   */
  color?: Color;
  /**
   * Icon to show for the toast.
   * Provide a custom icon here
   */
  iconElement?: JSX.Element;
  /**
   * The close button should fire this to hide the toast.
   */
  onClose: () => void;
  /**
   * Optional render function to render the icon (and its wrapper).
   */
  renderIcon?: (toast: BaseToastProps) => React.ReactNode;
  /**
   * Optional render function to render the title.
   */
  renderTitle?: (toast: BaseToastProps) => React.ReactNode;
  /**
   * Optional render function to render the message.
   */
  renderMessage?: (toast: BaseToastProps) => React.ReactNode;
  /**
   * Optional render function to render the close button.
   */
  renderCloseButton?: (toast: BaseToastProps) => React.ReactNode;
}

export type Toaster = React.FC;
