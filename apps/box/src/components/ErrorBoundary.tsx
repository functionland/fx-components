import React, { Component, ErrorInfo, ReactNode } from 'react';
import { FxBox, FxText, FxButton } from '@functionland/component-library';
import { Alert } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to your error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In development, show alert with error details
    if (__DEV__) {
      Alert.alert(
        'Application Error',
        `${error.message}\n\nComponent Stack: ${errorInfo.componentStack}`,
        [{ text: 'OK' }]
      );
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <FxBox
          flex={1}
          justifyContent="center"
          alignItems="center"
          padding="20"
          backgroundColor="backgroundApp"
        >
          <FxText
            variant="bodyMediumRegular"
            color="errorBase"
            textAlign="center"
            marginBottom="16"
          >
            Something went wrong
          </FxText>
          
          <FxText
            variant="bodyMediumRegular"
            color="content2"
            textAlign="center"
            marginBottom="24"
          >
            {__DEV__ && this.state.error
              ? this.state.error.message
              : 'An unexpected error occurred. Please try again.'}
          </FxText>

          <FxButton onPress={this.handleRetry}>
            Try Again
          </FxButton>
        </FxBox>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};
