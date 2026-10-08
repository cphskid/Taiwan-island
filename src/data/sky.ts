// 現在篇「天空港」：以臺灣為中心的東亞海圖。飛機、貨櫃輪從港口出發，玩家用手指畫航線送到目的地。
// 底圖 public/img/sky/map.webp 由 tools/sky-map.py 用真的海岸線畫（麥卡托投影），陸地格子在 skyLand.ts。
// 座標一律用「地圖單位」：寬 2000、高 SKY_H；經緯度用 geo() 換算。

import { SKY_H, SKY_W } from './skyLand';
export { SKY_H, SKY_W };

const LON0 = 88, LON1 = 158, LAT0 = -4, LAT1 = 44; // 要跟 tools/sky-map.py 一樣
const my = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const Y0 = my(LAT1), Y1 = my(LAT0);
export const geo = (lon: number, lat: number) => ({ x: ((lon - LON0) / (LON1 - LON0)) * SKY_W, y: ((Y0 - my(lat)) / (Y0 - Y1)) * SKY_H });
export const simg = (n: string) => `${import.meta.env.BASE_URL}img/sky/${n}.webp`;

export type Kind = 'plane' | 'ship';
export interface Port {
  id: string; name: string; country: string;
  kind: 'air' | 'sea' | 'both';
  at: { x: number; y: number };
  dir?: string; // 在臺灣的哪個方向（第一關教方位）
  gate?: string; // 地圖邊上的出口：往哪一洲、經過哪個洋
  home?: boolean; // 臺灣的機場、港口
  side?: 'r' | 'l'; // 名字寫在旁邊（臺灣的兩個靠很近）
}

// 港口放在岸邊外一點點（船才開得到）；機場用城市的位置
export const PORTS: Port[] = [
  { id: 'tpe', name: '桃園機場', country: '臺灣', kind: 'air', at: geo(121.2, 25.1), home: true, side: 'r' },
  { id: 'khh', name: '高雄港', country: '臺灣', kind: 'sea', at: geo(120.05, 22.55), home: true, side: 'l' },
  { id: 'tyo', name: '東京', country: '日本', kind: 'both', at: geo(139.85, 35.3), dir: '東北方' },
  { id: 'sel', name: '首爾', country: '韓國', kind: 'air', at: geo(126.98, 37.55), dir: '北方' },
  { id: 'pus', name: '釜山', country: '韓國', kind: 'sea', at: geo(129.1, 34.95), dir: '北方' },
  { id: 'sha', name: '上海', country: '中國', kind: 'both', at: geo(122.3, 31.0), dir: '西北方' },
  { id: 'mnl', name: '馬尼拉', country: '菲律賓', kind: 'both', at: geo(120.7, 14.5), dir: '南方' },
  { id: 'hkg', name: '香港', country: '中國香港', kind: 'both', at: geo(114.3, 22.1), dir: '西南方' },
  { id: 'sgn', name: '胡志明市', country: '越南', kind: 'air', at: geo(106.7, 10.8), dir: '西南方' },
  { id: 'bkk', name: '曼谷', country: '泰國', kind: 'air', at: geo(100.5, 13.75), dir: '西南方' },
  { id: 'sin', name: '新加坡', country: '新加坡', kind: 'both', at: geo(104.0, 1.15), dir: '西南方' },
  // 地圖邊上的出口（第三關）
  { id: 'eu', name: '往歐洲、非洲', country: '印度洋', kind: 'both', at: geo(89.5, 5.5), gate: '經過麻六甲海峽進入印度洋，再往西到歐洲、非洲' },
  { id: 'am', name: '往美洲', country: '太平洋', kind: 'both', at: geo(156.5, 33), gate: '橫越太平洋，往東到美洲' },
  { id: 'oc', name: '往大洋洲', country: '太平洋', kind: 'both', at: geo(146, -2.5), gate: '往南越過赤道，到澳洲和紐西蘭' },
];
export const portById = (id: string) => PORTS.find((p) => p.id === id)!;

// 海的名字：航線經過時跳出來（多邊形用經緯度描，判斷時換成地圖單位）
const SEA_POLY: { name: string; poly: [number, number][] }[] = [
  { name: '臺灣海峽', poly: [[117.3, 23.4], [119.5, 21.9], [120.6, 22.4], [121.0, 25.0], [121.8, 25.4], [120.5, 26.4], [119.0, 25.6]] },
  { name: '巴士海峽', poly: [[119.5, 21.9], [120.9, 21.8], [122.2, 21.8], [122.2, 19.6], [119.8, 19.6]] },
  { name: '東海', poly: [[119.5, 26.0], [121.8, 25.4], [123.0, 25.0], [129.5, 29.0], [127.5, 33.3], [126.0, 33.2], [121.5, 32.2], [120.0, 28.0]] },
  { name: '黃海', poly: [[119.0, 33.0], [121.5, 32.2], [126.0, 33.2], [126.8, 37.5], [124.5, 40.0], [119.0, 39.5]] },
  { name: '日本海', poly: [[127.5, 35.0], [130.5, 33.8], [136.0, 35.5], [141.0, 41.5], [141.5, 44.0], [129.0, 44.0], [128.5, 38.5]] },
  { name: '南海', poly: [[105.0, 3.0], [109.5, 1.0], [117.5, 6.8], [119.8, 10.5], [120.4, 14.0], [120.0, 18.5], [119.8, 19.6], [119.5, 21.9], [117.3, 23.4], [113.5, 22.0], [108.5, 21.5], [106.0, 18.0], [109.0, 12.0], [104.5, 9.0]] },
  { name: '太平洋', poly: [[122.2, 19.6], [122.2, 21.8], [123.0, 25.0], [129.5, 29.0], [131.0, 31.0], [136.0, 33.5], [141.0, 35.5], [143.0, 44.0], [158.0, 44.0], [158.0, -4.0], [128.0, -4.0], [127.0, 4.0], [126.5, 8.0], [124.5, 13.0]] },
  { name: '印度洋', poly: [[88.0, -4.0], [88.0, 15.0], [94.0, 15.0], [98.3, 8.0], [100.0, 5.0], [102.0, 1.5], [104.0, -4.0]] },
];
export const SEAS = SEA_POLY.map((s) => ({ name: s.name, poly: s.poly.map(([lon, lat]) => geo(lon, lat)) }));
export function seaAt(p: { x: number; y: number }): string | null {
  for (const s of SEAS) {
    let inside = false;
    for (let i = 0, j = s.poly.length - 1; i < s.poly.length; j = i++) {
      const a = s.poly[i], b = s.poly[j];
      if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
    }
    if (inside) return s.name;
  }
  return null;
}

// 臺北飛航情報區（大約的範圍）：別國的飛機飛過這裡，要付「過境航路服務費」
const FIR_A = geo(117.5, 29), FIR_B = geo(124, 21);
export const FIR = { x0: FIR_A.x, y0: FIR_A.y, x1: FIR_B.x, y1: FIR_B.y };
export const inFir = (p: { x: number; y: number }) => p.x >= FIR.x0 && p.x <= FIR.x1 && p.y >= FIR.y0 && p.y <= FIR.y1;
export const FEE = 8; // 一架飛機的過境費（遊戲幣）

export interface Trip { kind: Kind; from: string; to: string }
export interface Level {
  id: number; name: string; blurb: string; lines: string[];
  trips: Trip[];
  every: number; // 幾秒來一架／一艘
  typhoon?: boolean;
  fee: number; // 三顆星要收到的過境費
  learn: string; // 過關時滴答說的
  view: [number, number, number, number]; // 這關看地圖的哪一塊（經度、緯度：西、北、東、南）
}

export const LEVELS: Level[] = [
  {
    id: 1, name: '鄰居', blurb: '把飛機和貨櫃輪送到臺灣的鄰居：日本、韓國、中國、菲律賓。',
    lines: [
      '歡迎來到天空港！你是桃園機場塔台、也是高雄港的小調度員。',
      '飛機和貨櫃輪頭上寫著要去哪裡。按住它，用手指畫一條線拉到目的地，它就會照著線走。',
      '飛機可以飛過陸地，船只能走海上。航線經過哪一片海，會念出海的名字。',
      '兩架飛機、兩艘船靠太近會擦撞，記得把航線錯開！',
    ],
    trips: [
      { kind: 'plane', from: 'tpe', to: 'tyo' }, { kind: 'ship', from: 'khh', to: 'mnl' }, { kind: 'plane', from: 'tpe', to: 'sha' },
      { kind: 'ship', from: 'khh', to: 'pus' }, { kind: 'plane', from: 'tpe', to: 'sel' }, { kind: 'ship', from: 'khh', to: 'sha' },
    ],
    every: 7, fee: 0, view: [109, 44, 145, 10],
    learn: '臺灣的東北方是日本、北方是韓國、西邊隔著臺灣海峽是中國、南邊隔著巴士海峽是菲律賓。東邊是一望無際的太平洋！',
  },
  {
    id: 2, name: '中點站', blurb: '日本、韓國的飛機要飛去東南亞，都會經過臺灣上空。',
    lines: [
      '你發現了嗎？臺灣剛好在東北亞和東南亞的中間。',
      '這一關，很多別國的飛機要從日本、韓國飛去東南亞，會經過「臺北飛航情報區」（虛線框）。',
      '飛過這裡的飛機，要付「過境航路服務費」給臺灣。讓它們安全通過，就能收到過境費！',
      '小心颱風！颱風圈裡很危險，航線要繞開。',
    ],
    trips: [
      { kind: 'plane', from: 'tyo', to: 'sin' }, { kind: 'plane', from: 'sel', to: 'bkk' }, { kind: 'ship', from: 'pus', to: 'sin' },
      { kind: 'plane', from: 'sha', to: 'mnl' }, { kind: 'plane', from: 'tyo', to: 'sgn' }, { kind: 'plane', from: 'hkg', to: 'tyo' },
      { kind: 'ship', from: 'khh', to: 'hkg' }, { kind: 'plane', from: 'sel', to: 'mnl' },
    ],
    every: 6, typhoon: true, fee: 40, view: [97, 41, 147, -1],
    learn: '東北亞和東南亞之間的航線，很多都要經過臺灣附近。臺灣就像一個「中點站」，也是進出亞洲的門戶！',
  },
  {
    id: 3, name: '五洲三洋', blurb: '從臺灣出發，開往世界各洲：歐洲、非洲、美洲、大洋洲。',
    lines: [
      '臺灣的貨要賣到全世界！這一關要把船和飛機送出地圖邊上的出口。',
      '往歐洲、非洲的船，要穿過麻六甲海峽進入印度洋；往美洲要橫越太平洋；往澳洲要往南越過赤道。',
      '世界有五大洲、三大洋：亞洲、歐洲、非洲、美洲、大洋洲，還有太平洋、印度洋、大西洋。',
    ],
    trips: [
      { kind: 'ship', from: 'khh', to: 'eu' }, { kind: 'plane', from: 'tpe', to: 'am' }, { kind: 'ship', from: 'khh', to: 'oc' },
      { kind: 'plane', from: 'tpe', to: 'eu' }, { kind: 'ship', from: 'khh', to: 'am' }, { kind: 'plane', from: 'tpe', to: 'oc' },
      { kind: 'plane', from: 'tyo', to: 'sin' }, { kind: 'ship', from: 'sha', to: 'eu' },
    ],
    every: 6, typhoon: true, fee: 8, view: [88, 44, 158, -4],
    learn: '從臺灣出發，往西經過印度洋到歐洲和非洲，往東橫越太平洋到美洲，往南到大洋洲。大西洋在歐洲、非洲和美洲之間喔！',
  },
];
