
-- Copy Arabic translations (title_ar, name_ar) from QA menu items' custom_sections
-- into matching KW menu items' custom_sections (matched by item name, section title, option name)

DO $$
DECLARE
  kw_item RECORD;
  qa_sections jsonb;
  new_sections jsonb;
  kw_section jsonb;
  qa_section jsonb;
  new_options jsonb;
  kw_option jsonb;
  qa_option jsonb;
  found_title_ar text;
  found_name_ar text;
  updated_count int := 0;
BEGIN
  FOR kw_item IN
    SELECT kw.id, kw.name, kw.custom_sections
    FROM menu_items kw
    WHERE kw.country_id = 'kw'
      AND kw.custom_sections IS NOT NULL
      AND jsonb_array_length(kw.custom_sections) > 0
  LOOP
    -- Find matching QA item by name
    SELECT qa.custom_sections INTO qa_sections
    FROM menu_items qa
    WHERE qa.country_id = 'qa'
      AND qa.name = kw_item.name
      AND qa.custom_sections IS NOT NULL
      AND jsonb_array_length(qa.custom_sections) > 0
    LIMIT 1;

    IF qa_sections IS NULL THEN
      CONTINUE;
    END IF;

    -- Rebuild KW sections with Arabic translations from QA
    new_sections := '[]'::jsonb;

    FOR i IN 0..jsonb_array_length(kw_item.custom_sections) - 1 LOOP
      kw_section := kw_item.custom_sections->i;
      found_title_ar := NULL;

      -- Find matching QA section by title
      FOR j IN 0..jsonb_array_length(qa_sections) - 1 LOOP
        qa_section := qa_sections->j;
        IF qa_section->>'title' = kw_section->>'title' THEN
          found_title_ar := qa_section->>'title_ar';
          
          -- Now match options
          new_options := '[]'::jsonb;
          FOR k IN 0..jsonb_array_length(kw_section->'options') - 1 LOOP
            kw_option := (kw_section->'options')->k;
            found_name_ar := NULL;

            -- Find matching QA option by name
            FOR l IN 0..jsonb_array_length(qa_section->'options') - 1 LOOP
              qa_option := (qa_section->'options')->l;
              IF qa_option->>'name' = kw_option->>'name' THEN
                found_name_ar := qa_option->>'name_ar';
                EXIT;
              END IF;
            END LOOP;

            -- Add name_ar if found
            IF found_name_ar IS NOT NULL THEN
              kw_option := kw_option || jsonb_build_object('name_ar', found_name_ar);
            END IF;
            new_options := new_options || jsonb_build_array(kw_option);
          END LOOP;

          -- Build updated section
          kw_section := jsonb_set(kw_section, '{options}', new_options);
          IF found_title_ar IS NOT NULL THEN
            kw_section := kw_section || jsonb_build_object('title_ar', found_title_ar);
          END IF;
          EXIT;
        END IF;
      END LOOP;

      new_sections := new_sections || jsonb_build_array(kw_section);
    END LOOP;

    -- Update KW item
    UPDATE menu_items SET custom_sections = new_sections WHERE id = kw_item.id;
    updated_count := updated_count + 1;
  END LOOP;

  RAISE NOTICE 'Updated % KW menu items with Arabic translations from QA', updated_count;
END $$;
