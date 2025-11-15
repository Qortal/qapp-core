import { useRef, useState } from "react";

interface State {
  isShow: boolean;
}

interface Message {
  message?: string;
}

interface PromiseHandlers<T = unknown> {
  resolve: (value: T) => void;
  reject: () => void;
}

export const useModal = <T = any,>() => {
  const [state, setState] = useState<State>({ isShow: false });
  const [message, setMessage] = useState<Message>({
    message: "",
  });

  const promiseConfig = useRef<PromiseHandlers<T> | null>(null);

  const show = (data: Message): Promise<T> => {
    setMessage(data);
    return new Promise<T>((resolve, reject) => {
      promiseConfig.current = { resolve, reject };
      setState({ isShow: true });
    });
  };

  const hide = () => {
    setState({ isShow: false });
    setMessage({ message: "" });
  };

  const onOk = (payload: T) => {
    if (promiseConfig.current) {
      promiseConfig.current.resolve(payload);
    }
    hide();
  };

  const onCancel = () => {
    if (promiseConfig.current) {
      promiseConfig.current.reject();
    }
    hide();
  };

  return {
    show,
    onOk,
    onCancel,
    isShow: state.isShow,
    message,
  };
};
