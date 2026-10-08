-- =============================================================================
-- 穿越吧！島嶼開拓者 × 時空冒險樂園：雲端存檔、全班摘要、老師細節頁
--
-- 帳號、班級、老師都在樂園（cphskid.github.io），這份只「加表、加函式」，
-- 不改樂園和守護異世界的任何東西。本遊戲的表都用 island_ 前綴。
--
-- 怎麼套：Supabase 後台 → SQL Editor → 整份貼上 → Run。可以重複執行。
-- 順序：守護異世界 schema.sql → 樂園 park_accounts.sql → 樂園 park_teacher.sql → 這份。
-- 重跑 schema.sql 之後（它會收回權限），樂園那兩份和這份都要再跑一次。
-- 沒套這份：遊戲照玩，進度只存在這台平板；樂園的全班總覽這一欄顯示「摘要函式還沒裝到資料庫」。
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. 存檔：每個學生每一章一筆（第五章 'ch5'），大地圖與圖鑑是 'world'
--    data 就是遊戲本機存的那包 JSON，雲端只是幫他換平板也接得回來。
--    stars、done、step 另外拉成欄位，給老師頁排序和摘要用。
-- -----------------------------------------------------------------------------
create table if not exists public.island_saves (
  student_id uuid not null references public.students(id) on delete cascade,
  slot       text not null check (slot in ('world', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'end', 'village', 'medals', 'town', 'sky', 'isles')),
  data       jsonb not null default '{}'::jsonb check (pg_column_size(data) < 32768),
  step       smallint not null default 0,
  stars      smallint not null default 0 check (stars between 0 and 3),
  done       boolean not null default false,
  done_at    timestamptz,
  updated_at timestamptz not null default now(),
  primary key (student_id, slot)
);

-- 現在篇的漁村（'village'）、規則小鎮（'town'）、天空港（'sky'）、離島巡航（'isles'）、成就勳章的紀錄（'medals'，src/core/medals.ts）是後來加的格子：舊表的檢查條件換成新的
alter table public.island_saves drop constraint if exists island_saves_slot_check;
alter table public.island_saves add constraint island_saves_slot_check
  check (slot in ('world', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'end', 'village', 'medals', 'town', 'sky', 'isles'));

-- 這章完整玩完過幾次（時光幣的重玩遞減用）。舊存檔過關的當作玩完一次。
alter table public.island_saves add column if not exists clears smallint not null default 0;
update public.island_saves set clears = 1 where done and clears = 0;

alter table public.island_saves enable row level security;
revoke all on public.island_saves from anon, authenticated;
grant select on public.island_saves to authenticated;
-- 看得到誰的存檔：自己，或是我任何一班的學生（樂園的 park_teaches_student 不開給一般人直接叫，包一層）
create or replace function public.island_can_see(p_student uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select p_student = public.current_student_id() or public.park_teaches_student(p_student);
$$;
revoke all on function public.island_can_see(uuid) from public, anon, authenticated;
grant execute on function public.island_can_see(uuid) to authenticated;
drop policy if exists island_saves_read on public.island_saves;
create policy island_saves_read on public.island_saves for select to authenticated
  using (public.island_can_see(student_id));

-- 讀自己的全部存檔：{ "world": {...}, "ch5": {...} }。不是學生（老師試玩、沒登入）回 null。
create or replace function public.island_load()
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select case when public.current_student_id() is null then null
              else coalesce((select jsonb_object_agg(s.slot, s.data || jsonb_build_object('_at', s.updated_at))
                               from public.island_saves s
                              where s.student_id = public.current_student_id()), '{}'::jsonb)
         end;
$$;
revoke all on function public.island_load() from public, anon, authenticated;
grant execute on function public.island_load() to authenticated;

-- 存一格。星星只會變多、過關不會被取消（小朋友按「從頭再玩」不會把老師看到的成績洗掉）。
-- 不是學生就什麼都不做，回 false。
create or replace function public.island_save(p_slot text, p_data jsonb)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_me uuid := public.current_student_id();
  v_step smallint;
  v_stars smallint;
  v_done boolean;
begin
  if v_me is null then return false; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then raise exception '存檔格式不對'; end if;
  if pg_column_size(p_data) >= 32768 then raise exception '存檔太大了'; end if;
  v_step  := least(greatest(coalesce((p_data ->> 'reached')::numeric, 0), 0), 99)::smallint;
  v_stars := least(greatest(coalesce((p_data ->> 'stars')::numeric, 0), 0), 3)::smallint;
  v_done  := coalesce((p_data ->> 'done')::boolean, false);
  insert into public.island_saves as s (student_id, slot, data, step, stars, done, done_at, updated_at, clears)
  values (v_me, p_slot, p_data - '_at', v_step, v_stars, v_done, case when v_done then now() end, now(),
          case when v_done then 1 else 0 end)
  on conflict (student_id, slot) do update
    set -- 從「沒過關」變成「過關」＝又玩完一次（「從頭再玩」會把存檔的 done 變回 false）
        clears     = s.clears + case when excluded.done and not coalesce((s.data ->> 'done')::boolean, false)
                                     then 1 else 0 end,
        data       = excluded.data,
        step       = greatest(s.step, excluded.step),
        stars      = greatest(s.stars, excluded.stars),
        done       = s.done or excluded.done,
        done_at    = coalesce(s.done_at, excluded.done_at),
        updated_at = now();
  return true;
exception when invalid_text_representation then
  raise exception '存檔格式不對';
end;
$$;
revoke all on function public.island_save(text, jsonb) from public, anon, authenticated;
grant execute on function public.island_save(text, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- 2. 樂園「全班總覽」那一欄（欄位跟 guardian_class_summary 一樣固定）
--    進度：第五章 6 步，過關＝100。之後章節多了改成「過了幾章」。
-- -----------------------------------------------------------------------------
create or replace function public.island_class_summary(p_code text)
returns table (student_id uuid, progress int, last_played timestamptz,
               status text, attention boolean, reason text)
language sql stable security definer set search_path = public, pg_temp as $$
  with target as (select upper(btrim(coalesce(p_code, ''))) as code),
  kids as (
    select m.student_id as id
      from public.park_class_members m join target t on t.code = m.class_code
     where public.is_teacher_of(t.code)
  ),
  ch as (
    select k.id, s.step, s.stars, s.done, s.updated_at as at
      from kids k left join public.island_saves s on s.student_id = k.id and s.slot = 'ch5'
  ),
  last_at as (
    select k.id, max(s.updated_at) as at
      from kids k left join public.island_saves s on s.student_id = k.id group by k.id
  )
  select c.id,
         case when c.done then 100 else least(99, round(100.0 * coalesce(c.step, 0) / 6))::int end,
         l.at,
         case
           when c.step is null then '還沒開始'
           when c.done then '第五章八堡圳完成 ' || repeat('★', c.stars) || repeat('☆', 3 - c.stars)
           else '第五章八堡圳：玩到「' || (array['開場', '認識地形', '做竹蛇籠', '導水', '分水', '豐收'])[least(c.step, 5) + 1] || '」'
         end,
         (l.at is null or l.at < now() - interval '7 days' or (c.step is not null and not c.done and c.at < now() - interval '3 days')),
         case
           when l.at is null then '還沒玩過'
           when l.at < now() - interval '7 days' then extract(day from now() - l.at)::int || ' 天沒玩了'
           when c.step is not null and not c.done and c.at < now() - interval '3 days' then '第五章停在同一步好幾天了'
           else null
         end
    from ch c join last_at l on l.id = c.id;
$$;
revoke all on function public.island_class_summary(text) from public, anon, authenticated;
grant execute on function public.island_class_summary(text) to authenticated;

-- -----------------------------------------------------------------------------
-- 3. 老師細節頁（遊戲自己的 teacher.html）：每個學生第五章的詳細情形
--    反思題答了哪個、竹蛇籠被沖壞幾個、圖鑑拿了幾張……老師上課討論用。
-- -----------------------------------------------------------------------------
create or replace function public.island_class_detail(p_code text)
returns table (student_id uuid, nickname text, step smallint, stars smallint, done boolean,
               done_at timestamptz, updated_at timestamptz, broken int, answers jsonb, cards int)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_code text := upper(btrim(coalesce(p_code, '')));
begin
  if not public.is_teacher_of(v_code) then raise exception '這不是你的班'; end if;
  return query
    select st.id, st.nickname, s.step, s.stars, s.done, s.done_at, s.updated_at,
           coalesce((s.data ->> 'broken')::int, 0),
           coalesce(s.data -> 'answers', '[]'::jsonb),
           coalesce(jsonb_array_length(w.data -> 'cards'), jsonb_array_length(s.data -> 'cards'), 0)
      from public.park_class_members m
      join public.students st on st.id = m.student_id
      left join public.island_saves s on s.student_id = st.id and s.slot = 'ch5'
      left join public.island_saves w on w.student_id = st.id and w.slot = 'world'
     where m.class_code = v_code
     order by st.nickname, st.login_id;
end;
$$;
revoke all on function public.island_class_detail(text) from public, anon, authenticated;
grant execute on function public.island_class_detail(text) to authenticated;

-- -----------------------------------------------------------------------------
-- 3b. 樂園護照：這個學生「該拿到哪些章」（樂園 P4 的 park_passport.sql 會來叫）
--     一章過關＝那一章的章（ch5…；終章是 end），其他勳章見底下。樂園打開時自己補蓋，
--     遊戲裡叫 park_award_stamp 也要對得上這裡才蓋得下去。只給樂園的函式叫，不開給學生。
-- -----------------------------------------------------------------------------
-- 2026-10-08 成就勳章：每章 5 格（通關、收集、精通、劇情、彩蛋），序章 2 格，過去篇全破 1 枚；現在篇先佔位（即將開放）。
-- 通關章 ch1…end 的定義在樂園的 park_passport.sql，這裡補上分類；其他勳章在這裡登記。
-- 新章第一次寫入時，現在篇的（v-…）是「即將開放」，其他直接開放；重跑只更新名稱、提示與分類，不動 active。
insert into public.park_stamps as s (facility, code, name, hint, art, sort, active, kind, rarity, era, grp) values
  ('island_pioneer', 'pro', '認識臺灣', '玩完序章', 'img/stamp/island-pro.webp', 1, true, 'clear', 'bronze', 'past', 'pro'),
  ('island_pioneer', 'pro-egg', '海邊的碎片', '認識臺灣的地形時，往右上角的天空看看，有東西一閃一閃。', 'img/stamp/time-shard.webp', 5, true, 'egg', 'rainbow', 'past', 'pro'),
  ('island_pioneer', 'ch1-card', '火光圖鑑全收集', '這章的時光圖鑑 12 張全部拿到', 'img/stamp/island-ch1.webp', 12, true, 'collect', 'silver', 'past', 'ch1'),
  ('island_pioneer', 'ch1-star', '火光精通', '這章拿到三顆星', 'img/stamp/island-ch1.webp', 13, true, 'master', 'gold', 'past', 'ch1'),
  ('island_pioneer', 'ch1-end', '火光的另一個結局', '做不一樣的選擇，看過兩種結局', 'img/stamp/island-ch1.webp', 14, true, 'story', 'silver', 'past', 'ch1'),
  ('island_pioneer', 'ch1-egg', '考古坑裡的怪東西', '考古的時候，坑邊有一樣不屬於那個時代的東西。', 'img/stamp/time-shard.webp', 15, true, 'egg', 'rainbow', 'past', 'ch1'),
  ('island_pioneer', 'ch2-card', '山林圖鑑全收集', '這章的時光圖鑑 12 張全部拿到', 'img/stamp/island-ch2.webp', 22, true, 'collect', 'silver', 'past', 'ch2'),
  ('island_pioneer', 'ch2-star', '山林精通', '這章拿到三顆星，再過「狩獵」的⭐⭐⭐再挑戰', 'img/stamp/island-ch2.webp', 23, true, 'master', 'gold', 'past', 'ch2'),
  ('island_pioneer', 'ch2-end', '山林的另一個結局', '做不一樣的選擇，看過兩種結局', 'img/stamp/island-ch2.webp', 24, true, 'story', 'silver', 'past', 'ch2'),
  ('island_pioneer', 'ch2-egg', '樹梢上的閃光', '認識山林時，往高處看，樹梢上有光。', 'img/stamp/time-shard.webp', 25, true, 'egg', 'rainbow', 'past', 'ch2'),
  ('island_pioneer', 'ch3-card', '大航海圖鑑全收集', '這章的時光圖鑑 12 張全部拿到', 'img/stamp/island-ch3.webp', 32, true, 'collect', 'silver', 'past', 'ch3'),
  ('island_pioneer', 'ch3-star', '大航海精通', '這章拿到三顆星，再過「鹿皮」的⭐⭐⭐再挑戰', 'img/stamp/island-ch3.webp', 33, true, 'master', 'gold', 'past', 'ch3'),
  ('island_pioneer', 'ch3-end', '大航海的另一個結局', '做不一樣的選擇，看過兩種結局', 'img/stamp/island-ch3.webp', 34, true, 'story', 'silver', 'past', 'ch3'),
  ('island_pioneer', 'ch3-egg', '航線上的光點', '看季風和航線的時候，海的那一邊有光點。', 'img/stamp/time-shard.webp', 35, true, 'egg', 'rainbow', 'past', 'ch3'),
  ('island_pioneer', 'ch4-card', '東寧圖鑑全收集', '這章的時光圖鑑 12 張全部拿到', 'img/stamp/island-ch4.webp', 42, true, 'collect', 'silver', 'past', 'ch4'),
  ('island_pioneer', 'ch4-star', '東寧精通', '這章拿到三顆星，再過「曬鹽」的⭐⭐⭐再挑戰', 'img/stamp/island-ch4.webp', 43, true, 'master', 'gold', 'past', 'ch4'),
  ('island_pioneer', 'ch4-end', '東寧的另一個結局', '做不一樣的選擇，看過兩種結局', 'img/stamp/island-ch4.webp', 44, true, 'story', 'silver', 'past', 'ch4'),
  ('island_pioneer', 'ch4-egg', '水埤邊的倒影', '開水埤那天，田邊有東西在發亮。', 'img/stamp/time-shard.webp', 45, true, 'egg', 'rainbow', 'past', 'ch4'),
  ('island_pioneer', 'ch5-card', '八堡圳圖鑑全收集', '這章的時光圖鑑 12 張全部拿到', 'img/stamp/island-ch5.webp', 52, true, 'collect', 'silver', 'past', 'ch5'),
  ('island_pioneer', 'ch5-star', '八堡圳精通', '這章拿到三顆星', 'img/stamp/island-ch5.webp', 53, true, 'master', 'gold', 'past', 'ch5'),
  ('island_pioneer', 'ch5-end', '神秘旅人的紙條', '找到神秘旅人留下的紙條', 'img/stamp/island-ch5.webp', 54, true, 'story', 'silver', 'past', 'ch5'),
  ('island_pioneer', 'ch5-egg', '河邊的怪石頭', '認識地形的時候，雲霧外面的天空有一塊會發光的石頭。', 'img/stamp/time-shard.webp', 55, true, 'egg', 'rainbow', 'past', 'ch5'),
  ('island_pioneer', 'ch6-card', '開港圖鑑全收集', '這章的時光圖鑑 12 張全部拿到', 'img/stamp/island-ch6.webp', 62, true, 'collect', 'silver', 'past', 'ch6'),
  ('island_pioneer', 'ch6-star', '開港精通', '這章拿到三顆星，再過「烘茶」的⭐⭐⭐再挑戰', 'img/stamp/island-ch6.webp', 63, true, 'master', 'gold', 'past', 'ch6'),
  ('island_pioneer', 'ch6-end', '開港的另一個結局', '做不一樣的選擇，看過兩種結局', 'img/stamp/island-ch6.webp', 64, true, 'story', 'silver', 'past', 'ch6'),
  ('island_pioneer', 'ch6-egg', '碼頭邊的光', '港口開了，碼頭旁邊有東西在閃。', 'img/stamp/time-shard.webp', 65, true, 'egg', 'rainbow', 'past', 'ch6'),
  ('island_pioneer', 'ch7-card', '縱貫圖鑑全收集', '這章的時光圖鑑 12 張全部拿到', 'img/stamp/island-ch7.webp', 72, true, 'collect', 'silver', 'past', 'ch7'),
  ('island_pioneer', 'ch7-star', '縱貫精通', '這章拿到三顆星', 'img/stamp/island-ch7.webp', 73, true, 'master', 'gold', 'past', 'ch7'),
  ('island_pioneer', 'ch7-end', '縱貫的另一個結局', '做不一樣的選擇，看過兩種結局', 'img/stamp/island-ch7.webp', 74, true, 'story', 'silver', 'past', 'ch7'),
  ('island_pioneer', 'ch7-egg', '湖心的光', '日月潭發電那天，湖邊有一點光。', 'img/stamp/time-shard.webp', 75, true, 'egg', 'rainbow', 'past', 'ch7'),
  ('island_pioneer', 'end-card', '今天的島嶼圖鑑全收集', '這章的時光圖鑑 12 張全部拿到', 'img/stamp/island-end.webp', 82, true, 'collect', 'silver', 'past', 'end'),
  ('island_pioneer', 'end-star', '今天的島嶼精通', '這章拿到三顆星', 'img/stamp/island-end.webp', 83, true, 'master', 'gold', 'past', 'end'),
  ('island_pioneer', 'end-end', '今天的島嶼的另一個結局', '做不一樣的選擇，看過兩種結局', 'img/stamp/island-end.webp', 84, true, 'story', 'silver', 'past', 'end'),
  ('island_pioneer', 'end-egg', '沒有說明牌的展品', '博物館裡，有一件展品沒有說明牌。', 'img/stamp/time-shard.webp', 85, true, 'egg', 'rainbow', 'past', 'end'),
  ('island_pioneer', 'past', '時光守護者', '過去篇七章和終章全部過關', 'img/stamp/island-past.webp', 100, true, 'era', 'rainbow', 'past', null),
  ('island_pioneer', 'v-village', '漁村開張', '現在篇：把漁村經營起來', 'img/stamp/island-village.webp', 201, false, 'clear', 'bronze', 'now', 'v-village'),
  ('island_pioneer', 'v-village-egg', '漁村的時光碎片', '現在篇的漁村藏著一塊時光碎片', 'img/stamp/time-shard.webp', 205, false, 'egg', 'rainbow', 'now', 'v-village')
on conflict (facility, code) do update
  set name = excluded.name, hint = excluded.hint, art = excluded.art, sort = excluded.sort,
      kind = excluded.kind, rarity = excluded.rarity, era = excluded.era, grp = excluded.grp;
update public.park_stamps set kind = 'clear', rarity = 'bronze', era = 'past', grp = code,
       sort = case code when 'end' then 81 else substr(code, 3)::int * 10 + 1 end
 where facility = 'island_pioneer' and code in ('ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'end');

create or replace function public.island_earned_stamps(p_student uuid)
returns setof text language sql stable security definer set search_path = public, pg_temp as $$
  with s as (select slot, data, stars, done from public.island_saves where student_id = p_student),
  m as (select coalesce((select data from s where slot = 'medals'), '{}'::jsonb) as d),
  -- 每章：圖鑑幾張、精通要過的⭐⭐⭐再挑戰（src/core/medals.ts 的 CHALLENGES 要一樣）、有沒有選擇分支
  ch(slot, cards, chal, branch) as (values
    ('ch1', 12, '{}'::text[], true), ('ch2', 12, '{ch2:hunt}', true), ('ch3', 12, '{ch3:deer}', true),
    ('ch4', 12, '{ch4:salt}', true), ('ch5', 12, '{}', false), ('ch6', 12, '{ch6:tea}', true),
    ('ch7', 12, '{}', true), ('end', 12, '{}', true)),
  st as (
    select ch.slot, ch.cards, ch.chal, ch.branch, s.data, coalesce(s.stars, 0) as stars, coalesce(s.done, false) as done
      from ch left join s on s.slot = ch.slot
  ),
  lists as (
    select array(select jsonb_array_elements_text(case when jsonb_typeof(m.d -> 'endings') = 'array' then m.d -> 'endings' else '[]' end)) as endings,
           array(select jsonb_array_elements_text(case when jsonb_typeof(m.d -> 'chal') = 'array' then m.d -> 'chal' else '[]' end)) as chal,
           array(select jsonb_array_elements_text(case when jsonb_typeof(m.d -> 'eggs') = 'array' then m.d -> 'eggs' else '[]' end)) as eggs
      from m
  )
  -- 通關
  select slot from st where done
  -- 收集：這章的圖鑑全拿到
  union all select slot || '-card' from st
   where jsonb_typeof(data -> 'cards') = 'array' and jsonb_array_length(data -> 'cards') >= cards
  -- 精通：三顆星，而且這章的⭐⭐⭐再挑戰都過了
  union all select st.slot || '-star' from st, lists where st.done and st.stars >= 3 and st.chal <@ lists.chal
  -- 劇情：看過兩種結局（第五章沒有分支：找到神秘旅人的紙條）
  union all select st.slot || '-end' from st, lists
   where (st.branch and (select count(distinct e) from unnest(lists.endings) e where e like st.slot || ':%') >= 2)
      or (not st.branch and coalesce((st.data ->> 'note')::boolean, false))
  -- 彩蛋：找到那一章的時光碎片
  union all select e || '-egg' from lists, unnest(lists.eggs) e where e in ('pro', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'end')
  -- 序章：真的玩到最後（跳過序章不算）
  union all select 'pro' from lists where 'pro:done1' = any(lists.endings)
  -- 過去篇全破
  union all select 'past' from st having count(*) filter (where done) = 8;
$$;
revoke all on function public.island_earned_stamps(uuid) from public, anon, authenticated;

-- 島嶼章當初只開了第五章（ch5），其他章過關蓋不下去；七章加終章都做好了，全部打開。
-- 打開後學生下次進樂園，park_my_profile 會照 island_earned_stamps 自動補蓋已過關的章。
update public.park_stamps set active = true
 where facility = 'island_pioneer' and code in ('ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'end') and not active;

-- -----------------------------------------------------------------------------
-- 3c. 樂園時光幣：這個學生在這裡「該拿到哪些時光幣」（樂園的 park_coins.sql 會來叫）
--     金額看樂園的費率表 park_coin_rates（輕 5、中 10、重 20、整章 30、每顆星 10、新結局 30、再挑戰 10），
--     每一步是輕、中還是重看下面這張表；上線後用全體通關時間的中位數校正，改表就好。
--     重玩整章遞減：二刷給「整章獎勵」（各步加整章通關，不含星星）的一半、三刷四分之一、四刷起不給。
--     沒套樂園的 park_coins.sql 也沒關係：這支只是先放著，沒有人叫。
-- -----------------------------------------------------------------------------
create table if not exists public.island_step_tiers (
  slot text not null,
  step smallint not null,
  name text not null,
  tier text not null check (tier in ('light', 'medium', 'heavy')),
  primary key (slot, step)
);
alter table public.island_step_tiers enable row level security;
revoke all on public.island_step_tiers from anon, authenticated;
grant select on public.island_step_tiers to anon, authenticated;
drop policy if exists island_step_tiers_read on public.island_step_tiers;
create policy island_step_tiers_read on public.island_step_tiers for select to anon, authenticated using (true);

-- 每章 7 步：開場、5 關、結尾。開場和結尾是輕，倒數第二步是每章的大難題（重），撥雲找地點的探索是輕，其他是中。
-- 只在第一次寫入；之後校正過的不會被蓋回去（名字會更新）。
insert into public.island_step_tiers as t (slot, step, name, tier) values
  ('ch1', 0, '開場', 'light'), ('ch1', 1, '打製石器', 'medium'), ('ch1', 2, '做陶器', 'medium'), ('ch1', 3, '磨石器', 'medium'),
  ('ch1', 4, '煉鐵', 'medium'), ('ch1', 5, '考古', 'heavy'), ('ch1', 6, '結尾', 'light'),
  ('ch2', 0, '開場', 'light'), ('ch2', 1, '認識山林', 'light'), ('ch2', 2, '輪耕', 'medium'), ('ch2', 3, '狩獵', 'medium'),
  ('ch2', 4, '歲時祭儀', 'medium'), ('ch2', 5, '部落的規矩', 'heavy'), ('ch2', 6, '結尾', 'light'),
  ('ch3', 0, '開場', 'light'), ('ch3', 1, '航線', 'medium'), ('ch3', 2, '貿易', 'medium'), ('ch3', 3, '鹿皮', 'medium'),
  ('ch3', 4, '契約', 'medium'), ('ch3', 5, '北邊的城堡', 'heavy'), ('ch3', 6, '結尾', 'light'),
  ('ch4', 0, '開場', 'light'), ('ch4', 1, '營盤', 'medium'), ('ch4', 2, '水埤', 'medium'), ('ch4', 3, '曬鹽', 'medium'),
  ('ch4', 4, '孔廟與學堂', 'medium'), ('ch4', 5, '東寧的明天', 'heavy'), ('ch4', 6, '結尾', 'light'),
  ('ch5', 0, '開場', 'light'), ('ch5', 1, '認識地形', 'light'), ('ch5', 2, '做竹蛇籠', 'medium'), ('ch5', 3, '導水', 'medium'),
  ('ch5', 4, '分水', 'medium'), ('ch5', 5, '洪水', 'heavy'), ('ch5', 6, '豐收', 'light'),
  ('ch6', 0, '開場', 'light'), ('ch6', 1, '開港', 'medium'), ('ch6', 2, '烘茶', 'medium'), ('ch6', 3, '鐵路', 'medium'),
  ('ch6', 4, '醫館', 'medium'), ('ch6', 5, '火車', 'heavy'), ('ch6', 6, '結尾', 'light'),
  ('ch7', 0, '開場', 'light'), ('ch7', 1, '縱貫鐵路', 'medium'), ('ch7', 2, '水庫', 'medium'), ('ch7', 3, '輪作', 'medium'),
  ('ch7', 4, '日月潭', 'medium'), ('ch7', 5, '開通那天', 'heavy'), ('ch7', 6, '結尾', 'light'),
  ('end', 0, '開場', 'light'), ('end', 1, '十大建設', 'medium'), ('end', 2, '鐵路', 'medium'), ('end', 3, '開會', 'medium'),
  ('end', 4, '博物館', 'medium'), ('end', 5, '神秘旅人', 'heavy'), ('end', 6, '結尾', 'light')
on conflict (slot, step) do update set name = excluded.name;

create or replace function public.island_coin_sources(p_student uuid)
returns table (source text, amount int, note text)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  r record;
  v_ch text;
  v_full int;
  v_world jsonb;
  v_m jsonb;
  v_ends text[];
  v_chal text[];
  k int;
  v_n int;
  v_village jsonb;
  v_town jsonb;
  v_sky jsonb;
  v_isles text[];
  v_q text[];
  v_d record;
  v_cname constant jsonb := '{"ch1":"第一章","ch2":"第二章","ch3":"第三章","ch4":"第四章","ch5":"第五章","ch6":"第六章","ch7":"第七章","end":"終章"}';
begin
  select data into v_world from public.island_saves where student_id = p_student and slot = 'world';
  select data into v_m from public.island_saves where student_id = p_student and slot = 'medals';
  v_ends := array(select jsonb_array_elements_text(case when jsonb_typeof(v_m -> 'endings') = 'array' then v_m -> 'endings' else '[]' end));
  v_chal := array(select jsonb_array_elements_text(case when jsonb_typeof(v_m -> 'chal') = 'array' then v_m -> 'chal' else '[]' end));

  -- 序章
  if coalesce((v_world ->> 'prologue')::boolean, false) then
    source := 'island:pro:clear'; amount := public.park_coin_rate('chapter'); note := '玩完序章'; return next;
  end if;

  for r in select s.slot, s.step, s.stars, s.done, s.clears from public.island_saves s
            where s.student_id = p_student and s.slot in ('ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'end') loop
    v_ch := v_cname ->> r.slot;
    -- 每一步第一次過（reached＝最遠走到第幾步，前面的都過了；過關＝最後一步也過了）
    for source, amount, note in
      select 'island:' || r.slot || ':s' || t.step, public.park_coin_rate(t.tier), v_ch || '「' || t.name || '」'
        from public.island_step_tiers t
       where t.slot = r.slot and (t.step < r.step or r.done)
    loop return next; end loop;
    if r.done then
      source := 'island:' || r.slot || ':clear'; amount := public.park_coin_rate('chapter'); note := v_ch || '通關'; return next;
    end if;
    for k in 1 .. least(r.stars, 3) loop
      source := 'island:' || r.slot || ':star' || k; amount := public.park_coin_rate('star'); note := v_ch || '第 ' || k || ' 顆星'; return next;
    end loop;
    -- 重玩：整章獎勵的一半、四分之一
    if r.clears >= 2 then
      select coalesce(sum(public.park_coin_rate(t.tier)), 0) + public.park_coin_rate('chapter') into v_full
        from public.island_step_tiers t where t.slot = r.slot;
      for k in 2 .. least(r.clears, 3) loop
        source := 'island:' || r.slot || ':run' || k;
        amount := (v_full / (case k when 2 then 2 else 4 end));
        note := v_ch || '再玩一次（第 ' || k || ' 次）'; return next;
      end loop;
    end if;
    -- 新結局：第一種結局算在通關裡，第二種起每種 30
    v_n := (select count(distinct e) from unnest(v_ends) e where e like r.slot || ':%');
    for k in 2 .. v_n loop
      source := 'island:' || r.slot || ':end' || k; amount := public.park_coin_rate('ending'); note := v_ch || '看到新的結局'; return next;
    end loop;
  end loop;

  -- ⭐⭐⭐再挑戰第一次過
  for source, amount, note in
    select 'island:chal:' || c, public.park_coin_rate('challenge'), '⭐⭐⭐再挑戰過關' from unnest(v_chal) c
     where c ~ '^[a-z0-9]+:[a-z0-9-]+$'
  loop return next; end loop;

  -- 現在篇：漁村任務（任務代號要跟 src/data/village.ts 的 QUESTS 一樣；不在清單上的不算）
  select data into v_village from public.island_saves where student_id = p_student and slot = 'village';
  v_q := array(select jsonb_array_elements_text(case when jsonb_typeof(v_village -> 'quests') = 'array' then v_village -> 'quests' else '[]' end));
  for source, amount, note in
    select 'island:village:' || q.id, public.park_coin_rate(q.tier), '漁村任務完成'
      from (values ('house', 'light'), ('pier', 'light'), ('market', 'light'), ('star2', 'medium'), ('seine', 'medium'),
                   ('typhoon', 'medium'), ('star3', 'medium'), ('festival', 'medium'), ('star4', 'heavy'), ('star5', 'chapter')) q(id, tier)
     where q.id = any(v_q)
  loop return next; end loop;

  -- 現在篇：規則小鎮（案子代號要跟 src/data/town.ts 一樣）。破一案 10、一次判對再 10、一區解完 3 案 30
  select data into v_town from public.island_saves where student_id = p_student and slot = 'town';
  for v_d in
    select d.id, d.cases, (select count(*) from unnest(d.cases) c where v_town -> 'solved' ->> c in ('1', '2')) n
      from (values ('street', array['karaoke', 'seat', 'moon', 'temple']),
                   ('kids', array['beer', 'game', 'job']),
                   ('net', array['scam', 'photo', 'report'])) d(id, cases)
  loop
    for source, amount, note in
      select 'island:town:' || c, public.park_coin_rate('medium'), '規則小鎮破案' from unnest(v_d.cases) c where v_town -> 'solved' ->> c in ('1', '2')
      union all
      select 'island:town:' || c || ':star', public.park_coin_rate('star'), '規則小鎮一次判對' from unnest(v_d.cases) c where v_town -> 'solved' ->> c = '2'
    loop return next; end loop;
    if v_d.n >= 3 then
      source := 'island:town:' || v_d.id || ':clear'; amount := public.park_coin_rate('chapter'); note := '規則小鎮一區過關'; return next;
    end if;
  end loop;

  -- 現在篇：天空港。每關過關 10、每顆星 10（關卡 1～3，星星最多 3）
  select data into v_sky from public.island_saves where student_id = p_student and slot = 'sky';
  for v_d in select l.id, floor(least(3, greatest(0, (v_sky -> 'best' ->> l.id)::numeric)))::int n
               from (values ('1'), ('2'), ('3')) l(id) where jsonb_typeof(v_sky -> 'best' -> l.id) = 'number'
  loop
    if v_d.n > 0 then
      source := 'island:sky:' || v_d.id; amount := public.park_coin_rate('medium'); note := '天空港過關'; return next;
      for k in 1 .. v_d.n loop
        source := 'island:sky:' || v_d.id || ':star' || k; amount := public.park_coin_rate('star'); note := '天空港第 ' || k || ' 顆星'; return next;
      end loop;
    end if;
  end loop;

  -- 現在篇：離島巡航。每蓋一個郵戳 10，七座都蓋滿再 30（島的代號要跟 src/data/isles.ts 一樣）
  select array(select jsonb_array_elements_text(case when jsonb_typeof(data -> 'stamps') = 'array' then data -> 'stamps' else '[]' end))
    into v_isles from public.island_saves where student_id = p_student and slot = 'isles';
  v_isles := array(select i from unnest(coalesce(v_isles, '{}')) i
                    where i = any(array['guishan', 'liuqiu', 'penghu', 'lanyu', 'ludao', 'kinmen', 'matsu']) group by i);
  for source, amount, note in select 'island:isles:' || i, public.park_coin_rate('medium'), '離島郵戳' from unnest(v_isles) i loop return next; end loop;
  if cardinality(v_isles) >= 7 then
    source := 'island:isles:all'; amount := public.park_coin_rate('chapter'); note := '離島郵戳蓋滿'; return next;
  end if;
end;
$$;
revoke all on function public.island_coin_sources(uuid) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. 在樂園登記這個設施的網址與摘要函式（只補空的欄位，不動管理員改過的狀態）
--    狀態（施工中／試營運／開放）請管理員在樂園後台的「設施」改。
-- -----------------------------------------------------------------------------
update public.park_facilities
   set url            = coalesce(url, '/Taiwan-island/'),
       url_dev        = coalesce(url_dev, '/Taiwan-island/dev/'),
       detail_url     = coalesce(detail_url, '/Taiwan-island/teacher.html'),
       detail_url_dev = coalesce(detail_url_dev, '/Taiwan-island/dev/teacher.html'),
       summary_fn     = coalesce(summary_fn, 'island_class_summary'),
       updated_at     = now()
 where code = 'island_pioneer';

-- 樂園套了 park_coins.sql（有 coins_fn 這一欄）才登記時光幣
do $$ begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'park_facilities' and column_name = 'coins_fn') then
    update public.park_facilities set coins_fn = 'island_coin_sources' where code = 'island_pioneer' and coins_fn is null;
  end if;
end $$;
