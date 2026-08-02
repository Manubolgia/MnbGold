import type { PublicPlayer } from '../../shared/types.js';
import { Avatar } from '../art/Avatars.js';
import { GemIcon, TentIcon } from '../art/Icons.js';

interface Props {
  players: PublicPlayer[];
  youId: string | null;
  /** Ids struck by the hazard on this frame, for the alarm pulse. */
  struck: string[];
}

/**
 * The explorer rail. Everyone stays mounted for the whole game — leaving only
 * changes opacity and badges, so the row never reflows mid-expedition.
 */
export function Explorers({ players, youId, struck }: Props) {
  return (
    <div className="rail">
      {players.map((p) => {
        const classes = [
          'explorer',
          p.inTemple ? '' : 'is-out',
          p.id === youId ? 'is-you' : '',
          p.inTemple && p.hasDecided ? 'is-decided' : '',
          struck.includes(p.id) ? 'is-struck' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <div key={p.id} className={classes} style={{ opacity: p.connected ? undefined : 0.4 }}>
            {p.leftWith !== null ? <span className="float-num is-gain">+{p.leftWith}</span> : null}
            {p.lostThisRound !== null && p.lostThisRound > 0 ? (
              <span className="float-num is-loss">−{p.lostThisRound}</span>
            ) : null}

            {p.artifacts > 0 ? <span className="explorer-badge">{p.artifacts}◆</span> : null}

            <Avatar index={p.avatar} title={p.name} className="seat-avatar" />
            <div className="explorer-name">{p.name}</div>
            <div className="explorer-figures">
              <span className="hand" title="Gems in hand — lost if a hazard pair strikes">
                <GemIcon size={10} />
                {p.inTemple ? p.hand : '—'}
              </span>
              <span className="chest" title="Gems safe in the tent">
                <TentIcon size={10} />
                {p.chest}
              </span>
            </div>
            {!p.connected ? <div className="score-detail">away</div> : null}
          </div>
        );
      })}
    </div>
  );
}
