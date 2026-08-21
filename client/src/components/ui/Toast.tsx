import { useEffect } from "react";
import { useToastStore } from "../../stores/toast";
import { useSettingsStore, playNotificationSound } from "../../stores/settings";

export function Toast() {
  const { message, type, visible } = useToastStore();

  // notification sound on success/error toasts (respects Settings → Notifications)
  useEffect(() => {
    if (visible && (type === "success" || type === "error")) {
      playNotificationSound(useSettingsStore.getState().notifications);
    }
  }, [visible, message, type]);

  if (!visible) return null;

  const colorClass =
    type === "success"
      ? "border-green/35 text-green"
      : type === "error"
        ? "border-danger/35 text-danger"
        : "border-white/12 text-primary";

  return (
    <div
      className={`fixed bottom-[88px] left-1/2 -translate-x-1/2 px-5 py-2.5 glass glass-pill text-[12.5px] z-[300] whitespace-nowrap animate-[toastIn_0.18s_ease] ${colorClass}`}
      role="status"
    >
      {message}
    </div>
  );
}
