-- Staging proposal; requires 0025, not 0024. No data rewrite or policy change.
begin;
alter function public._validate_learning_plan_content(jsonb,boolean)
  rename to _validate_learning_plan_content_ten_classes;
revoke all on function public._validate_learning_plan_content_ten_classes(jsonb,boolean) from public,anon,authenticated;

create function public._validate_learning_plan_content(p_content jsonb,p_complete boolean)
returns void language plpgsql immutable set search_path='' as $$
declare n integer; i integer; part jsonb; ids text[]:=array[]::text[]; objective_id text;
begin
  if not(p_content?'architect') then
    perform public._validate_learning_plan_content_v1(p_content,p_complete);
    return;
  end if;
  if octet_length(p_content::text)>60000
    or jsonb_typeof(p_content->'objectives') is distinct from 'array'
    or jsonb_typeof(p_content->'architect'->'sessions') is distinct from 'array' then
    raise exception 'Invalid architect course arrays or size' using errcode='22023';
  end if;
  n:=jsonb_array_length(p_content->'objectives');
  if n not between 1 and 12 or jsonb_array_length(p_content->'architect'->'sessions')<>n then
    raise exception 'Choose between one and twelve matching classes' using errcode='22023';
  end if;
  -- Validate every objective/session with the unchanged 0025 validator.
  -- Its full overview, text, keys, stages and duration checks remain mandatory.
  for i in 0..n-1 loop
    objective_id:=lower(p_content->'objectives'->i->>'id');
    if objective_id=any(ids) then
      raise exception 'Invalid or repeated objective ID' using errcode='22023';
    end if;
    ids:=array_append(ids,objective_id);
    part:=jsonb_set(p_content,'{objectives}',jsonb_build_array(p_content->'objectives'->i));
    part:=jsonb_set(part,'{architect,sessions}',jsonb_build_array(p_content->'architect'->'sessions'->i));
    perform public._validate_learning_plan_content_ten_classes(part,p_complete);
  end loop;
end $$;
revoke all on function public._validate_learning_plan_content(jsonb,boolean) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
