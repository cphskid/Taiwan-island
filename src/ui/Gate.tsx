import { PARK_MAP, PARK_URL } from '../net/park';

const BASE = import.meta.env.BASE_URL;

// 不能進來時：說原因、可以再試一次、或回樂園（平台規劃書「遊戲接入規則」第 2 條）
export function Gate({ reason, needLogin, onRetry }: { reason: string; needLogin: boolean; onRetry: () => void }) {
  return (
    <div className="center">
      <div className="panel gate">
        <img className="tick" src={`${BASE}img/tick/${needLogin ? 'wave' : 'thinking'}.webp`} alt="" />
        <p>{reason}</p>
        <div className="row">
          <button className="btn orange" onClick={onRetry}>再試一次</button>
          {PARK_URL && <a className="btn green" href={PARK_MAP ?? undefined}>{needLogin ? '去樂園登入' : '回樂園'}</a>}
        </div>
      </div>
    </div>
  );
}
