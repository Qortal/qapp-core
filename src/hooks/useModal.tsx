import { useRef, useState, useCallback, useMemo } from 'react';

interface State {
  isShow: boolean;
}

export const useModal = () => {
  const [state, setState] = useState<State>({ isShow: false });
  const [data, setData] = useState<any>(null);
  const promiseConfig = useRef<any>(null);

  const show = useCallback((data: any) => {
    setData(data);
    return new Promise((resolve, reject) => {
      promiseConfig.current = { resolve, reject };
      setState({ isShow: true });
    });
  }, []);

  const hide = useCallback(() => {
    setState({ isShow: false });
    setData(null);
  }, []);

  const onOk = useCallback(
    (payload: any) => {
      const { resolve } = promiseConfig.current || {};
      hide();
      resolve?.(payload);
    },
    [hide]
  );

  const onCancel = useCallback(() => {
    const { reject } = promiseConfig.current || {};
    hide();
    reject?.();
  }, [hide]);

  return useMemo(
    () => ({
      show,
      onOk,
      onCancel,
      isShow: state.isShow,
      data,
    }),
    [show, onOk, onCancel, state.isShow, data]
  );
};
