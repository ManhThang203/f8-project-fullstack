'use client';

/**
 * Modal compound component — đóng gói portal, animation, scroll lock, Escape, ARIA.
 *
 * Cách dùng:
 *   <Modal open={open} onClose={onClose}>
 *     <Modal.Backdrop />
 *     <Modal.Panel size="md">
 *       <Modal.Header title="Tiêu đề" />
 *       {body}
 *     </Modal.Panel>
 *   </Modal>
 */

import { X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  createContext,
  useContext,
  useEffect,
  useId,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

/** z-index cao hơn site-header (z-50) để phủ toàn màn hình kể cả header. */
const MODAL_Z = 'z-[100]';

// ── Context ────────────────────────────────────────────────────────────────────

type ModalContextValue = {
  open: boolean;
  onClose: () => void;
  titleId: string;
  dismissOnBackdrop: boolean;
  dismissOnEsc: boolean;
};

const ModalContext = createContext<ModalContextValue | null>(null);

function useModalContext() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('<Modal.*> phải nằm bên trong <Modal>');
  return ctx;
}

// ── Root ───────────────────────────────────────────────────────────────────────

type ModalProps = {
  open: boolean;
  onClose: () => void;
  /** Đóng khi bấm Esc (default: true). Truyền false khi modal đang busy. */
  dismissOnEsc?: boolean;
  /** Đóng khi click backdrop (default: true). */
  dismissOnBackdrop?: boolean;
  children: ReactNode;
};

export function Modal({
  open,
  onClose,
  dismissOnEsc = true,
  dismissOnBackdrop = true,
  children,
}: ModalProps) {
  const titleId = useId();

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open || !dismissOnEsc) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, dismissOnEsc, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <ModalContext.Provider value={{ open, onClose, titleId, dismissOnBackdrop, dismissOnEsc }}>
      <AnimatePresence>
        {open ? (
          <motion.div
            className={cn('fixed inset-0', MODAL_Z)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </ModalContext.Provider>,
    document.body,
  );
}

// ── Backdrop ───────────────────────────────────────────────────────────────────

type BackdropProps = {
  className?: string;
};

function Backdrop({ className }: BackdropProps) {
  const { onClose, dismissOnBackdrop } = useModalContext();

  return (
    <motion.button
      type="button"
      aria-label="Đóng"
      tabIndex={-1}
      className={cn(
        'absolute inset-0',
        className ?? 'bg-black/60 backdrop-blur-sm',
      )}
      onClick={dismissOnBackdrop ? onClose : undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    />
  );
}

// ── Panel ──────────────────────────────────────────────────────────────────────

type PanelSize = 'sm' | 'md' | 'lg';
type PanelFrom = 'center' | 'bottom';

const panelSizeClass: Record<PanelSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

type PanelProps = {
  size?: PanelSize;
  /** Hướng xuất hiện: center = scale-fade, bottom = slide-up (mobile sheet). */
  from?: PanelFrom;
  className?: string;
  children: ReactNode;
};

function Panel({ size = 'md', from = 'center', className, children }: PanelProps) {
  const { titleId } = useModalContext();
  const reduceMotion = useReducedMotion();

  const variants =
    from === 'bottom'
      ? {
          initial: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 },
        }
      : {
          initial: reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 },
          animate: { opacity: 1, scale: 1 },
          exit: reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 },
        };

  const alignClass =
    from === 'bottom'
      ? 'items-end justify-center sm:items-center'
      : 'items-center justify-center';

  return (
    // pointer-events-none: click vùng trống xuyên qua → chạm backdrop → đóng modal
    <div
      className={cn(
        'absolute inset-0 z-10 flex p-4',
        alignClass,
        'pointer-events-none',
      )}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        {...variants}
        transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          'bg-card border-border pointer-events-auto relative w-full overflow-hidden rounded-lg border shadow-2xl',
          panelSizeClass[size],
          className,
        )}
      >
        {children}
      </motion.div>
    </div>
  );
}

// ── Content ────────────────────────────────────────────────────────────────────

type ContentProps = {
  className?: string;
  children: ReactNode;
};

/** Vùng nội dung tùy chỉnh (không có khung panel) — dùng cho lightbox fullscreen. */
function Content({ className, children }: ContentProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 z-10 flex items-center justify-center p-4 pointer-events-none',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────────

type HeaderProps = {
  title: string;
  /** Vô hiệu nút đóng (vd. khi modal đang xử lý). */
  closeDisabled?: boolean;
};

function Header({ title, closeDisabled = false }: HeaderProps) {
  const { onClose, titleId } = useModalContext();

  return (
    <div className="border-border flex shrink-0 items-center justify-between border-b px-4 py-3">
      <h2 id={titleId} className="text-foreground text-sm font-semibold">
        {title}
      </h2>
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        disabled={closeDisabled}
        className={cn(
          'text-muted-foreground hover:bg-muted flex h-11 w-11 items-center justify-center rounded-full transition-colors',
          'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
          'disabled:opacity-40',
        )}
      >
        <X className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}

// ── Attach sub-components ──────────────────────────────────────────────────────

Modal.Backdrop = Backdrop;
Modal.Panel = Panel;
Modal.Content = Content;
Modal.Header = Header;
