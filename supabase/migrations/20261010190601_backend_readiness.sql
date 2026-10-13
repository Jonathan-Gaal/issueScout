-- Apply after migrations/0001_init.sql. Backend service role only.
-- Admission and completion each run in one transaction.
begin;
create function public.admit_run(p_user_id text, p_issue_url text, p_limit integer)
returns setof public.runs language plpgsql security invoker set search_path = '' as $$
begin
  if p_limit is null or p_limit < 1 or p_user_id is null or length(p_user_id) = 0 then
    raise exception 'Invalid admission parameters';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id, 0));
  if (select count(*) from public.runs where user_id = p_user_id and created_at >= now() - interval '1 hour') >= p_limit then
    return;
  end if;
  return query insert into public.runs(user_id, issue_url) values(p_user_id, p_issue_url) returning *;
end;
$$;
create function public.finish_run(p_run_id uuid, p_user_id text, p_repo text, p_outcome jsonb, p_duration_ms integer)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_report jsonb := p_outcome->'report';
begin
  perform 1 from public.runs where id = p_run_id and user_id = p_user_id and status = 'running' for update;
  if not found then raise exception 'Run is unavailable'; end if;
  if p_outcome->>'status' not in ('completed','stopped','failed') or p_outcome->>'status' is null then raise exception 'Invalid status'; end if;
  if p_outcome->>'status' in ('completed','stopped') and (v_report is null or v_report = 'null'::jsonb) then raise exception 'Missing report'; end if;
  if v_report is not null and v_report <> 'null'::jsonb then
    insert into public.issues(run_id, repo, number, title, state, url, retrieved_at)
    values(p_run_id,p_repo,(v_report#>>'{issue,number}')::integer,v_report#>>'{issue,title}',v_report#>>'{issue,state}',v_report#>>'{issue,url}',(v_report#>>'{issue,retrievedAt}')::timestamptz);
    insert into public.reports(run_id,report) values(p_run_id,v_report);
  end if;
  insert into public.tool_calls(run_id,operation,arguments,outcome)
  select p_run_id, item->>'operation',item->'arguments',item->>'outcome'
  from jsonb_array_elements(coalesce(p_outcome->'toolCalls','[]'::jsonb)) item;
  update public.runs set status=p_outcome->>'status', error_code=p_outcome->>'errorCode',
    stop_reason=v_report#>>'{coverage,stopReason}',
    searches_used=coalesce((v_report#>>'{coverage,searchesRun}')::integer,0),
    reads_used=coalesce((v_report#>>'{coverage,candidatesRead}')::integer,0),
    model_turns_used=coalesce((p_outcome->>'modelTurnsUsed')::integer,0),
    duration_ms=p_duration_ms, finished_at=now()
  where id=p_run_id and user_id=p_user_id;
end;
$$;
revoke all on function public.admit_run(text,text,integer) from public,anon,authenticated;
revoke all on function public.finish_run(uuid,text,text,jsonb,integer) from public,anon,authenticated;
grant execute on function public.admit_run(text,text,integer) to service_role;
grant execute on function public.finish_run(uuid,text,text,jsonb,integer) to service_role;
commit;
