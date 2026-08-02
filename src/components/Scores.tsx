import type { PublicPlayer } from '../../shared/types.js';
import { Avatar } from '../art/Avatars.js';

export const totalScore = (p: PublicPlayer): number => p.chest + p.artifactPoints;

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
                {p.chest} from gems
                {p.artifacts > 0 ? ` · ${p.artifacts} artifact${p.artifacts === 1 ? '' : 's'} worth ${p.artifactPoints}` : ''}
              </div>
            </div>
            <span className="score-total mono">{total}</span>
          </div>
        );
      })}
    </div>
  );
}
