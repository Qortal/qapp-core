import { toast } from "react-hot-toast";

export const showSuccess = (message: string, duration = 4000) => {
  toast.success(message, {
    duration,
  });
};

export const showError = (message: string, duration = 4000) => {
  toast.error(message, {
    duration,
  });
};

export const showLoading = (message: string, duration = Infinity): string => {
  return toast.loading(
    <div style={{ display: "flex", alignItems: "center" }}>
      <span role="img" aria-label="loading-icon">
        ⏳
      </span>
      <span style={{ marginLeft: 8 }}>{message}</span>
    </div>,
    {
      duration,
    }
  );
};

export const dismissToast = (toastId?: string) => {
  toast.dismiss(toastId);
};
