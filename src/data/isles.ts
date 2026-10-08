// 現在篇「離島巡航」：搭小船一座一座登島，每座一個 1～2 分鐘的小事件，過關蓋一枚郵戳。
// 底圖 public/img/isles/map.webp 是 tools/sky-map.py 用真實海岸線畫的（經緯度範圍見 IS_BOX）。

export const IS_W = 2000, IS_H = 1643;
const LON0 = 116.6, LON1 = 124.6, LAT0 = 21.0, LAT1 = 27.0; // 要跟 tools/sky-map.py 的 isles 一樣
const my = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const Y0 = my(LAT1), Y1 = my(LAT0);
export const igeo = (lon: number, lat: number) => ({ x: ((lon - LON0) / (LON1 - LON0)) * IS_W, y: ((Y0 - my(lat)) / (Y0 - Y1)) * IS_H });
export const iimg = (n: string) => `${import.meta.env.BASE_URL}img/isles/${n}.webp`;

export type Event = 'turtle-hill' | 'snorkel' | 'canoe' | 'spring' | 'wall' | 'near';
export interface Isle {
  id: string; name: string; icon: string;
  at: { x: number; y: number }; port: { x: number; y: number }; portName: string;
  ask: { q: string; options: string[]; answer: number; why: string }; // 出發前：在哪個方向、哪片海
  event: Event;
  stamp: string; // 郵戳上的字
  fact: string; // 蓋章時的小知識
}

export const ISLES: Isle[] = [
  {
    id: 'guishan', name: '龜山島', icon: '🐢', at: igeo(121.95, 24.84), port: igeo(121.87, 24.87), portName: '烏石港',
    ask: { q: '龜山島在臺灣本島的哪一邊？', options: ['東北邊，宜蘭外海的太平洋上', '西邊的臺灣海峽', '南邊的巴士海峽'], answer: 0, why: '龜山島在宜蘭外海，屬於太平洋，從頭城的海邊就看得到。' },
    event: 'turtle-hill', stamp: '龜山島・賞鯨', fact: '龜山島是一座火山島，從宜蘭看過去，像一隻浮在海上的大烏龜。附近海域常有海豚和鯨魚。',
  },
  {
    id: 'liuqiu', name: '小琉球', icon: '🐠', at: igeo(120.37, 22.34), port: igeo(120.43, 22.45), portName: '東港',
    ask: { q: '小琉球在臺灣本島的哪一邊、哪片海上？', options: ['東邊的太平洋', '西南邊的臺灣海峽', '北邊的東海'], answer: 1, why: '小琉球在屏東東港的西南方，位在臺灣海峽，是臺灣附近島嶼中唯一的珊瑚礁島。' },
    event: 'snorkel', stamp: '小琉球・海龜', fact: '小琉球是珊瑚礁島，海裡有很多綠蠵龜。浮潛時不能踩珊瑚、不能摸海龜，看看拍照就好。',
  },
  {
    id: 'penghu', name: '澎湖', icon: '🧱', at: igeo(119.58, 23.57), port: igeo(120.13, 23.4), portName: '布袋港',
    ask: { q: '澎湖群島在臺灣本島的哪一邊？', options: ['西邊的臺灣海峽', '東邊的太平洋', '南邊的巴士海峽'], answer: 0, why: '澎湖在臺灣海峽中間，由九十多座小島組成。' },
    event: 'wall', stamp: '澎湖・菜宅', fact: '澎湖冬天的東北季風很強，人們用咾咕石（珊瑚礁石）堆成矮牆圍住菜園，叫做「菜宅」，擋風保護蔬菜。',
  },
  {
    id: 'lanyu', name: '蘭嶼', icon: '🛶', at: igeo(121.55, 22.04), port: igeo(121.15, 22.75), portName: '臺東富岡港',
    ask: { q: '蘭嶼在臺灣本島的哪一邊？', options: ['西邊的臺灣海峽', '北邊的東海', '東南邊的太平洋'], answer: 2, why: '蘭嶼在臺東的東南方，位在太平洋上，是達悟族的家。' },
    event: 'canoe', stamp: '蘭嶼・拼板舟', fact: '達悟族的拼板舟用很多塊木板拼成，船上畫著紅、白、黑三色的「船眼」圖紋。新船下水時，全村會一起參加下水祭。',
  },
  {
    id: 'ludao', name: '綠島', icon: '♨️', at: igeo(121.49, 22.66), port: igeo(121.15, 22.75), portName: '臺東富岡港',
    ask: { q: '綠島在臺灣本島的哪一邊？', options: ['東邊，臺東外海的太平洋上', '西邊的臺灣海峽', '北邊的東海'], answer: 0, why: '綠島在臺東外海，位在太平洋上。' },
    event: 'spring', stamp: '綠島・海底溫泉', fact: '綠島是火山島，地底下還有熱。朝日溫泉是世界上很少見的「海水溫泉」，泡在海邊看日出。',
  },
  {
    id: 'kinmen', name: '金門', icon: '🦁', at: igeo(118.35, 24.44), port: igeo(120.6, 24.25), portName: '臺中機場',
    ask: { q: '金門離哪裡比較近？', options: ['臺灣本島', '中國大陸', '日本'], answer: 1, why: '金門緊靠著中國大陸的廈門，離臺灣本島反而很遠，要坐飛機或坐很久的船。' },
    event: 'near', stamp: '金門・風獅爺', fact: '金門冬天風沙很大，以前的人在村口立「風獅爺」，希望能擋住強風。',
  },
  {
    id: 'matsu', name: '馬祖', icon: '💙', at: igeo(119.95, 26.16), port: igeo(121.7, 25.15), portName: '基隆港',
    ask: { q: '馬祖在臺灣本島的哪一邊？', options: ['南邊', '西北邊，靠近中國大陸', '東邊的太平洋'], answer: 1, why: '馬祖在臺灣的西北方，靠近中國大陸的福州，從基隆坐船要一個晚上。' },
    event: 'near', stamp: '馬祖・藍眼淚', fact: '馬祖春天到夏天的夜晚，海邊會出現發藍光的「藍眼淚」，是會發光的小小浮游生物。',
  },
];
export const isleById = (id: string) => ISLES.find((i) => i.id === id)!;

export const ISLE_LINES = [
  '臺灣不只一座島！本島四周還有好多小島，每一座都有自己的故事。',
  '點地圖上的小島，先想想它在臺灣的哪個方向、哪片海上，再搭船出發。',
  '每登上一座島，就在郵戳冊上蓋一個章。全部蓋滿，你就是離島達人！',
];
