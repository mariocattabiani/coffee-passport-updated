create or replace function public.get_popular_cafes(
  result_limit integer default 5
)
returns table (
  shop_id uuid,
  name text,
  city text,
  state text,
  latitude double precision,
  longitude double precision,
  is_chain boolean,
  rating_avg numeric,
  rating_count bigint,
  top_drink_name text,
  top_drink_rating numeric,
  public_log_count bigint,
  unique_visitor_count bigint,
  photo_path text
)
language sql
security invoker
set search_path = public
as $$
  with public_logs as (
    select
      dl.shop_id,
      dl.user_id,
      dl.shop_rating,
      dl.drink_rating,
      dl.drink_id,
      dl.photo_url,
      dl.logged_at,
      dl.created_at
    from public.drink_logs dl
    where dl.visibility = 'public'
  ),

  shop_stats as (
    select
      pl.shop_id,
      count(*) as public_log_count,
      count(distinct pl.user_id) as unique_visitor_count,
      avg(pl.shop_rating)::numeric as rating_avg,
      count(pl.shop_rating) as rating_count
    from public_logs pl
    group by pl.shop_id
  ),

  drink_stats as (
    select
      pl.shop_id,
      pl.drink_id,
      avg(pl.drink_rating)::numeric as avg_rating,
      count(*) as rating_count
    from public_logs pl
    group by pl.shop_id, pl.drink_id
  ),

  ranked_drinks as (
    select
      ds.shop_id,
      d.name as drink_name,
      ds.avg_rating,
      row_number() over (
        partition by ds.shop_id
        order by
          ds.avg_rating desc nulls last,
          ds.rating_count desc,
          d.name asc
      ) as rn
    from drink_stats ds
    join public.drinks d on d.id = ds.drink_id
  ),

  representative_photo as (
    select distinct on (pl.shop_id)
      pl.shop_id,
      pl.photo_url as photo_path
    from public_logs pl
    where pl.photo_url is not null
    order by
      pl.shop_id,
      pl.logged_at desc,
      pl.created_at desc
  )

  select
    s.id as shop_id,
    s.name,
    s.city,
    s.state,
    s.latitude,
    s.longitude,
    s.is_chain,
    ss.rating_avg,
    ss.rating_count,
    rd.drink_name as top_drink_name,
    rd.avg_rating as top_drink_rating,
    ss.public_log_count,
    ss.unique_visitor_count,
    rp.photo_path
  from shop_stats ss
  join public.shops s on s.id = ss.shop_id
  left join ranked_drinks rd
    on rd.shop_id = s.id
   and rd.rn = 1
  left join representative_photo rp
    on rp.shop_id = s.id
  where
    s.latitude is not null
    and s.longitude is not null
  order by
    ss.public_log_count desc,
    ss.unique_visitor_count desc,
    ss.rating_avg desc nulls last,
    s.name asc
  limit greatest(1, least(result_limit, 25));
$$;
grant execute on function public.get_popular_cafes(integer)
to authenticated;
