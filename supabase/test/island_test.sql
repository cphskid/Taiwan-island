-- 島嶼開拓者雲端存檔與老師函式的權限實測。只在本機跑（tools/test/db.sh），不要貼進 Supabase。

\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
reset role;

create or replace function test_ok(p_cond boolean, p_what text) returns void
language plpgsql as $$
begin
  if coalesce(p_cond, false) then raise notice '  ✓ %', p_what;
  else raise exception '✗ 這一條不成立：%', p_what; end if;
end $$;
create or replace function test_denied(p_sql text, p_what text) returns void
language plpgsql as $$
declare v_ok boolean := false;
begin
  begin
    execute p_sql;
  exception when insufficient_privilege or raise_exception or check_violation then v_ok := true;
  end;
  if not v_ok then raise exception '✗ 這個動作應該被擋掉卻成功了：%', p_what; end if;
  raise notice '  ✓ 擋下來了：%', p_what;
end $$;
create or replace function test_as(p_uid text) returns void
language plpgsql as $$
begin
  perform set_config('test.uid', p_uid, false);
  perform set_config('test.jwt', json_build_object('is_anonymous', false)::text, false);
end $$;
grant execute on function test_ok(boolean, text), test_denied(text, text), test_as(text) to authenticated, anon;

-- 人：王老師（五年一班）、別班張老師、小明和小華（五年一班）、別班的阿寶
insert into auth.users (id, email) values
  ('e0000000-0000-0000-0000-000000000001', 'wang@islandtest.local'),
  ('e0000000-0000-0000-0000-000000000002', 'zhang@islandtest.local'),
  ('e0000000-0000-0000-0000-000000000011', null),
  ('e0000000-0000-0000-0000-000000000012', null),
  ('e0000000-0000-0000-0000-000000000013', null);
insert into public.teachers (user_id, display_name) values
  ('e0000000-0000-0000-0000-000000000001', '王老師'),
  ('e0000000-0000-0000-0000-000000000002', '張老師');
insert into public.classes (code, name, owner) values
  ('IS1', '五年一班', 'e0000000-0000-0000-0000-000000000001'),
  ('IS2', '別班', 'e0000000-0000-0000-0000-000000000002');
insert into public.students (id, login_id, pw_hash, nickname, class_code) values
  ('f0000000-0000-0000-0000-000000000001', 'is_ming', 'x', '小明', 'IS1'),
  ('f0000000-0000-0000-0000-000000000002', 'is_hua', 'x', '小華', 'IS1'),
  ('f0000000-0000-0000-0000-000000000003', 'is_bao', 'x', '阿寶', 'IS2');
insert into public.student_links (user_id, student_id) values
  ('e0000000-0000-0000-0000-000000000011', 'f0000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000012', 'f0000000-0000-0000-0000-000000000002'),
  ('e0000000-0000-0000-0000-000000000013', 'f0000000-0000-0000-0000-000000000003');

set role authenticated;

\echo '── 存檔'
select test_as('e0000000-0000-0000-0000-000000000011');
select test_ok(public.island_load() = '{}'::jsonb, '小明還沒有存檔');
select test_ok(public.island_save('ch5', '{"v":1,"reached":3,"stars":0,"done":false,"broken":1,"answers":[],"cards":["shi","river"]}'), '小明存第五章');
select test_ok(public.island_save('world', '{"v":1,"cleared":[],"cards":["shi","river","plain"]}'), '小明存大地圖');
select test_ok((public.island_load() -> 'ch5' ->> 'reached')::int = 3, '讀得回來');
select test_ok(public.island_load() -> 'ch5' ? '_at', '讀回來附上存檔時間（換平板時比新舊）');
select test_ok(public.island_save('ch5', '{"v":1,"reached":5,"stars":2,"done":true,"broken":1,"answers":[0,1,0]}'), '過關');
select test_ok(public.island_save('ch5', '{"v":1,"reached":0,"stars":0,"done":false,"answers":[]}'), '從頭再玩');
select test_ok((select stars from public.island_saves where slot = 'ch5') = 2, '星星不會變少');
select test_ok((select done from public.island_saves where slot = 'ch5'), '過關不會被取消');
select test_denied($$select public.island_save('ch9', '{}')$$, '不存在的章');
select test_denied($$select public.island_save('ch5', '[1,2]')$$, '格式不是物件');
select test_denied($$select public.island_save('ch5', '{"reached":"abc"}')$$, '欄位亂填');
select test_denied($$select public.island_save('ch5', jsonb_build_object('pad', repeat('x', 40000)))$$, '存檔太大');
select test_denied($$insert into public.island_saves (student_id, slot) values ('f0000000-0000-0000-0000-000000000002', 'ch5')$$, '直接寫表');
select test_denied($$update public.island_saves set stars = 3$$, '直接改星星');

\echo '── 看得到誰的存檔'
select test_as('e0000000-0000-0000-0000-000000000012');
select test_ok((select count(*) from public.island_saves) = 0, '小華看不到小明的存檔');
select test_ok(public.island_load() = '{}'::jsonb, '小華讀到的是自己的（空的）');
select test_as('e0000000-0000-0000-0000-000000000001');
select test_ok(public.island_load() is null, '老師不是學生：island_load 回 null');
select test_ok(not public.island_save('ch5', '{}'), '老師試玩不會存');
select test_ok((select count(*) from public.island_saves) = 2, '王老師看得到自己學生的存檔');

\echo '── 全班摘要與老師細節頁'
select test_ok((select progress from public.island_class_summary('is1') where student_id = 'f0000000-0000-0000-0000-000000000001') = 100, '過關＝100');
select test_ok((select status from public.island_class_summary('IS1') where student_id = 'f0000000-0000-0000-0000-000000000001') like '%完成 ★★☆', '狀態寫星星');
select test_ok((select status from public.island_class_summary('IS1') where student_id = 'f0000000-0000-0000-0000-000000000002') = '還沒開始', '沒玩過的學生');
select test_ok((select attention from public.island_class_summary('IS1') where student_id = 'f0000000-0000-0000-0000-000000000002'), '沒玩過要注意');
select test_ok((select count(*) from public.island_class_summary('IS1')) = 2, '摘要只有這班的兩個人');
select test_ok((select cards from public.island_class_detail('IS1') where nickname = '小明') = 3, '細節頁：圖鑑張數看大地圖那份');
select test_ok((select answers from public.island_class_detail('IS1') where nickname = '小明') = '[]'::jsonb, '細節頁：反思題答案');
select test_ok((select count(*) from public.island_class_summary('IS2')) = 0, '別班的摘要看不到');
select test_denied($$select * from public.island_class_detail('IS2')$$, '別班的細節頁');

select test_as('e0000000-0000-0000-0000-000000000002');
select test_ok((select count(*) from public.island_saves) = 0, '別班老師看不到');

reset role;
set role anon;
select test_denied($$select public.island_save('ch5', '{}')$$, '沒登入不能存');
select test_denied($$select * from public.island_class_summary('IS1')$$, '沒登入不能看摘要');
reset role;

\echo '── 樂園登記'
select test_ok((select summary_fn from public.park_facilities where code = 'island_pioneer') = 'island_class_summary', '設施登記了摘要函式');
select test_ok((select url_dev from public.park_facilities where code = 'island_pioneer') = '/Taiwan-island/dev/', '設施登記了測試站網址');
select test_ok((select status from public.park_facilities where code = 'island_pioneer') = 'construction', '狀態不動（管理員在後台改）');
