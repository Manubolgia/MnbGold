import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { CloseIcon } from '../art/Icons.js';
import { ArtifactCard, CardBack, HAZARD_NAME, HazardCard, TreasureCard } from '../art/Cards.js';
import { SCHEMES, type Mode, type SchemeId } from '../lib/useTheme.js';
import { HAZARD_TYPES, TREASURE_VALUES, HAZARD_COPIES, ARTIFACT_COUNT } from '../../shared/types.js';

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2 className="sheet-title">{title}</h2>
          <span className="spacer" />
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

interface ThemeSheetProps {
  mode: Mode;
  scheme: SchemeId;
  onMode: (mode: Mode) => void;
  onScheme: (scheme: SchemeId) => void;
  onClose: () => void;
}

export function ThemeSheet({ mode, scheme, onMode, onScheme, onClose }: ThemeSheetProps) {
  return (
    <Sheet title="Appearance" onClose={onClose}>
      <div className="stack">
        <div className="field">
          <span className="field-label">Mode</span>
          <div className="row">
            <button
              type="button"
              className={`btn btn-block ${mode === 'dark' ? '' : 'btn-ghost'}`}
              aria-pressed={mode === 'dark'}
              onClick={() => onMode('dark')}
            >
              Dark
            </button>
            <button
              type="button"
              className={`btn btn-block ${mode === 'light' ? '' : 'btn-ghost'}`}
              aria-pressed={mode === 'light'}
              onClick={() => onMode('light')}
            >
              Light
            </button>
          </div>
        </div>

        <div className="field">
          <span className="field-label">Colour scheme</span>
          <div className="swatch-row">
            {SCHEMES.map((s) => (
              <button
                key={s.id}
                type="button"
                className="swatch"
                aria-pressed={scheme === s.id}
                onClick={() => onScheme(s.id)}
              >
                <span className="swatch-bars">
                  <i style={{ background: s.swatch[0] }} />
                  <i style={{ background: s.swatch[1] }} />
                  <i style={{ background: s.swatch[2] }} />
                </span>
                <strong>{s.name}</strong>
                <span className="swatch-name">{s.blurb}</span>
              </button>
            ))}
          </div>
          <p className="hint">
            Each scheme sets a main, a secondary and an accent colour. The accent is the one that flashes when the
            temple turns on you.
          </p>
        </div>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */

export function RulesSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Rules & cards" onClose={onClose}>
      <div className="rules">
        <p>
          Five expeditions into the same temple. Each one, you walk in with everybody else and decide — over and over —
          whether to go deeper or turn back with what you are carrying.
        </p>

        <h3>An expedition, turn by turn</h3>
        <ul>
          <li>A card is turned over from the deck onto the path.</li>
          <li>
            <strong>Treasure</strong> is split evenly between every explorer still inside. Gems that will not divide
            stay on the card.
          </li>
          <li>
            <strong>Hazards</strong> are harmless the first time. The <em>second</em> hazard of the same type ends the
            expedition on the spot — everybody still inside drops every gem they are carrying, and one copy of that
            hazard is removed from the game for good.
          </li>
          <li>
            <strong>Artifacts</strong> lie on the path until somebody leaves <em>alone</em> — that explorer carries out
            every artifact on the path.
          </li>
          <li>
            After each card, everybody still inside chooses at the same time: <strong>press on</strong> or{' '}
            <strong>get out</strong>.
          </li>
          <li>
            Explorers who leave put their gems safely in their tent and split whatever is still lying on the path
            between them. Leftovers stay on the path.
          </li>
          <li>The expedition ends when a hazard pair strikes, or when the last explorer has walked out.</li>
        </ul>

        <h3>Scoring</h3>
        <ul>
          <li>Gems in your tent are safe forever. Gems in your hand are not.</li>
          <li>
            The first three artifacts recovered in the game are worth <strong>5</strong> gems each; the fourth and fifth
            are worth <strong>10</strong>.
          </li>
          <li>Artifacts left on the path when an expedition ends are lost for the rest of the game.</li>
          <li>After five expeditions, the most gems wins.</li>
        </ul>

        <h3>The deck</h3>
        <p className="hint">
          {TREASURE_VALUES.length} treasures · {HAZARD_TYPES.length * HAZARD_COPIES} hazards ({HAZARD_COPIES} of each
          type) · {ARTIFACT_COUNT} artifacts, one shuffled in at the start of each expedition.
        </p>

        <h3>Treasure values</h3>
        <p className="mono">{TREASURE_VALUES.join(' · ')}</p>
        <div className="card-legend">
          {[5, 11, 17].map((v) => (
            <figure key={v}>
              <TreasureCard value={v} />
              <figcaption>{v} gems</figcaption>
            </figure>
          ))}
          <figure>
            <ArtifactCard />
            <figcaption>Artifact</figcaption>
          </figure>
        </div>

        <h3>Hazards</h3>
        <div className="card-legend">
          {HAZARD_TYPES.map((h) => (
            <figure key={h}>
              <HazardCard hazard={h} />
              <figcaption>{HAZARD_NAME[h]}</figcaption>
            </figure>
          ))}
          <figure>
            <CardBack />
            <figcaption>Deck</figcaption>
          </figure>
        </div>
      </div>
    </Sheet>
  );
}
