import { useCallback, useEffect } from 'react';
import { useUserProfileStore } from '../stores/useUserProfileStore';
import { firebase } from '@react-native-firebase/crashlytics';

export function useLogger() {
    const [debugMode] = useUserProfileStore((state) => [
        state.debugMode
    ]);
    
    useEffect(() => {
        if (debugMode)
        firebase.crashlytics().setUserId(debugMode.uniqueId)
    }, [debugMode])

    const log = useCallback((...data: any[]) => {
        if (!__DEV__) {
            if (debugMode && new Date(debugMode.endDate) >= new Date()) {
                // Send the log message to the Firebase Crashlytics service.
                firebase.crashlytics().log(JSON.stringify(data, null, 4));
            }
        }
    }, [debugMode, firebase])
    const error = useCallback((...data: any[]) => {
        if (!__DEV__) {
            if (debugMode && new Date(debugMode.endDate) >= new Date()) {
                // Send the error message to the Firebase Crashlytics service.
                //firebase.crashlytics().log(JSON.stringify(data, null, 4));
                // Record the error in the Firebase Crashlytics service.
                firebase.crashlytics().recordError(new Error(JSON.stringify(data, null, 4)));
            }
        }
    }, [debugMode, firebase])

    if (__DEV__)
        return {
            log: () => null,
            error: () => null
        }

    return {
        log,
        error
    }
}
