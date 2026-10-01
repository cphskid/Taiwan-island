import { useEffect, useState } from 'react';
import { canEnter, PARK_URL, whoAmI, type Who } from '../net/park';
import { BoardView } from './BoardView';
import { Gate } from './Gate';

const BASE = import.meta.env.BASE_URL;

type State =
  | { step: 'checking' }
  | { step: 'blocked'; reason: string; needLogin: boolean }
  | { step: 'play'; who: Who };

export function App() {
  const [state, setState] = useState<State>({ step: 'checking' });

  const check = async () => {
    setState({ step: 'checking' });
    const who = await whoAmI();
    if (who.kind === 'guest') {
      setState({ step: 'blocked', reason: '請先回樂園登入，再從島嶼開拓者的設施進來。', needLogin: true });
      return;
    }
    const gate = await canEnter();
    if (!gate.ok) setState({ step: 'blocked', reason: gate.reason ?? '現在還不能進來', needLogin: false });
    else setState({ step: 'play', who });
  };

  useEffect(() => { void check(); }, []);

  return (
    <div className="app">
      <header className="top">
        {PARK_URL && (
          <a className="park-btn" href={PARK_URL} title="回樂園">
            <img src={`${BASE}img/park.webp`} alt="" />
            <span>回樂園</span>
          </a>
        )}
        <h1>穿越吧！島嶼開拓者</h1>
        {state.step === 'play' && <WhoBadge who={state.who} />}
      </header>
      {state.step === 'checking' && <div className="center">準備穿越中…</div>}
      {state.step === 'blocked' && <Gate reason={state.reason} needLogin={state.needLogin} onRetry={check} />}
      {state.step === 'play' && <BoardView />}
      <div className="rotate-hint">請把平板轉成橫的</div>
    </div>
  );
}

function WhoBadge({ who }: { who: Who }) {
  const name = who.kind === 'student' ? who.nickname
    : who.kind === 'staff' ? `${who.display_name}（老師）`
    : who.kind === 'local' ? '本機模式' : '';
  return <div className="who">{name}</div>;
}
