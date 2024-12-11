import { useEffect, useRef, useState } from 'react';

export interface IUseFetchProps<TData, TParams> {
  initialLoading?: boolean;
  initialError?: Error;
  initialData?: TData | null;
  apiMethod: (params: TParams | null) => Promise<TData | null>;
  params?: TParams | null;
  mungResponse?: (data: Awaited<TData>) => undefined | null;
}

export const useFetch = <TData, TParams>({
  initialLoading = true,
  initialError = null,
  initialData = null,
  apiMethod,
  params: initialParams = null,
  mungResponse = null,
}: IUseFetchProps<TData, TParams>) => {
  const [loading, setLoading] = useState<boolean>(initialLoading);
  const [error, setError] = useState<Error>(initialError);
  const [data, setData] = useState<TData | null>(initialData);
  const params = useRef(initialParams);

  const fetch = async () => {
    try {
      console.log(apiMethod);
      const response = await apiMethod(params.current);
      setError(null);
      if (mungResponse) {
        setData(mungResponse(response));
      } else {
        setData(response);
      }
    } catch (err) {
      setError(err);
      console.log('err', err);
      setData(null);
    }
  };

  const fetchWithLoading = async (): Promise<void> => {
    setLoading(true);
    await fetch();
    setLoading(false);
  };

  const refetch = async ({
    params: nextParams,
    withLoading = true,
  }: {
    params?: TParams;
    withLoading?: boolean;
  } = {}): Promise<void> => {
    if (nextParams) {
      params.current = nextParams;
    }

    if (withLoading) {
      await fetchWithLoading();
    } else {
      await fetch();
    }
  };

  useEffect(() => {
    if (initialLoading) fetchWithLoading();
  }, []);

  return { loading, error, data, refetch };
};

interface IUseFetchWithBLEProps<TData, TParams>
  extends IUseFetchProps<TData, TParams> {
  bleMethod?: (params: TParams) => Promise<TData | null>;
  shouldTryBLE?: boolean;
}

export const useFetchWithBLE = <TData, TParams>({
  initialLoading = true,
  initialError = null,
  initialData = null,
  apiMethod,
  bleMethod,
  shouldTryBLE = true,
  params: initialParams = null,
  mungResponse = null,
}: IUseFetchWithBLEProps<TData, TParams>) => {
  const [loading, setLoading] = useState<boolean>(initialLoading);
  const [error, setError] = useState<Error | null>(initialError);
  const [data, setData] = useState<TData | null>(initialData);
  const params = useRef(initialParams);
  const mounted = useRef(false); // Add this to track mount state

  const fetch = async (useBLE = false) => {
    try {
      console.log('useFetchWithBle', useBLE, bleMethod, params);
      if (useBLE && bleMethod && params.current) {
        const bleResponse = await bleMethod(params.current);
        if (bleResponse) {
          setError(null);
          setData({data: mungResponse ? mungResponse(bleResponse) : bleResponse});
          console.log('ble response returned. not going to axios');
          return true; // Successfully handled by BLE - don't fallback
        }
      }

      const response = await apiMethod(params.current);
      setError(null);
      setData(mungResponse ? mungResponse(response) : response);
      return true;
    } catch (err) {
      setError(err);
      console.log('err', err);
      setData(null);
      return false;
    }
  };

  const fetchWithLoading = async (useBLE = false):Promise<boolean> => {
    setLoading(true);
    const res = await fetch(useBLE);
    console.log({res});
    setLoading(false);
    return res;
  };

  const refetch = async ({
    params: nextParams,
    withLoading = true,
    tryBLE = shouldTryBLE,
  }: {
    params?: TParams;
    withLoading?: boolean;
    tryBLE?: boolean;
  } = {}): Promise<void> => {
    if (nextParams) {
      params.current = nextParams;
    }

    if (withLoading) {
      if (tryBLE) {
        const bleSuccess = await fetchWithLoading(true);
        console.log({bleSuccess});
        if (!bleSuccess) {
          await fetchWithLoading(false);
        }
      } else {
        await fetchWithLoading(false);
      }
    } else {
      if (tryBLE) {
        const bleSuccess = await fetch(true);
        if (!bleSuccess) {
          await fetch(false);
        }
      } else {
        await fetch(false);
      }
    }
  };

  useEffect(() => {
    // Only fetch on the first mount
    if (!mounted.current && initialLoading) {
      mounted.current = true;
      console.log(
        '*************************************************************calling fetchWithLoading**************************************'
      );
      fetchWithLoading(shouldTryBLE);
    }
    return () => {
      mounted.current = false;
    };
  }, []);

  return { loading, error, data, refetch };
};
