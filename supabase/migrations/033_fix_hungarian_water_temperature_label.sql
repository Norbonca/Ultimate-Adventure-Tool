-- Correct the Hungarian label used by existing and future trip detail pages.
BEGIN;

UPDATE public.ref_parameter_options option
SET label_localized = COALESCE(option.label_localized, '{}'::jsonb)
  || '{"hu":"Normál (20–25)"}'::jsonb
WHERE option.value = 'normal'
  AND option.parameter_id IN (
    SELECT parameter.id
    FROM public.ref_category_parameters parameter
    JOIN public.categories category ON category.id = parameter.category_id
    WHERE parameter.parameter_key = 'water_temp_min_c'
      AND category.name = 'Water Sports'
  );

COMMIT;
