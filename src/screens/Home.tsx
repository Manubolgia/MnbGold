import { useState } from 'react';
import { Avatar, AVATAR_COUNT } from '../art/Avatars.js';
import { MAX_PLAYERS, MIN_PLAYERS } from '../../shared/types.js';

interface Props {
  name: string;
  avatar: number;
  busy: boolean;
  error: string | null;
  savedCode: string | null;
  prefillCode: string;
  onName: (name: string) => void;
  onAvatar: (avatar: number) => void;
  onHost: () => void;
  onJoin: (code: string) => void;
  onResume: () => void;
  onForget: () => void;
}

export function Home({
  name,
  avatar,
  busy,
  error,
  savedCode,
  prefillCode,
  onName,
  onAvatar,
  onHost,
  onJoin,
  onResume,
  onForget,
}: Props) {
  const [code, setCode] = useState(prefillCode);
  const ready = name.trim().length > 0;

  return (
    <div className="screen home">
      <div className="brand">
        <h1 className="brand-title">MNBG Gold</h1>
        <p className="brand-sub">
          {MIN_PLAYERS}–{MAX_PLAYERS} explorers · online
        </p>
      </div>

      {savedCode ? (
        <div className="panel anim-up">
          <div className="row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="field-label">Expedition in progress</div>
              <div className="code-text mono" style={{ color: 'var(--main)' }}>
                {savedCode}
              </div>
            </div>
            <button type="button" className="btn btn-sm" onClick={onResume} disabled={busy}>
              Rejoin
            </button>
          </div>
          <button type="button" className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 10 }} onClick={onForget}>
            Forget it
          </button>
        </div>
      ) : null}

      {error ? <p className="error-line">{error}</p> : null}

      <div className="field">
        <label className="field-label" htmlFor="explorer-name">
          Your name
        </label>
        <input
          id="explorer-name"
          className="input"
          value={name}
          maxLength={16}
          placeholder="Name your explorer"
          autoComplete="nickname"
          onChange={(e) => onName(e.target.value)}
        />
      </div>

      <div className="field">
        <span className="field-label">Pick your explorer</span>
        <div className="rail" role="radiogroup" aria-label="Explorer">
          {Array.from({ length: AVATAR_COUNT }, (_, i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={avatar === i}
              aria-label={`Explorer ${i + 1}`}
              className={`avatar-pick${avatar === i ? ' is-picked' : ''}`}
              onClick={() => onAvatar(i)}
            >
              <Avatar index={i} />
            </button>
          ))}
        </div>
      </div>

      <div className="home-actions">
        <button type="button" className="btn btn-block" disabled={!ready || busy} onClick={onHost}>
          Host an expedition
        </button>

        <div className="divider">or join</div>

        <input
          className="input input-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
          placeholder="CODE"
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={4}
          aria-label="Room code"
        />
        <button
          type="button"
          className="btn btn-secondary btn-block"
          disabled={!ready || busy || code.trim().length !== 4}
          onClick={() => onJoin(code)}
        >
          Join
        </button>
      </div>

      <p className="hint">
        Add this to your Home Screen from the Share menu to play full-screen. Your seat is remembered, so you can drop
        out and walk straight back in.
      </p>
    </div>
  );
}
