import { useCallback, useEffect, useState } from 'react';
import { useUserProfileStore } from '../stores/useUserProfileStore';
import moment from 'moment';
import { generateUniqueId } from '../utils/helper';
import { useSettingsStore } from '../stores';

export function useLogger() {
    const [debugMode, setDebugMode] = useSettingsStore((state) => [
        state.debugMode,
        state.setDebugMode
    ]);
    const [isDebugModeEnable, setIsDebugModeEnable] = useState(false)

    useEffect(() => {
        if (debugMode)
            
        if (debugMode && new Date(debugMode.endDate) >= new Date()) {
            setIsDebugModeEnable(true)
        }
        else {
            setIsDebugModeEnable(false)
        }
    }, [debugMode])

    const log = useCallback((...data: any[]) => {
        if (!__DEV__) {
            if (debugMode && new Date(debugMode.endDate) >= new Date()) {
                
            }
        }
    }, [debugMode])
    const error = useCallback((...data: any[]) => {
        if (!__DEV__) {
            if (debugMode && new Date(debugMode.endDate) >= new Date()) {
            }
        }
    }, [debugMode])
    const toggleDebugMode = () => {
        if (debugMode && new Date(debugMode.endDate.toString()) > new Date()) {
            //Disable debug mode
            setDebugMode(
                debugMode?.uniqueId || generateUniqueId(),
                moment().add(-2, 'days').toDate()
            )
        } else {
            //Enable debug mode
            setDebugMode(
                debugMode?.uniqueId || generateUniqueId(),
                moment().add(2, 'days').toDate()
            )
        }
    }
    return {
        log: __DEV__ ? () => null : log,
        logError: __DEV__ ? () => null : error,
        toggleDebugMode,
        isDebugModeEnable
    }
}
