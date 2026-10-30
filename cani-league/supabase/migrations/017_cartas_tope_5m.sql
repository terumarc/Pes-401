-- 017 · Ninguna carta quita más de 5M
-- Las que daban más (Suerte: 6, 7, 10 y 15M) se quedan en 5M. Las que dan dinero no cambian.
update public.card_events
   set effect = jsonb_set(effect, '{a}', '-5'::jsonb)
 where (effect->>'a')::int < -5;
update public.card_events
   set effect = jsonb_set(effect, '{per}', '-5'::jsonb)
 where (effect->>'per')::int < -5;
