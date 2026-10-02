import { useEffect, useState } from 'react';
import { CARDS, SHARE_HINT, SHARE_INTRO, SHARE_RIVER, img, type Line, type Who } from '../../data/babao-chapter';
import { DRY_HOLD, FIELDS, FLOW, RAIN_HOLD, RIVER_MIN, goodRange, riverLeft, riverOk, setGate, startShare, stateOf, tick, type Share, type Side } from '../../core/share';
import { CardPop, Face, Say, Talk } from '../Talk';
import type { StepProps } from '../Chapter';
import { ambience, jingle, sfx } from '../../audio';

const HINT_AT = 3;
const SHOW_AT = 5;

const SAYS: Record<ReturnType<typeof stateOf>, string> = {
  dry: '田都乾掉了！水不夠！',
  flood: '水太多了，秧苗要淹死了！',
  ok: '水剛剛好！',
};
// 誰幫哪一邊說話：阿蓮是漳州莊的，泉州莊是莊民，溪是阿穆
const VOICE: Record<Side, Who> = { zhang: 'lian', quan: 'quan' };

// 步驟 4 分水協商：拉兩塊閘板，讓兩莊 10 塊田都綠、溪裡也留水，還要撐過旱季變雨季
export function ShareStep({ p, set, next }: StepProps) {
  const [s, setS] = useState<Share>(startShare);
  const [intro, setIntro] = useState(true);
  const [rainNote, setRainNote] = useState(false);
  const [card, setCard] = useState(false);

  useEffect(() => {
    if (intro || s.done) return;
    const id = window.setInterval(() => setS((old) => tick(old, 0.1)), 100);
    return () => clearInterval(id);
  }, [intro, s.done]);
  useEffect(() => { if (s.rained) { sfx('SE-74'); setRainNote(true); } }, [s.rained]);
  useEffect(() => { ambience(s.season === 'dry' ? 'SE-75' : 'SE-76'); }, [s.season]);
  useEffect(() => { if (s.done) { sfx('SE-60'); jingle('MU-13'); } }, [s.done]);
  useEffect(() => { if (rainNote) { const t = setTimeout(() => setRainNote(false), 5000); return () => clearTimeout(t); } }, [rainNote]);
  useEffect(() => {
    if (s.done && !p.cards.includes('gate')) { set((o) => ({ ...o, cards: [...o.cards, 'gate'] })); setCard(true); }
  }, [s.done]); // eslint-disable-line react-hooks/exhaustive-deps

  const goal = s.season === 'dry' ? DRY_HOLD : RAIN_HOLD;
  const river = riverOk(s.season, s.gates);
  const touched = s.gates.zhang + s.gates.quan > 0;
  const line: Line | null = s.done ? { who: 'tick', mood: 'happy', text: '田綠了，溪裡也有水，季節變了也撐住了！' }
    : rainNote ? { who: 'tick', mood: 'worried', text: '雨季來了！溪水變多，田快淹了！' }
    : touched && !river ? SHARE_RIVER
    : s.fails >= SHOW_AT ? { who: 'lin', text: '閘板下面綠色的範圍剛剛好，拉到綠色裡試試。' }
    : s.fails >= HINT_AT ? SHARE_HINT
    : null;
  const maxTotal = Math.floor(100 * (1 - RIVER_MIN / FLOW[s.season]));

  return (
    <div className={`scene share ${s.season}`} style={{ backgroundImage: `url(${img('S-02')})` }}>
      <div className="share-top">
        <span className={`season ${s.season}`}><img src={img(s.season === 'dry' ? 'g-sun' : 'g-rain')} alt="" />{s.season === 'dry' ? '旱季' : '雨季'}：溪水 {FLOW[s.season]} 份</span>
        <div className="hold">
          <span>{s.done ? '完成！' : s.season === 'dry' ? '全部綠著撐住，等雨季來' : '雨季也撐住就過關'}</span>
          <div className="bar"><i style={{ width: `${Math.min(100, (s.hold / goal) * 100)}%` }} /></div>
        </div>
      </div>
      <div className="river-head"><img src={img('g-water')} alt="" />濁水溪 → 圳道 → <img src={img('gate')} alt="" /><b>分水閘</b></div>
      <div className="branches">
        {(['zhang', 'quan'] as Side[]).map((side) => {
          const st = stateOf(s.moist[side]);
          const other = stateOf(s.moist[side === 'zhang' ? 'quan' : 'zhang']);
          const unfair = st !== 'ok' && other === 'ok';
          const [lo, hiField] = goodRange(s.season, side);
          const hi = Math.min(hiField, maxTotal - s.gates[side === 'zhang' ? 'quan' : 'zhang']);
          return (
            <div key={side} className={`branch ${side}`}>
              <div className={`canal-line ${s.gates[side] ? 'wet' : ''}`} style={{ ['--w' as string]: `${4 + s.gates[side] / 6}px` }} />
              <div className="villager">
                <Face who={VOICE[side]} small />
                <div className={`bubble ${st}`}>{unfair ? `不公平！${SAYS[st]}` : SAYS[st]}</div>
              </div>
              <h3>{side === 'zhang' ? '漳州莊' : '泉州莊'}・{FIELDS[side]} 塊田</h3>
              <div className="paddies">
                {Array.from({ length: FIELDS[side] }, (_, i) => <span key={i} className={`paddy ${st}`} />)}
              </div>
              <label className="gate-slider">
                <span>閘板開 <b>{s.gates[side]}%</b></span>
                <input
                  type="range" min={0} max={100} step={5} value={s.gates[side]} disabled={intro || s.done}
                  style={s.fails >= SHOW_AT ? { background: `linear-gradient(90deg,#d9c9a3 ${lo}%,#7fd85a ${lo}%,#7fd85a ${hi}%,#d9c9a3 ${hi}%)` } : undefined}
                  onChange={(e) => setS((old) => setGate(old, side, Number(e.target.value)))}
                  onPointerUp={() => sfx('SE-73')}
                />
              </label>
            </div>
          );
        })}
      </div>
      <div className={`river-keep ${river ? 'ok' : 'dry'}`}>
        <Face who="mu" small />
        <div>
          <b>溪裡留下的水：{Math.round(riverLeft(s.season, s.gates) * 10) / 10} 份</b>
          <small>至少要 {RIVER_MIN} 份</small>
        </div>
      </div>
      <Say line={line} />
      {s.done && !card && (
        <div className="next-bar"><span>分水成功！</span><button className="btn green" onClick={next}>下一步：豐收</button></div>
      )}
      {intro && <Talk lines={SHARE_INTRO} onDone={() => setIntro(false)} />}
      {card && <CardPop title={CARDS.gate.title} text={CARDS.gate.text} onClose={() => setCard(false)} />}
    </div>
  );
}
