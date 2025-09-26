import { useIdleTimer } from "react-idle-timer";

const useIdleTimeout = ({ onIdle, onActive, idleTime = 10_000 }: any) => {
  const idleTimer = useIdleTimer({
    timeout: idleTime,
    onIdle: onIdle,
    onActive: onActive,
  });
  return {
    idleTimer,
  };
};
export default useIdleTimeout;
