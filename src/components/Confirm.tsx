import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { Modal } from './ui';

interface Options { title: string; message: string; confirmText?: string; danger?: boolean; input?: { label: string; placeholder?: string } }
type Result = { ok: boolean; text: string };
type ConfirmFn = (o: Options) => Promise<Result>;

const Ctx = createContext<ConfirmFn | null>(null);

/** Promise-based confirm dialog (optionally collects one line of text, e.g. approval remarks). */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<Options | null>(null);
  const [text, setText] = useState('');
  const resolver = useRef<((r: Result) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    setText('');
    setOpts(o);
    return new Promise((resolve) => (resolver.current = resolve));
  }, []);

  const close = (ok: boolean) => {
    resolver.current?.({ ok, text: text.trim() });
    resolver.current = null;
    setOpts(null);
  };

  return (
    <Ctx.Provider value={confirm}>
      {children}
      {opts && (
        <Modal
          title={opts.title}
          onClose={() => close(false)}
          size="sm"
          footer={
            <>
              <button className="btn" onClick={() => close(false)}>Cancel</button>
              <button className={`btn ${opts.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => close(true)} data-testid="confirm-ok">
                {opts.confirmText ?? 'Confirm'}
              </button>
            </>
          }
        >
          <p>{opts.message}</p>
          {opts.input && (
            <label className="field">
              <span>{opts.input.label}</span>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder={opts.input.placeholder} autoFocus data-testid="confirm-input" />
            </label>
          )}
        </Modal>
      )}
    </Ctx.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const v = useContext(Ctx);
  if (!v) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return v;
}
