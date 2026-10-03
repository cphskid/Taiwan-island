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
  slot       text not null check (slot in ('world', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'end', 'village')),
  data       jsonb not null default '{}'::jsonb check (pg_column_size(data) < 32768),
  step       smallint not null default 0,
  stars      smallint not null default 0 check (stars between 0 and 3),
  done       boolean not null default false,
  done_at    timestamptz,
  updated_at timestamptz not null default now(),
  primary key (student_id, slot)
);

-- 現在篇的漁村（'village'）是後來加的格子：舊表的檢查條件換成新的
alter table public.island_saves drop constraint if exists island_saves_slot_check;
alter table public.island_saves add constraint island_saves_slot_check
  check (slot in ('world', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'end', 'village'));

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
  insert into public.island_saves as s (student_id, slot, data, step, stars, done, done_at, updated_at)
  values (v_me, p_slot, p_data - '_at', v_step, v_stars, v_done, case when v_done then now() end, now())
  on conflict (student_id, slot) do update
    set data       = excluded.data,
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
--     一章過關＝那一章的章（ch5…；終章是 end）。樂園打開時自己補蓋，
--     遊戲裡叫 park_award_stamp 也要對得上這裡才蓋得下去。只給樂園的函式叫，不開給學生。
-- -----------------------------------------------------------------------------
create or replace function public.island_earned_stamps(p_student uuid)
returns setof text language sql stable security definer set search_path = public, pg_temp as $$
  select s.slot from public.island_saves s
   where s.student_id = p_student and s.done and s.slot not in ('world', 'village');
$$;
revoke all on function public.island_earned_stamps(uuid) from public, anon, authenticated;

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
