// 老師細節頁、家長報告要畫哪些章、哪些地方：一章一筆。
//
// 新章節或新地點上線時，在這裡加一筆就會出現在細節頁（全班進度、每章反思題、個人報告），
// 頁面本身不用改。章節的「想一想」題目、每一步的名字都直接拿各章自己的資料，不重抄一份。
// 雲端存檔要有 reached／stars／done／answers／mistakes 這幾個欄位（supabase/island_pioneer.sql 的 island_class_progress 會讀）。

import { CHAPTERS, type ChapterId } from './world';
import { STEPS } from '../core/save';
import { QUESTIONS } from './babao-chapter';
import { QUESTIONS1, STEPS1 } from './ch1';
import { QUESTIONS2, STEPS2 } from './ch2';
import { QUESTIONS3, STEPS3 } from './ch3';
import { QUESTIONS4, STEPS4 } from './ch4';
import { QUESTIONS6, STEPS6 } from './ch6';
import { QUESTIONS7, STEPS7 } from './ch7';
import { QUESTIONS_END, STEPS_END } from './chEnd';
import { CASES } from './town';
import { LEVELS } from './sky';
import { ISLES } from './isles';
import { SPOTS } from './postcard';

export interface ReportQuestion { q: string; options: string[]; answer: number; why: string }

export interface ChapterReport {
  slot: ChapterId;
  title: string;                 // 第三章 大航海時代
  steps: readonly string[];      // 7 步：開場…結算（reached 6＝走完）
  questions: readonly ReportQuestion[];
  mistakes: string;              // 失誤次數是哪些事加起來（給家長看的白話）
  cards: number;                 // 這章圖鑑幾張
  goals?: string[];              // 這章在教什麼（有寫才顯示；沒寫就用每一步的名字）
}

const chapter = (slot: ChapterId, steps: readonly string[], questions: readonly ReportQuestion[], mistakes: string): ChapterReport => {
  const c = CHAPTERS.find((x) => x.id === slot)!;
  return { slot, title: `${c.no} ${c.title}`, steps, questions, mistakes, cards: 12 };
};

// 過去篇：照時代順序
export const PAST_REPORTS: ChapterReport[] = [
  chapter('ch1', STEPS1, QUESTIONS1, '石器敲壞、陶器燒裂、磨過頭、遇到土石流'),
  chapter('ch2', STEPS2, QUESTIONS2, '田不夠吃、鹿變少、生活曆放錯'),
  chapter('ch3', STEPS3, QUESTIONS3, '船擱淺、錢不夠、鹿變少、字讀錯、界線點錯、船排不出去'),
  chapter('ch4', STEPS4, QUESTIONS4, '營盤放錯、水埤乾掉、鹽不夠、建築放錯、糧倉空掉'),
  {
    ...chapter('ch5', STEPS, QUESTIONS, '竹蛇籠被大水沖壞（導水時正面硬擋）'),
    goals: [
      '清領時期移民開墾彰化平原，需要水利才能種稻（施世榜、林先生與八堡圳）。',
      '水往低處流：看等高線找出圳道路線，理解圳頭為什麼開在上游的二水。',
      '用竹蛇籠「導」水比正面「擋」水有效。',
      '分水協商：「平均」和「公平」不一樣；開圳前這片土地已經有巴布薩族人生活。',
    ],
  },
  chapter('ch6', STEPS6, QUESTIONS6, '船擱淺、茶發霉、鐵軌用完、看錯病人、火車相撞'),
  chapter('ch7', STEPS7, QUESTIONS7, '車廂掛錯、大壩漏水、水不夠、水管漏水、水門開錯'),
  chapter('end', STEPS_END, QUESTIONS_END, '十大建設放錯、高鐵路線不行、方案沒讓大家接受、時間軸排錯'),
];

// 現在篇：每個地方只有一個「做了多少」的數字
export interface PlaceReport {
  slot: string;                  // 雲端存檔格
  title: string;
  what: string;                  // 這裡在學什麼（白話）
  unit: (n: number) => string;   // 「破了 3／10 案」
  total: number;                 // 0＝沒有固定數量，看 done
}
export const NOW_REPORTS: PlaceReport[] = [
  { slot: 'village', title: '風與海的漁村', what: '依照風、海、地形經營漁村', unit: () => '經營中', total: 0 },
  { slot: 'town', title: '規則小鎮', what: '分辨風俗、宗教、道德、法律四種規範', unit: (n) => `破了 ${n}／${CASES.length} 案`, total: CASES.length },
  { slot: 'sky', title: '天空港', what: '看地圖安排航線，認識臺灣的鄰居、周圍的海和五大洲三大洋', unit: (n) => `過了 ${n}／${LEVELS.length} 關`, total: LEVELS.length },
  { slot: 'isles', title: '離島巡航', what: '認識龜山島、小琉球、澎湖、蘭嶼、綠島、金門、馬祖七個離島', unit: (n) => `蓋了 ${n}／${ISLES.length} 個郵戳`, total: ISLES.length },
  { slot: 'post', title: '景點明信片', what: '探究景點的特色、歷史、維護方式與問題', unit: (n) => `寄了 ${n}／${SPOTS.length} 張`, total: SPOTS.length },
];
