import { useEffect, useMemo, useState } from 'react';
import { ISLES, ISLE_LINES, IS_H, IS_W, igeo, iimg, type Isle } from '../data/isles';
import { islesDone, km, loadIsles, saveIsles, stampIsle, type IslesSave } from '../core/isles';
import { pushCloud } from '../net/cloud';
import { sfx } from '../audio';
import { SoundToggle } from './Sound';
import { ReportButton } from './Report';
import { Goal, Hand, compass } from './Guide';

// 現在篇「離島巡航」：點地圖上的小島 → 先答它在臺灣的哪個方向、哪片海 → 搭船（金門、馬祖坐飛機或過夜船）過去
// → 島上一個小事件（賞鯨、浮潛、堆菜宅、畫拼板舟、海底溫泉、量距離）→ 蓋郵戳。
const TICK = `${import.meta.env.BASE_URL}img/tick/`;
const VIEW = { a: igeo(117.6, 26.7), b: igeo(123.0, 21.6) }; // 看地圖的哪一塊
const vw = VIEW.b.x - VIEW.a.x, vh = VIEW.b.y - VIEW.a.y;
const pct = (p: { x: number; y: number }) => ({ left: `${(p.x / IS_W) * 100}%`, top: `${(p.y / IS_H) * 100}%` });

type Phase = 'ask' | 'sail' | 'event' | 'stamp';
// 目前的引導：左下角目標（一句下一個動作）＋手指要點的東西。島上小事件自己回報，統一在最外層畫（不然會被卡片蓋住）
type G = { id: string; text: string; hand?: string | null; first?: boolean };
type Guide = (g: G | null) => void;
function useG(guide: Guide, g: G | null) {
  const key = JSON.stringify(g);
  useEffect(() => { guide(g); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
}
const TW = igeo(120.95, 23.75); // 臺灣本島中間，用來說「在本島的哪一邊」
export function Isles({ onExit }: { onExit: () => void }) {
  const [s, setS] = useState<IslesSave>(loadIsles);
  useEffect(() => { saveIsles(s); pushCloud('isles', s); }, [s]);
  const [intro, setIntro] = useState(s.intro ? -1 : 0);
  const [cur, setCur] = useState<{ isle: Isle; phase: Phase; wrong: number[] } | null>(null);
  const [book, setBook] = useState(false);
  const [k, setK] = useState(0); // 開船動畫 0～1
  const [poked, setPoked] = useState(false); // 這次進來點過小島了沒（每次進來第一下都有手指帶）
  const [ev, setEv] = useState<G | null>(null); // 島上小事件回報的引導

  useEffect(() => {
    if (cur?.phase !== 'sail') return;
    let raf = 0; const t0 = performance.now();
    const loop = (now: number) => {
      const t = Math.min(1, (now - t0) / 3200); setK(t);
      if (t < 1) raf = requestAnimationFrame(loop); else setCur((c) => c && { ...c, phase: 'event' });
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cur?.phase]);

  const go = (isle: Isle) => { sfx('SE-03'); setPoked(true); setEv(null); setCur({ isle, phase: 'ask', wrong: [] }); };
  const fly = cur && /機場/.test(cur.isle.portName);
  const boat = cur?.phase === 'sail' ? (() => {
    const a = cur.isle.port, b = cur.isle.at, c = { x: (a.x + b.x) / 2 + (b.y - a.y) * 0.15, y: (a.y + b.y) / 2 - (b.x - a.x) * 0.15 };
    const u = 1 - k;
    return { x: u * u * a.x + 2 * u * k * c.x + k * k * b.x, y: u * u * a.y + 2 * u * k * c.y + k * k * b.y, flip: b.x < a.x };
  })() : null;

  // 每個步驟的左下角目標＋手指（進場引導原則：目標寫下一個動作、第一下手指帶、錯了給提示）
  const solved = !!cur?.wrong.includes(-1);
  const g: G | null = intro >= 0 || book ? null
    : !cur ? (islesDone(s)
      ? { id: 'isles-done', text: '郵戳都蓋滿了！想再玩就點小島。' }
      : { id: 'isles', text: `點一座小島，出發去看看。集滿 ${ISLES.length} 個郵戳。`, hand: '.isle-pin:not(.done)', first: !poked })
    : cur.phase === 'ask' ? (solved
      ? { id: `ask-${cur.isle.id}-go`, text: `按「從${cur.isle.portName}出發」。`, hand: '.isle-ask .btn.green', first: true }
      : { id: `ask-${cur.isle.id}`, text: `看地圖，選${cur.isle.name}在哪裡。${cur.isle.ask.q}`, hand: cur.wrong.length >= 2 ? '.isle-ask .t-opt.hint' : null, first: true })
    : cur.phase === 'sail' ? { id: `sail-${cur.isle.id}`, text: `${fly ? '坐飛機' : '坐船'}前往${cur.isle.name}……` }
    : cur.phase === 'event' ? ev
    : { id: `stamp-${cur.isle.id}`, text: '按「蓋進郵戳冊」。', hand: '.isle-stamp .btn.green', first: true };
  const east = cur ? cur.isle.at.x > TW.x : false; // 島在東邊 → 題目卡放左邊，別擋住島和海的名字
  const where = cur ? compass(cur.isle.at.x - TW.x, cur.isle.at.y - TW.y) : '';

  return (
    <div className="town isles">
      <div className="t-stage">
        <div className="t-map sky-view" style={{ aspectRatio: `${vw} / ${vh}`, width: `min(100cqw, calc(100cqh * ${vw / vh}))` }}>
          <div className="sky-map" style={{ width: `${(IS_W / vw) * 100}%`, height: `${(IS_H / vh) * 100}%`, left: `${(-VIEW.a.x / vw) * 100}%`, top: `${(-VIEW.a.y / vh) * 100}%`, cursor: 'default' }}>
            <img className="t-bg" src={iimg('map')} alt="臺灣和附近的島" draggable={false} />
            <span className="isle-label tw" style={pct(igeo(120.95, 23.75))}>臺灣本島</span>
            <span className="isle-label sea" style={pct(igeo(119.4, 24.6))}>臺灣海峽</span>
            <span className="isle-label sea" style={pct(igeo(122.6, 23.6))}>太平洋</span>
            <span className="isle-label sea" style={pct(igeo(120.9, 21.75))}>巴士海峽</span>
            <span className="isle-label sea" style={pct(igeo(122.2, 26.3))}>東海</span>
            {ISLES.map((i) => (
              <button key={i.id} className={`isle-pin ${s.stamps.includes(i.id) ? 'done' : ''} ${cur?.isle.id === i.id ? 'on' : cur ? 'off' : ''}`} style={pct(i.at)} onClick={() => !cur && go(i)} disabled={!!cur}>
                <i>{s.stamps.includes(i.id) ? '📮' : i.icon}</i><b>{i.name}</b>
              </button>
            ))}
            {boat && <span className={`isle-boat ${boat.flip ? 'flip' : ''}`} style={pct(boat)}>{fly ? '✈️' : '⛴️'}</span>}
            {cur?.phase === 'sail' && <span className="isle-port" style={pct(cur.isle.port)}>{cur.isle.portName}</span>}
          </div>
        </div>
      </div>

      {g && <>
        <Hand at={g.hand ?? null} first={g.first} />
        <Goal floating id={g.id} text={g.text} />
      </>}
      <header className="v-hud">
        <button className="v-chip v-back" onClick={() => { sfx('SE-02'); if (cur) setCur(null); else onExit(); }}>{cur ? '← 回地圖' : '← 大地圖'}</button>
        <span className="v-chip">⛴️ 離島巡航</span>
        <button className="v-chip" onClick={() => { sfx('SE-03'); setBook(true); }}>📮 郵戳冊 {s.stamps.length}/{ISLES.length}</button>
        <SoundToggle className="v-chip v-sound" />
        <ReportButton className="v-chip v-sound" screen="isles" />
      </header>

      {cur?.phase === 'ask' && (
        <div className={`isle-ask panel ${east ? 'l' : 'r'}`}>
            <h2>{cur.isle.icon} 要去{cur.isle.name}</h2>
            <p>{cur.isle.ask.q}</p>
            <div className="t-opts">
              {cur.isle.ask.options.map((o, i) => {
                const right = i === cur.isle.ask.answer && solved;
                if (solved && !right) return null; // 答對了只留對的那個，卡片小一點、不擋地圖
                const hint = !solved && i === cur.isle.ask.answer && cur.wrong.length >= 2; // 錯兩次：對的發亮
                return <button key={o} className={`t-opt ${cur.wrong.includes(i) ? 'no' : ''} ${right ? 'yes' : ''} ${hint ? 'hint' : ''}`} disabled={cur.wrong.includes(i) || solved}
                  onClick={() => { if (i === cur.isle.ask.answer) { sfx('SE-36'); setCur({ ...cur, wrong: [...cur.wrong, -1] }); } else { sfx('SE-04'); setCur({ ...cur, wrong: [...cur.wrong, i] }); } }}>{o}</button>;
              })}
            </div>
            {cur.wrong.includes(-1) ? <>
              <Tick text={cur.isle.ask.why} />
              <button className="btn green" onClick={() => { sfx('SE-03'); setK(0); setCur({ ...cur, phase: 'sail' }); }}>從{cur.isle.portName}出發 {fly ? '✈️' : '⛴️'}</button>
            </> : cur.wrong.length > 0 && <Tick text={`看地圖上發亮的${cur.isle.name}：它在臺灣本島的${where}。它旁邊寫著哪片海、靠著哪塊陸地？`} worried />}
        </div>
      )}

      {cur?.phase === 'event' && (
        <div className="talk-cover t-cover">
          <div className="t-judge panel isle-event">
            <h2>{cur.isle.icon} {cur.isle.name}</h2>
            <IsleEvent isle={cur.isle} guide={setEv} onDone={() => { sfx('SE-36'); setCur({ ...cur, phase: 'stamp' }); }} />
          </div>
        </div>
      )}

      {cur?.phase === 'stamp' && (
        <div className="talk-cover t-cover">
          <div className="t-news panel isle-stamp">
            <div className="postmark"><b>{cur.isle.stamp}</b><small>臺灣不只一座島</small></div>
            <p>{cur.isle.fact}</p>
            <button className="btn green" onClick={() => {
              const n = stampIsle(s, cur.isle.id);
              setS(n); setCur(null);
              if (islesDone(n) && !islesDone(s)) setBook(true);
            }}>蓋進郵戳冊</button>
          </div>
        </div>
      )}

      {book && (
        <div className="talk-cover t-cover" onClick={() => setBook(false)}>
          <div className="t-news panel" onClick={(e) => e.stopPropagation()}>
            <button className="x" onClick={() => { sfx('SE-02'); setBook(false); }} aria-label="關掉">✕</button>
            <small>郵戳冊</small>
            <h2>臺灣不只一座島</h2>
            <div className="stamps">{ISLES.map((i) => <div key={i.id} className={`postmark small ${s.stamps.includes(i.id) ? '' : 'empty'}`}><b>{s.stamps.includes(i.id) ? i.stamp : i.name}</b><small>{s.stamps.includes(i.id) ? i.icon : '還沒去'}</small></div>)}</div>
            {islesDone(s) && <p>🎉 全部蓋滿了！你是離島達人。還有更遠的東沙島、南沙太平島，要坐飛機才到得了喔。</p>}
          </div>
        </div>
      )}

      {intro >= 0 && (
        <div className="talk-cover" onClick={() => {
          sfx('SE-09');
          if (intro + 1 < ISLE_LINES.length) setIntro(intro + 1);
          else { setIntro(-1); setS({ ...s, intro: true }); }
        }}>
          <div className="talk">
            <div className="face small tick"><img src={`${TICK}happy.webp`} alt="" /></div>
            <div className="talk-body">
              <b style={{ color: '#ffc23d' }}>滴答</b>
              <p>{ISLE_LINES[intro]}</p>
              <span className="talk-next">{intro + 1 < ISLE_LINES.length ? '點一下繼續 ▶' : '點一下開始 ▶'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tick({ text, worried = false }: { text: string; worried?: boolean }) {
  return <div className="t-tick"><div className="face small tick"><img src={`${TICK}${worried ? 'thinking' : 'happy'}.webp`} alt="" /></div><p>{text}</p></div>;
}

type EvProps = { onDone: () => void; guide: Guide };
const DONE_HAND = '.isle-event .btn.green';
function IsleEvent({ isle, onDone, guide }: EvProps & { isle: Isle }) {
  switch (isle.event) {
    case 'turtle-hill': return <Whales onDone={onDone} guide={guide} />;
    case 'snorkel': return <Snorkel onDone={onDone} guide={guide} />;
    case 'wall': return <Wall onDone={onDone} guide={guide} />;
    case 'canoe': return <Canoe onDone={onDone} guide={guide} />;
    case 'spring': return <Spring onDone={onDone} guide={guide} />;
    case 'near': return <Near isle={isle} onDone={onDone} guide={guide} />;
  }
}

// 龜山島：先選它像什麼，再搭賞鯨船拍 5 隻海豚、鯨魚
function Whales({ onDone, guide }: EvProps) {
  const [step, setStep] = useState(0);
  const [wrong, setWrong] = useState<string[]>([]);
  const [got, setGot] = useState(0);
  const [pop, setPop] = useState<{ id: number; x: number; y: number; e: string } | null>(null);
  useEffect(() => {
    if (step !== 1 || got >= 5) return;
    let id = 0;
    const t = setInterval(() => { id++; setPop({ id, x: 10 + Math.random() * 80, y: 30 + Math.random() * 50, e: Math.random() < 0.65 ? '🐬' : '🐋' }); }, 1400);
    return () => clearInterval(t);
  }, [step, got]);
  useG(guide, step === 0 ? { id: 'whale-0', text: '選選看：這座島像什麼？', hand: wrong.length >= 2 ? '.t-opt.hint' : null, first: true }
    : got < 5 ? { id: 'whale-1', text: `點冒出來的海豚、鯨魚拍照（${got}/5）。`, hand: '.isle-critter', first: got === 0 }
    : { id: 'whale-done', text: '拍好了！按「上岸蓋章」。', hand: DONE_HAND, first: true });
  if (step === 0) return <>
    <p>從宜蘭的海邊看過去，這座島像什麼？</p>
    <div className="t-opts row">{[['🐢', '烏龜'], ['🐘', '大象'], ['🐟', '魚']].map(([e, n]) => (
      <button key={n} className={`t-opt big ${wrong.includes(n) ? 'no' : ''} ${n === '烏龜' && wrong.length >= 2 ? 'hint' : ''}`} disabled={wrong.includes(n)}
        onClick={() => { if (n === '烏龜') { sfx('SE-36'); setStep(1); } else { sfx('SE-04'); setWrong([...wrong, n]); } }}>{e} {n}</button>
    ))}</div>
    {wrong.length > 0 && <Tick text="看看島的樣子：一個圓圓的殼，前面還伸出一顆頭。" worried />}
  </>;
  return <>
    <p>{got < 5 ? `搭上賞鯨船！海豚、鯨魚冒出來的時候，快點牠拍照（${got}/5）` : '拍到 5 張了！龜山島附近的海域是海豚和鯨魚的家。'}</p>
    <div className="isle-sea">
      {pop && got < 5 && <button key={pop.id} className="isle-critter" style={{ left: `${pop.x}%`, top: `${pop.y}%` }} onClick={() => { sfx('SE-05'); setGot(got + 1); setPop(null); }}>{pop.e}</button>}
      <span className="isle-far">🐢⛰️</span>
    </div>
    {got >= 5 && <button className="btn green" onClick={onDone}>上岸蓋章</button>}
  </>;
}

// 小琉球：浮潛拍 3 隻海龜、3 種魚；碰到珊瑚會被提醒
function Snorkel({ onDone, guide }: EvProps) {
  const items = useMemo(() => {
    const xs: { id: number; e: string; kind: 'turtle' | 'fish' | 'coral'; x: number; y: number }[] = [];
    const add = (e: string, kind: 'turtle' | 'fish' | 'coral', n: number, y0: number, y1: number) => { for (let i = 0; i < n; i++) xs.push({ id: xs.length, e, kind, x: 6 + Math.random() * 88, y: y0 + Math.random() * (y1 - y0) }); };
    add('🪸', 'coral', 6, 70, 92); add('🐢', 'turtle', 3, 15, 60); add('🐠', 'fish', 2, 15, 70); add('🐟', 'fish', 1, 15, 70); add('🐡', 'fish', 1, 20, 65);
    return xs;
  }, []);
  const [shot, setShot] = useState<number[]>([]);
  const [warn, setWarn] = useState(false);
  const turtles = items.filter((i) => i.kind === 'turtle' && shot.includes(i.id)).length;
  const fish = items.filter((i) => i.kind === 'fish' && shot.includes(i.id)).length;
  const done = turtles >= 3 && fish >= 3;
  useG(guide, done ? { id: 'snorkel-done', text: '拍好了！按「上岸蓋章」。', hand: DONE_HAND, first: true }
    : { id: 'snorkel', text: `點海龜和魚拍照（海龜 ${turtles}/3、魚 ${fish}/3）。珊瑚不能碰。`, hand: turtles < 3 ? '.isle-critter.turtle:not(.shot)' : '.isle-critter.fish:not(.shot)', first: !shot.length });
  return <>
    <p>拍到海龜 {turtles}/3、魚 {fish}/3。記得：不能踩珊瑚、不能摸海龜，拍照就好！</p>
    <div className="isle-sea under">
      {items.map((it) => (
        <button key={it.id} className={`isle-critter swim ${shot.includes(it.id) ? 'shot' : ''} ${it.kind}`} style={{ left: `${it.x}%`, top: `${it.y}%`, animationDelay: `${it.id * 0.3}s` }}
          onClick={() => {
            if (it.kind === 'coral') { sfx('SE-04'); setWarn(true); setTimeout(() => setWarn(false), 2000); return; }
            if (!shot.includes(it.id)) { sfx('SE-05'); setShot([...shot, it.id]); }
          }}>{it.e}</button>
      ))}
      {warn && <span className="v-note">⚠️ 珊瑚是活的動物，踩到、碰到就會受傷！</span>}
    </div>
    {done && <button className="btn green" onClick={onDone}>上岸蓋章</button>}
  </>;
}

// 澎湖：東北季風來之前，把菜宅的矮牆缺口補起來
function Wall({ onDone, guide }: EvProps) {
  const N = 12;
  const gaps0 = useMemo(() => [1, 3, 4, 7, 9, 10], []);
  const [gaps, setGaps] = useState<number[]>(gaps0);
  const [t, setT] = useState(15);
  const [lost, setLost] = useState(false);
  useEffect(() => {
    if (!gaps.length || lost) return;
    if (t <= 0) { sfx('SE-04'); setLost(true); return; }
    const id = setTimeout(() => setT(t - 1), 1000);
    return () => clearTimeout(id);
  }, [t, gaps.length, lost]);
  useG(guide, !gaps.length ? { id: 'wall-done', text: '圍好了！按「上岸蓋章」。', hand: DONE_HAND, first: true }
    : lost ? { id: 'wall-lost', text: '風吹進來了，按「再試一次」。', hand: '.isle-event .btn.retry', first: true }
    : { id: 'wall', text: `點虛線缺口，把牆補起來（剩 ${gaps.length} 個）。`, hand: '.stone.gap', first: gaps.length === gaps0.length });
  return <>
    <p>{!gaps.length ? '矮牆圍好了！強風吹不進來，菜園的菜都保住了。' : lost ? '東北季風吹進缺口，菜都被吹壞了……再試一次！' : `東北季風 ${t} 秒後就到！點缺口，用咾咕石把牆補起來。`}</p>
    <div className="isle-garden">
      <span className="wind">🌬️</span>
      {Array.from({ length: N }, (_, i) => {
        const a = (i / N) * Math.PI * 2, gap = gaps.includes(i);
        return <button key={i} className={`stone ${gap ? 'gap' : ''}`} style={{ left: `${50 + Math.cos(a) * 38}%`, top: `${50 + Math.sin(a) * 38}%` }}
          disabled={!gap || lost} onClick={() => { sfx('SE-05'); setGaps(gaps.filter((g) => g !== i)); }}>{gap ? '' : '🪨'}</button>;
      })}
      <span className="veg">{lost ? '🥀' : '🥬🥕🥬'}</span>
    </div>
    {lost && <button className="btn retry" onClick={() => { setGaps(gaps0); setT(15); setLost(false); }}>再試一次</button>}
    {!gaps.length && <button className="btn green" onClick={onDone}>上岸蓋章</button>}
  </>;
}

// 蘭嶼：照著範本，把拼板舟的圖紋塗上紅、白、黑
const CANOE = ['red', 'white', 'black', 'red', 'white', 'black', 'white', 'red'] as const;
const NEXT: Record<string, string> = { none: 'red', red: 'white', white: 'black', black: 'red' };
function Canoe({ onDone, guide }: EvProps) {
  const [cells, setCells] = useState<string[]>(CANOE.map(() => 'none'));
  const ok = cells.every((c, i) => c === CANOE[i]);
  const bad = cells.findIndex((c, i) => c !== CANOE[i]); // 第一個還沒塗對的格子，手指指這裡
  const right = cells.filter((c, i) => c === CANOE[i]).length;
  useG(guide, ok ? { id: 'canoe-done', text: '畫好了！按「參加下水祭，蓋章」。', hand: DONE_HAND, first: true }
    : { id: 'canoe', text: `點格子換顏色，跟範本一樣（${right}/${CANOE.length}）。點一下換一個顏色：紅→白→黑。`, hand: `.canoe.paint button[data-i="${bad}"]`, first: cells.every((c) => c === 'none') });
  return <>
    <p>{ok ? '圖紋畫好了！新船下水，全村一起唱歌划船。' : '達悟族的拼板舟有紅、白、黑三色圖紋。點下面的格子換顏色，畫得跟上面的範本一樣。'}</p>
    <div className="canoe ref">{CANOE.map((c, i) => <i key={i} className={c} />)}<span>範本</span></div>
    <div className="canoe paint">{cells.map((c, i) => <button key={i} data-i={i} className={c} onClick={() => { sfx('SE-09'); setCells(cells.map((x, j) => (j === i ? NEXT[x] : x))); }} aria-label={`第 ${i + 1} 格`} />)}<span>🛶</span></div>
    {ok && <button className="btn green" onClick={onDone}>參加下水祭，蓋章</button>}
  </>;
}

// 綠島：兩題火山島小問題
const SPRING_Q = [
  { q: '綠島的海邊為什麼有熱熱的溫泉？', o: ['綠島是火山島，地底下還有熱', '有人在海邊燒熱水', '太陽把海水曬熱了'], a: 0, hint: '海水溫泉是從地底下冒出來的。地底下為什麼會熱？' },
  { q: '綠島、龜山島、澎湖，都是怎麼形成的？', o: ['珊瑚堆出來的', '火山噴發形成的', '從臺灣本島斷開漂過去的'], a: 1, hint: '想想上一題：綠島地底下為什麼有熱？' },
];
function Spring({ onDone, guide }: EvProps) {
  const [i, setI] = useState(0);
  const [wrong, setWrong] = useState<number[]>([]);
  useG(guide, i >= SPRING_Q.length ? { id: 'spring-done', text: '泡好了！按「泡好了，蓋章」。', hand: DONE_HAND, first: true }
    : { id: 'spring', text: `回答火山島小問題（${i + 1}/${SPRING_Q.length}）。`, hand: wrong.length >= 2 ? '.t-opt.hint' : null, first: true });
  if (i >= SPRING_Q.length) return <>
    <p>♨️ 泡在朝日溫泉裡，一邊是熱熱的泉水，一邊是太平洋的日出。</p>
    <button className="btn green" onClick={onDone}>泡好了，蓋章</button>
  </>;
  const q = SPRING_Q[i];
  return <>
    <p>{q.q}</p>
    <div className="t-opts">{q.o.map((o, j) => <button key={o} className={`t-opt ${wrong.includes(j) ? 'no' : ''} ${j === q.a && wrong.length >= 2 ? 'hint' : ''}`} disabled={wrong.includes(j)}
      onClick={() => { if (j === q.a) { sfx('SE-36'); setI(i + 1); setWrong([]); } else { sfx('SE-04'); setWrong([...wrong, j]); } }}>{o}</button>)}</div>
    {wrong.length > 0 && <Tick text={q.hint} worried />}
  </>;
}

// 金門、馬祖：在地圖上量一量，離中國大陸近、離臺灣本島遠
const NEAR_TO: Record<string, { china: [number, number]; chinaName: string; tw: [number, number]; twName: string }> = {
  kinmen: { china: [118.13, 24.48], chinaName: '廈門', tw: [120.43, 24.2], twName: '臺中港' },
  matsu: { china: [119.83, 26.33], chinaName: '黃岐半島', tw: [121.74, 25.13], twName: '基隆港' },
};
function Near({ isle, onDone, guide }: EvProps & { isle: Isle }) {
  const p = NEAR_TO[isle.id];
  const [seen, setSeen] = useState<string[]>([]);
  const me: [number, number] = isle.id === 'kinmen' ? [118.35, 24.44] : [119.95, 26.16];
  const d1 = Math.round(km(me, p.china)), d2 = Math.round(km(me, p.tw));
  useG(guide, seen.length === 2 ? { id: 'near-done', text: '量好了！比一比，再按「蓋章」。', hand: DONE_HAND, first: true }
    : { id: 'near', text: `按兩把📏尺，量量看距離（${seen.length}/2）。`, hand: seen.includes('c') ? '.isle-event .near-t' : '.isle-event .near-c', first: !seen.length });
  return <>
    <p>拿出尺量一量：{isle.name}離哪裡比較近？</p>
    <div className="t-opts">
      <button className="t-opt near-c" onClick={() => { sfx('SE-05'); setSeen([...new Set([...seen, 'c'])]); }}>📏 量到{p.chinaName}（中國大陸）{seen.includes('c') ? `：大約 ${d1} 公里` : ''}</button>
      <button className="t-opt near-t" onClick={() => { sfx('SE-05'); setSeen([...new Set([...seen, 't'])]); }}>📏 量到{p.twName}（臺灣本島）{seen.includes('t') ? `：大約 ${d2} 公里` : ''}</button>
    </div>
    {seen.length === 2 && <>
      <Tick text={`離中國大陸只有 ${d1} 公里，離臺灣本島卻有 ${d2} 公里！所以去${isle.name}要坐飛機，或坐很久的船。`} />
      <button className="btn green" onClick={onDone}>蓋章</button>
    </>}
  </>;
}
