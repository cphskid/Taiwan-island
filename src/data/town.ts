// 現在篇「規則小鎮」：小偵探接案。每一案：聽委託 → 在街上點人問話、點東西收證物 → 判斷是誰在管（風俗、宗教、道德、法律）
// → 是法律的話再選哪一條 → 選怎麼處理 → 上小鎮報紙。
// 街景 T-01（public/img/town/t1-bg.webp）座標一律用「地圖單位」：寬 2000、高 1116，左上是 0,0。
// 人物 T-02、T-03 切成 t2-1～8、t3-1～8（原圖與腳本 /mnt/project-files/art/town/）。

export const TW = 2000;
export const TH = 1116;
export const timg = (n: string) => `${import.meta.env.BASE_URL}img/town/${n}.webp`;

export type Norm = 'custom' | 'religion' | 'moral' | 'law';
export const NORMS: Record<Norm, { name: string; icon: string; what: string; can: string }> = {
  custom: { name: '風俗', icon: '🏮', what: '大家從以前就習慣這樣做，像過年過節的傳統。', can: '不做會被說閒話，但沒有人能處罰你。' },
  religion: { name: '宗教', icon: '🙏', what: '信仰裡的規矩，信的人自己遵守。', can: '進廟、進教堂要尊重，但不會被警察抓。' },
  moral: { name: '道德', icon: '💗', what: '心裡覺得對不對、應不應該。', can: '做不到會被別人看不起，自己也會不好意思，但不會被罰。' },
  law: { name: '法律', icon: '⚖️', what: '國家定的規定，每個人都要遵守。', can: '唯一有強制力：違反了會被罰款、被處分。' },
};
export const NORM_ORDER: Norm[] = ['custom', 'religion', 'moral', 'law'];

// 街上的地方（地圖單位）。人物站在前面的人行道上
export const PLACES = {
  store: { x: 470, y: 790 }, // 便利商店門口
  apt: { x: 760, y: 640 }, // 公寓樓下
  balcony: { x: 790, y: 300 }, // 公寓陽台（有喇叭）
  bus: { x: 1010, y: 650 }, // 公車亭
  temple: { x: 1250, y: 470 }, // 廟埕
  police: { x: 1530, y: 520 }, // 派出所門口
  park: { x: 1760, y: 520 }, // 公園長椅
} as const;
export type PlaceId = keyof typeof PLACES;

export interface Clue { id: string; icon: string; text: string }
// 街上可以點的人或東西：點了說一句話，有 clue 的就放進線索板
export interface Spot { art: string; name: string; at: PlaceId; dx?: number; dy?: number; size?: number; say: string; clue?: Clue }
// 手機畫面：一則一則的訊息，可疑的地方點了變成線索
export interface PhoneMsg { from: 'them' | 'me' | 'note'; parts: (string | { text: string; clue: Clue })[] }

export interface Case {
  id: string;
  title: string;
  client: { art: string; name: string };
  ask: string; // 委託人說的話
  spots?: Spot[];
  phone?: { who: string; msgs: PhoneMsg[] };
  norm: Norm;
  normWhy: string; // 判對之後滴答說明
  hint: string; // 判錯時滴答的提示
  law?: { pick: string[]; answer: string; why: string };
  handle: { text: string; ok: boolean; then: string }[];
  news: string; // 結案上報紙的標題
}

export interface District { id: string; name: string; icon: string; blurb: string; at: PlaceId; cases: Case[] }

export const LAWS = {
  noise: '噪音管制法',
  kids: '兒童及少年福利與權益保障法',
  labor: '勞動基準法',
  copy: '著作權法',
  privacy: '民法（肖像權、隱私權）',
  fraud: '刑法（詐欺罪）',
};

export const DISTRICTS: District[] = [
  {
    id: 'street', name: '大街', icon: '🏘️', at: 'apt',
    blurb: '鄰居之間的小糾紛，到底是誰在管？',
    cases: [
      {
        id: 'karaoke', title: '半夜的歌聲',
        client: { art: 't2-2', name: '睡衣阿姨' },
        ask: '偵探！樓上的阿伯每天晚上唱卡拉OK，唱到半夜兩點，我明天還要上班，根本睡不著……',
        spots: [
          { art: 't2-1', name: '卡拉OK阿伯', at: 'apt', dx: -60, say: '唱歌是我的興趣啊！我在自己家唱，關別人什麼事？', clue: { id: 'own', icon: '🎤', text: '阿伯說：在自己家唱，別人管不著' } },
          { art: 't3-7', name: '牆上的時鐘', at: 'balcony', dx: 120, dy: 40, size: 70, say: '時鐘指著半夜兩點，陽台的喇叭還在響。', clue: { id: 'late', icon: '🕑', text: '半夜兩點還在唱' } },
          { art: 't3-6', name: '分貝計', at: 'bus', dx: -70, dy: 40, size: 70, say: '量一下……晚上的聲音超過 60 分貝了！比規定的標準還吵。', clue: { id: 'db', icon: '📟', text: '夜間聲音超過標準' } },
          { art: 't2-7', name: '警察伯伯', at: 'police', say: '晚上太吵，鄰居可以打 1999 找環保局或打 110 找警察，來量聲音，太吵是會被開罰單的。', clue: { id: 'fine', icon: '🧾', text: '夜間太吵：環保局可以開罰' } },
        ],
        norm: 'law', normWhy: '晚上製造太大的噪音，國家有法律規定，違反會被罰錢。這就是法律的強制力。',
        hint: '想一想：警察伯伯說的「開罰單」，哪一種規範才可以罰錢？',
        law: { pick: [LAWS.noise, LAWS.copy, LAWS.labor], answer: LAWS.noise, why: '管聲音太吵的是《噪音管制法》，各縣市的環保局負責檢查。' },
        handle: [
          { text: '先好好跟阿伯說；還是不改，就請環保局或警察來處理', ok: true, then: '阿伯收到勸導單，現在晚上十點以後就不唱了，改成白天去公園唱。' },
          { text: '也買一台大喇叭，晚上唱回去', ok: false, then: '兩家越唱越大聲，整棟樓都睡不著，大家都生氣了！' },
          { text: '算了，這是阿伯的興趣，法律管不到', ok: false, then: '阿姨連續一個禮拜沒睡好，上班打瞌睡……其實法律管得到喔！' },
        ],
        news: '樓上不再半夜唱歌！小偵探幫鄰居找回好眠',
      },
      {
        id: 'seat', title: '公車上的位子',
        client: { art: 't2-3', name: '阿嬤' },
        ask: '我搭公車，腳很痠，可是博愛座上的年輕人一直滑手機，都沒有人讓位子給我……',
        spots: [
          { art: 't2-4', name: '連帽少年', at: 'bus', dx: 60, say: '我又沒做錯事！法律有規定我一定要讓位嗎？', clue: { id: 'nolaw', icon: '📱', text: '少年：沒有人可以逼我讓位' } },
          { art: 't2-5', name: '上班族姊姊', at: 'store', dx: 80, say: '博愛座是「請」大家讓給需要的人。看到長輩站著，我會不好意思坐。', clue: { id: 'please', icon: '💺', text: '博愛座是「請」讓座，不是罰' } },
          { art: 't2-7', name: '警察伯伯', at: 'police', say: '不讓座不會被開罰單喔。不過看到需要的人，讓個座，大家都會很開心。', clue: { id: 'nofine', icon: '🚫', text: '不讓座不會被罰' } },
        ],
        norm: 'moral', normWhy: '讓座是因為心裡覺得「應該幫助需要的人」，這是道德。不讓座不會被罰，但大家會覺得不好。',
        hint: '警察伯伯說不讓座不會被罰，所以不是法律。那是什麼讓人「覺得應該」讓座呢？',
        handle: [
          { text: '微笑跟少年說：「阿嬤腳很痠，可以讓她坐嗎？」', ok: true, then: '少年愣了一下，馬上站起來說「阿嬤請坐」。阿嬤送他一顆糖。' },
          { text: '打電話叫警察來開罰單', ok: false, then: '警察說：「這個我們不能罰啦。」少年還被大家拍照上網，事情越鬧越大！' },
          { text: '在網路上寫文章罵他', ok: false, then: '大家在網路上吵成一團，阿嬤還是沒有位子坐……' },
        ],
        news: '公車上的溫暖：少年起身讓座，阿嬤笑開懷',
      },
      {
        id: 'moon', title: '中秋節回家嗎',
        client: { art: 't3-5', name: '阿公' },
        ask: '中秋節到了，大家都回家烤肉、吃月餅。我孫女說要加班不能回來，我好想她……',
        spots: [
          { art: 't2-5', name: '上班族孫女', at: 'store', dx: 60, say: '公司剛好那天要加班……我也很想回家，可是走不開。', clue: { id: 'busy', icon: '💼', text: '孫女要加班，不是不想回家' } },
          { art: 't2-8', name: '廟口阿姨', at: 'temple', dx: -40, say: '中秋節要團圓、賞月、吃月餅，從以前就是這樣啦！這幾年才流行烤肉。', clue: { id: 'old', icon: '🥮', text: '中秋團圓、吃月餅：從以前傳下來的習慣' } },
          { art: 't2-7', name: '警察伯伯', at: 'police', say: '中秋節沒回家？這個法律沒有規定，我們不能管喔。', clue: { id: 'free', icon: '🙅', text: '沒回家不會被處罰' } },
        ],
        norm: 'custom', normWhy: '中秋節團圓、吃月餅，是大家從以前一直傳下來的習慣，這叫風俗。做不到不會被罰，但大家都很重視。',
        hint: '廟口阿姨說「從以前就是這樣」。這種大家習慣、一年一年傳下來的事，是哪一種規範？',
        handle: [
          { text: '幫阿公和孫女約好視訊一起賞月，假日再回家', ok: true, then: '中秋節晚上，阿公對著手機和孫女一起看月亮，週末孫女帶著月餅回家了。' },
          { text: '叫阿公去檢舉孫女不孝', ok: false, then: '檢舉了也沒有用，祖孫還吵架了，阿公更難過……' },
          { text: '跟孫女說「不回家要罰錢」', ok: false, then: '孫女說：「哪有這種規定？」大家覺得小偵探亂說話。' },
        ],
        news: '視訊也能團圓！祖孫隔著手機一起賞月',
      },
      {
        id: 'temple', title: '廟裡的閃光燈',
        client: { art: 't2-8', name: '廟口阿姨' },
        ask: '有一位外國遊客，在廟裡對著神像一直開閃光燈拍照，還踩過門檻，拜拜的人都在看他……',
        spots: [
          { art: 't3-1', name: '外國遊客', at: 'temple', dx: 70, say: 'Wow，好漂亮的廟！我不知道這裡有規矩，我不是故意的。', clue: { id: 'dunno', icon: '📷', text: '遊客不知道廟裡的規矩' } },
          { art: 't2-3', name: '拜拜的阿嬤', at: 'bus', dx: 50, say: '進廟門要跨過門檻、不要踩；對著神明拍照要先問廟方，閃光燈對神明不禮貌。', clue: { id: 'rule', icon: '🛕', text: '廟裡的規矩：不踩門檻、拍照先問' } },
          { art: 't2-7', name: '警察伯伯', at: 'police', say: '這是廟裡的規矩，不是法律，我們不會抓他。好好跟他說就可以了。', clue: { id: 'notlaw', icon: '🙅', text: '不是法律，警察不會抓' } },
        ],
        norm: 'religion', normWhy: '不踩門檻、不對神明開閃光燈，是信仰裡的規矩，這叫宗教規範。信的人自己遵守，我們去參觀時也要尊重。',
        hint: '拜拜的阿嬤說的是「對神明」的規矩。這是哪一種規範？',
        handle: [
          { text: '用簡單的英文和手勢，告訴他廟裡的規矩', ok: true, then: '遊客說「Sorry！Thank you！」，關掉閃光燈，還學阿嬤雙手合十拜拜。' },
          { text: '打 110 請警察把他帶走', ok: false, then: '警察來了也只能勸，遊客嚇壞了，大家都很尷尬。' },
          { text: '大聲罵他「沒禮貌！」', ok: false, then: '遊客聽不懂，只覺得很可怕，下次再也不敢來臺灣的廟了……' },
        ],
        news: '外國遊客學會廟裡的規矩：雙手合十說謝謝',
      },
    ],
  },
  {
    id: 'kids', name: '兒少保護站', icon: '🧒', at: 'store',
    blurb: '未滿 18 歲的你，有哪些法律在保護你？',
    cases: [
      {
        id: 'beer', title: '幫爸爸買啤酒',
        client: { art: 't2-6', name: '店員哥哥' },
        ask: '有個看起來很年輕的客人，說要幫爸爸買一手啤酒。我該不該賣給他？',
        spots: [
          { art: 't2-4', name: '連帽少年', at: 'store', dx: 90, say: '我十六歲啦！是幫我爸買的，又不是我要喝。', clue: { id: 'age', icon: '🪪', text: '少年只有 16 歲' } },
          { art: 't2-5', name: '上班族姊姊', at: 'apt', dx: -40, say: '你看店門口的貼紙：「未滿 18 歲不得購買酒類」。', clue: { id: 'sign', icon: '🚫', text: '店門口：未滿 18 歲不能買酒' } },
          { art: 't2-7', name: '警察伯伯', at: 'police', say: '就算是幫大人買也不行。店家賣酒給未滿 18 歲的人，會被罰好幾萬元。', clue: { id: 'fine', icon: '🧾', text: '店家賣了會被罰款' } },
        ],
        norm: 'law', normWhy: '保護兒童和少年的法律規定：未滿 18 歲不能喝酒，也不能有人賣酒給他們。違反會被罰。',
        hint: '警察伯伯說店家會被「罰款」，哪一種規範可以罰錢？',
        law: { pick: [LAWS.kids, LAWS.noise, LAWS.copy], answer: LAWS.kids, why: '《兒童及少年福利與權益保障法》說：任何人都不能提供酒給未滿 18 歲的人。（菸更嚴格：未滿 20 歲都不行。）' },
        handle: [
          { text: '店員不賣，請少年跟爸爸說要自己來買', ok: true, then: '少年點點頭走了。店長還誇店員：「做得好，這是保護他。」' },
          { text: '他是幫爸爸買的，就賣給他吧', ok: false, then: '剛好衛生局來檢查，店家被開了罰單……' },
          { text: '要他把錢放著，偷偷把啤酒裝在袋子裡給他', ok: false, then: '偷偷賣還是違法！店員和店長都被罰了。' },
        ],
        news: '店員把關不賣酒給少年：保護大家的健康',
      },
      {
        id: 'game', title: '妹妹玩的遊戲',
        client: { art: 't3-2', name: '八歲妹妹' },
        ask: '我在玩哥哥的打殭屍遊戲，好可怕，晚上都做惡夢……可是我還想破關！',
        spots: [
          { art: 't3-8', name: '遊戲盒子', at: 'apt', dx: -80, dy: 30, size: 80, say: '遊戲盒子的角落有一個小標籤：「輔 15」。', clue: { id: 'tag', icon: '🎮', text: '遊戲標著「輔 15」' } },
          { art: 't2-5', name: '上班族姊姊', at: 'store', dx: 60, say: '遊戲分成普遍級、保護級、輔 12、輔 15、限制級。輔 15 是未滿 15 歲不適合玩的。', clue: { id: 'levels', icon: '🔞', text: '遊戲分級：輔 15 不適合未滿 15 歲' } },
          { art: 't2-7', name: '警察伯伯', at: 'police', say: '遊戲分級是法律規定的。遊戲公司要標清楚，家裡的大人也要注意孩子玩什麼喔。', clue: { id: 'parents', icon: '👨‍👩‍👧', text: '法律規定要分級，大人要注意' } },
        ],
        norm: 'law', normWhy: '遊戲、影片要分級，是國家為了保護兒少定的法律，沒標清楚會被罰。',
        hint: '警察伯伯說「遊戲分級是法律規定的」，再想一想？',
        law: { pick: [LAWS.labor, LAWS.kids, LAWS.privacy], answer: LAWS.kids, why: '《兒童及少年福利與權益保障法》要求遊戲、影片分級，保護兒少不接觸不適合的內容。' },
        handle: [
          { text: '幫妹妹換成「普遍級」的遊戲，也告訴爸媽', ok: true, then: '妹妹改玩種花蓋房子的遊戲，晚上睡得好香，還說長大要當園藝師。' },
          { text: '叫警察去抓遊戲公司', ok: false, then: '遊戲公司有好好標分級，沒有做錯事。問題是誰在玩……' },
          { text: '沒關係，把燈打開再繼續玩', ok: false, then: '妹妹還是每天做惡夢，嚇得不敢一個人睡覺……' },
        ],
        news: '玩遊戲先看分級！妹妹改玩種花遊戲',
      },
      {
        id: 'job', title: '十四歲去打工',
        client: { art: 't3-4', name: '國中生小雯' },
        ask: '我十四歲，想去手搖飲店打工存錢買腳踏車，老闆說好！可是同學說這樣不行？',
        spots: [
          { art: 't3-3', name: '飲料店老闆', at: 'store', dx: 100, say: '她很乖又很勤勞，我想讓她每天放學來幫忙到晚上。', clue: { id: 'boss', icon: '🧋', text: '老闆想僱用 14 歲的小雯' } },
          { art: 't2-5', name: '上班族姊姊', at: 'bus', dx: 40, say: '我記得法律說：未滿 15 歲原則上不能被僱用工作，要保護孩子能好好讀書、長大。', clue: { id: 'under15', icon: '🔢', text: '未滿 15 歲原則上不能被僱用' } },
          { art: 't2-7', name: '警察伯伯', at: 'police', say: '僱用童工的老闆是會被處罰的。滿 15 歲以後打工，也要有爸媽的同意書喔。', clue: { id: 'punish', icon: '🧾', text: '老闆違法僱用會被罰' } },
        ],
        norm: 'law', normWhy: '勞工的法律規定，未滿 15 歲原則上不能被僱用，老闆違反會被罰。這是保護你，不是不讓你努力。',
        hint: '警察伯伯說老闆「會被處罰」，這是哪一種規範？',
        law: { pick: [LAWS.copy, LAWS.noise, LAWS.labor], answer: LAWS.labor, why: '《勞動基準法》規定：未滿 15 歲的人原則上不能被僱用；15～16 歲的童工也有工作時間的限制。' },
        handle: [
          { text: '告訴小雯先不要去，滿 15 歲、爸媽同意後再找合法的打工', ok: true, then: '小雯先在家幫忙做家事存零用錢，老闆說：「等妳長大再來！」' },
          { text: '偷偷去打工，不要讓別人知道就好', ok: false, then: '勞工局來檢查，老闆被罰款，小雯也被嚇哭了……' },
          { text: '跟老闆說不用付錢，當作幫忙就好', ok: false, then: '天天工作到很晚，小雯累到上課睡著，功課也跟不上了。' },
        ],
        news: '法律保護童工：小雯等滿 15 歲再打工',
      },
    ],
  },
  {
    id: 'net', name: '網路分局', icon: '📱', at: 'police',
    blurb: '手機裡的陷阱：看出破綻，保護自己。',
    cases: [
      {
        id: 'scam', title: '九百九的新手機',
        client: { art: 't2-4', name: '連帽少年' },
        ask: '我在網路上看到超便宜的新手機，只要 999 元！賣家叫我先匯款，我要不要買？',
        phone: {
          who: '超優惠手機館',
          msgs: [
            { from: 'them', parts: ['哈囉！最新款手機', { text: '只要 999 元', clue: { id: 'cheap', icon: '💸', text: '價錢便宜得不合理' } }, '，原價三萬多喔！'] },
            { from: 'me', parts: ['真的嗎？可以面交嗎？'] },
            { from: 'them', parts: ['不行面交喔～', { text: '請先匯款到這個帳號', clue: { id: 'pay', icon: '🏧', text: '不見面、要你先匯款' } }, '，我們收到再寄。'] },
            { from: 'them', parts: [{ text: '只剩 10 分鐘！快一點不然就被搶光了！', clue: { id: 'rush', icon: '⏰', text: '一直催你快一點' } }] },
            { from: 'note', parts: ['這個帳號', { text: '昨天才註冊，沒有任何評價', clue: { id: 'new', icon: '❓', text: '陌生的新帳號、沒有評價' } }] },
          ],
        },
        norm: 'law', normWhy: '騙別人的錢是犯罪，法律會處罰詐騙的人。我們也要學會看出破綻、保護自己。',
        hint: '騙別人的錢，會被警察抓、被法院判刑。這是哪一種規範？',
        law: { pick: [LAWS.fraud, LAWS.labor, LAWS.kids], answer: LAWS.fraud, why: '用騙的拿走別人的錢，是《刑法》的詐欺罪，會被判刑。' },
        handle: [
          { text: '不匯款、截圖跟大人說，打 165 反詐騙專線問問', ok: true, then: '165 的叔叔說這是常見的詐騙手法，這個帳號已經被檢舉好幾次了！' },
          { text: '先匯一點點錢試試看', ok: false, then: '錢匯過去，對方就不見了，再也聯絡不上……' },
          { text: '把自己的銀行帳號密碼給對方，請他自己扣款', ok: false, then: '帳戶裡的錢全部被領光了！帳號密碼絕對不能給別人。' },
        ],
        news: '小偵探識破詐騙：太便宜、先匯款、一直催，全是陷阱',
      },
      {
        id: 'photo', title: '全班的合照',
        client: { art: 't3-4', name: '國中生小雯' },
        ask: '同學把畢業旅行的合照放上網，還寫了學校和每個人的名字。有人說不想被放上去，要怎麼辦？',
        phone: {
          who: '班級社群',
          msgs: [
            { from: 'them', parts: ['畢旅超好玩！大家看～', { text: '（全班 30 個人的大頭照）', clue: { id: 'faces', icon: '🖼️', text: '照片裡有很多人的臉' } }] },
            { from: 'them', parts: [{ text: '標註：XX 國中 3 年 2 班 王小明、林小美…', clue: { id: 'names', icon: '🏫', text: '寫出學校、班級和全名' } }] },
            { from: 'note', parts: ['這則貼文', { text: '設定成「所有人都看得到」', clue: { id: 'public', icon: '🌐', text: '陌生人也看得到' } }] },
            { from: 'them', parts: [{ text: '小美：我不想被放上去……可以拿掉嗎？', clue: { id: 'nope', icon: '🙋', text: '有同學不同意' } }] },
          ],
        },
        norm: 'law', normWhy: '每個人的臉、名字、學校，都受法律保護（肖像權、隱私權）。放上網前要先問過，別人不同意就要拿掉。',
        hint: '別人的臉和名字，國家有定規定保護。是哪一種規範？',
        law: { pick: [LAWS.noise, LAWS.privacy, LAWS.labor], answer: LAWS.privacy, why: '每個人都有「肖像權」和「隱私權」，受《民法》保護：別人的臉和個人資料，不能沒問過就公開。' },
        handle: [
          { text: '請同學先拿掉，問過大家；同意的人再放，名字學校都不要寫', ok: true, then: '同學重新貼了一張只有同意的人、沒寫名字的照片，大家都按讚。' },
          { text: '沒關係啦，大家都這樣放', ok: false, then: '照片被陌生人轉傳，有人跑到學校門口找人，好可怕……' },
          { text: '也把那位同學的照片放上網報復', ok: false, then: '兩個人越吵越兇，最後都被叫去學務處……' },
        ],
        news: '貼照片先問一聲：保護同學的隱私',
      },
      {
        id: 'report', title: '報告裡的照片',
        client: { art: 't3-2', name: '八歲妹妹' },
        ask: '我做自然報告，從網路上找了一張好漂亮的櫻花鉤吻鮭照片放進去。老師說少了什麼？',
        phone: {
          who: '網路圖片',
          msgs: [
            { from: 'note', parts: ['照片下面寫著：', { text: '攝影：林阿明　© 版權所有', clue: { id: 'author', icon: '📸', text: '照片有作者，作者有著作權' } }] },
            { from: 'me', parts: ['我把照片放進報告，', { text: '沒有寫是從哪裡來的', clue: { id: 'nosrc', icon: '❔', text: '報告沒寫出處' } }] },
            { from: 'them', parts: ['老師：', { text: '用別人的作品，要寫清楚作者和出處喔！', clue: { id: 'cite', icon: '📝', text: '引用要寫作者和出處' } }] },
          ],
        },
        norm: 'law', normWhy: '照片、文章、音樂的作者，都受法律保護。做報告可以合理引用，但一定要寫清楚是誰的、從哪裡來的。',
        hint: '老師說的「著作權」，是國家定的規定。是哪一種規範？',
        law: { pick: [LAWS.privacy, LAWS.copy, LAWS.fraud], answer: LAWS.copy, why: '《著作權法》保護作者：上課、做報告可以合理引用，但要寫明出處。' },
        handle: [
          { text: '在照片下面寫：「攝影：林阿明，出處：某某網站」', ok: true, then: '老師給了一個大大的讚：「這才是會做研究的小科學家！」' },
          { text: '把照片上的作者名字修掉就好', ok: false, then: '修掉名字更糟糕！這等於把別人的作品說成是自己的。' },
          { text: '印一百張賣給同學賺錢', ok: false, then: '這已經不是做報告了，作者可以告你侵害著作權！' },
        ],
        news: '用別人的照片記得寫出處：尊重作者的心血',
      },
    ],
  },
];

export const CASES: Case[] = DISTRICTS.flatMap((d) => d.cases);
export const caseById = (id: string) => CASES.find((c) => c.id === id);
export const districtOf = (id: string) => DISTRICTS.find((d) => d.cases.some((c) => c.id === id))!;
export const CLEAR_AT = 3; // 每區解完幾案算過關

export const TOWN_LINES = {
  intro: [
    '歡迎來到規則小鎮！我是滴答，你是小鎮新來的小偵探。',
    '鎮上每天都有小糾紛：有的是大家的習慣、有的是信仰的規矩、有的是心裡的對錯，也有國家定的法律。',
    '我們的工作是：問清楚、找證據，判斷「這件事是誰在管」，再想出最好的處理方法。',
    '點一個地方開始接案吧！',
  ],
};

// 街上平常走來走去的路人（沒有案子時）
export const IDLE_PEOPLE: { art: string; at: PlaceId; dx: number }[] = [
  { art: 't2-6', at: 'store', dx: -80 },
  { art: 't2-8', at: 'temple', dx: 40 },
  { art: 't2-7', at: 'police', dx: 0 },
  { art: 't2-3', at: 'park', dx: -40 },
];
