import type { PublicPlayer } from '../../shared/types.js';
import { Avatar } from '../art/Avatars.js';
import { ArtifactIcon, GemIcon } from '../art/Icons.js';

export const totalScore = (p: PublicPlayer): number => p.chest + p.artifactPoints;

/** Rank, face, name, and the split as icons — no sentence to parse. */
export function Scores({ players, youId }: { players: PublicPlayer[]; youId: string | null }) {
  const ranked = [...players].sort((a, b) => totalScore(b) - totalScore(a));
  const best = ranked.length > 0 ? totalScore(ranked[0]) : 0;

  return (
    <div className="score-list">
      {ranked.map((p, i) => {
        const total = totalScore(p);
        const winner = total === best && total > 0;
        return (
          <div
            key={p.id}
            className={`score-row${winner ? ' is-winner' : ''}`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="score-rank">{i + 1}</span>
            <Avatar index={p.avatar} title={p.name} className="seat-avatar" />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="seat-name">
                {p.name}
                {p.id === youId ? ' (you)' : ''}
              </div>
              <div className="score-detail">
                <span>
                  <GemIcon size={11} />
                  {p.chest}
                </span>
                {p.artifacts > 0 ? (
                  <span>
                    <ArtifactIcon size={11} />
                    {p.artifacts} · {p.artifactPoints}
                  </span>
                ) : null}
              </div>
            </div>
            <span className="score-total mono">{total}</span>
          </div>
        );
      })}
    </div>
  );
}
