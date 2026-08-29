'use client';

import toast from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';

export function notifySuccess(message: string) {
  toast.success(message);
}

export function notifyError(message: string) {
  toast.error(message);
}

export function notifyWarning(message: string) {
  toast(message, {
    duration: 5000,
    icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
    style: {
      background: '#fffbeb',
      color: '#92400e',
      border: '1px solid #fde68a',
    },
  });
}

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

let pendingConfirm: ((value: boolean) => void) | null = null;

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  const {
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    danger = false,
  } = options;

  if (pendingConfirm) {
    pendingConfirm(false);
    pendingConfirm = null;
  }

  return new Promise((resolve) => {
    pendingConfirm = resolve;
    toast.custom(
      (t) => (
        <div className="pointer-events-auto w-[22.5rem] max-w-[calc(100vw-2rem)] rounded-xl border border-amber-200 bg-white p-4 shadow-xl">
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">{title}</p>
              <p className="mt-1 text-sm text-gray-600">{message}</p>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                pendingConfirm = null;
                toast.dismiss(t.id);
                resolve(false);
              }}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                pendingConfirm = null;
                toast.dismiss(t.id);
                resolve(true);
              }}
              className={
                danger
                  ? 'rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/90'
                  : 'rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800'
              }
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      ),
      { id: 'app-confirm', duration: Infinity },
    );
  });
}
