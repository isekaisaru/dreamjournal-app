let toastModulePromise: Promise<typeof import("react-hot-toast")> | null = null;

function loadToast() {
  if (!toastModulePromise) {
    toastModulePromise = import("react-hot-toast");
  }
  return toastModulePromise;
}

type ToastModule = typeof import("react-hot-toast");
type ToastInstance = ToastModule["toast"];

type ToastMethod = "success" | "error" | "loading" | "dismiss" | "remove";

type ToastFunction<K extends ToastMethod> = ToastInstance[K] extends (
  ...args: infer P
) => any
  ? (...args: P) => void
  : never;

function createToastInvoker<K extends ToastMethod>(
  method: K
): ToastFunction<K> {
  return ((...args: unknown[]) => {
    if (typeof window === "undefined") {
      return;
    }
    void loadToast().then(({ toast }) => {
      const fn = toast[method] as (...fnArgs: unknown[]) => unknown;
      fn(...args);
    });
  }) as ToastFunction<K>;
}

export const toast = {
  success: createToastInvoker("success"),
  error: createToastInvoker("error"),
  loading: createToastInvoker("loading"),
  dismiss: createToastInvoker("dismiss"),
  remove: createToastInvoker("remove"),
};

export async function promise<T>(
  promise: Promise<T>,
  messages: Parameters<ToastInstance["promise"]>[1]
): Promise<T> {
  if (typeof window === "undefined") {
    return promise;
  }
  const { toast } = await loadToast();
  return toast.promise(promise, messages);
}

export type Toast = ToastInstance;
