'use client';

import { Button } from './button';
import { Modal } from './modal';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirming?: boolean;
  destructive?: boolean;
};

/** Modal xác nhận hành động — thay thế window.confirm. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  confirming = false,
  destructive = false,
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissOnEsc={!confirming}
      dismissOnBackdrop={!confirming}
    >
      <Modal.Backdrop />
      <Modal.Panel size="sm">
        <Modal.Header title={title} closeDisabled={confirming} />
        <div className="px-5 pb-5">
          <p className="text-foreground text-sm leading-relaxed">{description}</p>
          <div className="mt-5 flex gap-3">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              disabled={confirming}
              onClick={onClose}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={destructive ? 'secondary' : 'primary'}
              className={
                destructive
                  ? 'border-red-600 bg-red-600 text-white hover:bg-red-700 flex-1 border'
                  : 'flex-1'
              }
              loading={confirming}
              disabled={confirming}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </Modal.Panel>
    </Modal>
  );
}
