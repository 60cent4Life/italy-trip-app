-- ============================================================================
-- Postgres function for atomic "move student to a different room slot"
-- Run this in the Supabase SQL Editor AFTER running schema.sql
-- ============================================================================
-- This guarantees that releasing the old slot and claiming the new slot
-- happen as ONE atomic operation — if claiming the new slot fails (because
-- someone else just took it), the old slot release is automatically rolled
-- back too, so the student never ends up with no room at all.

create or replace function move_student_slot(
  p_trip_id uuid,
  p_city text,
  p_student_name text,
  p_new_room_key text,
  p_new_slot text
) returns void as $$
begin
  -- Release any existing slot this student has in this city
  delete from room_selections
  where trip_id = p_trip_id and city = p_city and student_name = p_student_name;

  -- Attempt to claim the new slot. If another student already holds it,
  -- the unique constraint raises an exception and the whole function
  -- (including the delete above) is rolled back automatically.
  begin
    insert into room_selections (trip_id, city, room_key, slot, student_name)
    values (p_trip_id, p_city, p_new_room_key, p_new_slot, p_student_name);
  exception when unique_violation then
    raise exception 'slot_taken';
  end;
end;
$$ language plpgsql;
