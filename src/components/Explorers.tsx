import type { PublicPlayer } from '../../shared/types.js';
import { Avatar } from '../art/Avatars.js';
import { ArtifactIcon, CheckIcon, GemIcon, TentIcon } from '../art/Icons.js';

interface Props {
  players: PublicPlayer[];
  youId: string | null;
  /** Ids struck by the hazard on this frame, for the alarm pulse. */
  struck: string[];
}

/**
 * Balances the tiles into rows of at most five, so two explorers get two wide
 * tiles and ten get two tidy rows — never one item stranded on its own line.
 */
function columns(count: number): number {
  if (count <= 1) return 1;
  const rows = Math.ceil(count / 5);
  return Math.ceil(count / rows);
}

/**
 * The explorer board.
 *
 * Being in the temple or back at camp is the one thing that has to be obvious
 * without reading, so the two states share no visual: inside is a solid tile
 * with a lit gem count, out is a dashed, drained tile stamped with a tent. Every
 * player stays mounted for the whole game, so leaving only re-skins a tile —
 * the board never reflows mid-expedition.
 */
export function Explorers({ players, youId, struck }: Props) {
  return (
    <div className="board" style={{ ['--cols' as string]: columns(players.length) }}>
      {players.map((p) => {
        const classes = [
          'explorer',
          p.inTemple ? 'is-in' : 'is-out',
          p.id === youId ? 'is-you' : '',
          p.inTemple && p.hasDecided ? 'is-decided' : '',
          struck.includes(p.id) ? 'is-struck' : '',
          p.connected ? '' : 'is-away',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <div key={p.id} className={classes}>
            {p.leftWith !== null ? <span className="float-num is-gain">+{p.leftWith}</span> : null}
            {p.lostThisRound !== null && p.lostThisRound > 0 ? (
              <span className="float-num is-loss">−{p.lostThisRound}</span>
            ) : null}

            <div className="explorer-face">
              <Avatar index={p.avatar} title={p.name} className="explorer-avatar" />
              {/* One stamp per tile: out beats decided, decided beats nothing. */}
              {!p.inTemple ? (
                <span className="stamp is-camp" title={`${p.name} is back at camp`}>
                  <TentIcon size={13} />
                </span>
              ) : p.hasDecided ? (
                <span className="stamp is-ready" title={`${p.name} has locked in`}>
                  <CheckIcon size={12} />
                </span>
              ) : null}
              {p.artifacts > 0 ? (
                <span className="stamp is-relic" title={`${p.artifacts} artifacts`}>
                  <ArtifactIcon size={11} />
                  {p.artifacts}
                </span>
              ) : null}
            </div>

            <div className="explorer-name">{p.name}</div>

            <div className="explorer-figure">
              {p.inTemple ? <GemIcon size={11} /> : <TentIcon size={11} />}
              {p.inTemple ? p.hand : p.chest}
            </div>
          </div>
        );
      })}
    </div>
  );
}
