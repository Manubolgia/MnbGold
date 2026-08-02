import type { ConnState } from '../lib/useRoom.js';
import { BookIcon, ExitIcon, MoonIcon, PaletteIcon, SunIcon } from '../art/Icons.js';

const CONN_LABEL: Record<ConnState, string> = {
  idle: 'Ready',
  connecting: 'Linking',
  online: 'Live',
  reconnecting: 'Reconnecting',
  offline: 'Offline',
};

interface Props {
  code: string | null;
  conn: ConnState;
  mode: 'light' | 'dark';
  onToggleMode: () => void;
  onOpenTheme: () => void;
  onOpenRules: () => void;
  onCopyCode?: () => void;
  onLeave?: () => void;
}

export function TopBar({ code, conn, mode, onToggleMode, onOpenTheme, onOpenRules, onCopyCode, onLeave }: Props) {
  return (
    <header className="topbar">
      {code ? (
        <>
          <button type="button" className="code-badge" onClick={onCopyCode}>
            <span className="code-tag">Room</span>
            <span className="code-text mono">{code}</span>
          </button>
          {/* Just the light once we are in a room — the bar is tight on a phone. */}
          <span className="conn" data-state={conn} title={CONN_LABEL[conn]}>
            <i className="dot" />
            <span className="sr-only">{CONN_LABEL[conn]}</span>
          </span>
        </>
      ) : (
        <span className="conn" data-state={conn}>
          <i className="dot" />
          {CONN_LABEL[conn]}
        </span>
      )}

      <span className="spacer" />

      <button
        type="button"
        className="icon-btn"
        onClick={onOpenRules}
        aria-label="Rules and card list"
        title="Rules and card list"
      >
        <BookIcon size={20} />
      </button>
      <button type="button" className="icon-btn" onClick={onOpenTheme} aria-label="Colour scheme" title="Colour scheme">
        <PaletteIcon size={20} />
      </button>
      <button
        type="button"
        className="icon-btn"
        onClick={onToggleMode}
        aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={mode === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        {mode === 'dark' ? <SunIcon size={20} /> : <MoonIcon size={20} />}
      </button>
      {onLeave ? (
        <button type="button" className="icon-btn" onClick={onLeave} aria-label="Leave the expedition" title="Leave">
          <ExitIcon size={20} />
        </button>
      ) : null}
    </header>
  );
}
