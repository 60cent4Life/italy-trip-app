// ============================================================================
// Database access layer — replaces all lod()/sav() localStorage calls.
// Every function here is async and talks to Supabase instead of the browser.
// ============================================================================
import { supabase } from './supabase-client.js';

// ── Simple password hashing (unchanged from original app) ───────────────────
export function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = Math.imul(31, h) + str.charCodeAt(i) | 0; }
  return h.toString(36);
}

// ── ADMIN ACCOUNTS ────────────────────────────────────────────────────────
// Supports multiple admins now: one 'owner' (can't be deleted, can manage
// other admins) plus any number of regular 'admin' accounts.

// Used by the landing page to decide: show "create the first owner account"
// vs "log in" when the Admin button is clicked.
export async function getAnyAdminExists() {
  const { data, error } = await supabase.from('admin_account').select('id').limit(1);
  if (error) throw error;
  return (data || []).length > 0;
}

export async function getAdminByEmail(email) {
  const { data, error } = await supabase.from('admin_account')
    .select('*').eq('email', email.trim().toLowerCase()).limit(1).single();
  if (error && error.code !== 'PGRST116') console.error(error); // PGRST116 = no rows, expected
  return data || null;
}

export async function getAllAdmins() {
  const { data, error } = await supabase.from('admin_account')
    .select('*').order('role', { ascending: true }).order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

// role defaults to 'admin' — the very first account (created via AdminRegister)
// explicitly passes role:'owner'. Only ever one owner should be created that way.
export async function createAdmin({ username, email, passHash, role = 'admin' }) {
  const { data, error } = await supabase.from('admin_account')
    .insert({ username, email: email.trim().toLowerCase(), pass_hash: passHash, role }).select().single();
  if (error) {
    if (error.code === '23505') throw new Error('An admin account with this email already exists.');
    throw error;
  }
  return data;
}

export async function updateAdminPassword(adminId, newPassHash) {
  const { error } = await supabase.from('admin_account')
    .update({ pass_hash: newPassHash }).eq('id', adminId);
  if (error) throw error;
}

// Owner accounts can never be deleted — enforced here in addition to the
// "Remove" button simply not being shown for the owner in the dashboard UI.
export async function deleteAdmin(adminId) {
  const { data: target, error: fetchErr } = await supabase.from('admin_account')
    .select('role').eq('id', adminId).single();
  if (fetchErr) throw fetchErr;
  if (target.role === 'owner') throw new Error('The owner account cannot be removed.');
  const { error } = await supabase.from('admin_account').delete().eq('id', adminId);
  if (error) throw error;
}

// ── TRIPS ─────────────────────────────────────────────────────────────────
export async function getAllTrips() {
  const { data, error } = await supabase.from('trips').select('*').order('year', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getLiveTrip() {
  const { data, error } = await supabase.from('trips').select('*').eq('is_live', true).limit(1).single();
  if (error && error.code !== 'PGRST116') console.error(error);
  return data || null;
}

export async function createTrip({ name, year, cities }) {
  const { data, error } = await supabase.from('trips')
    .insert({ name, year, cities, is_live: false }).select().single();
  if (error) throw error;
  return data;
}

// Deletes a trip and everything tied to it (roster, student accounts, room
// selections, registration data) — the database's ON DELETE CASCADE rules
// handle cleaning up the related tables automatically.
export async function deleteTrip(tripId) {
  const { error } = await supabase.from('trips').delete().eq('id', tripId);
  if (error) throw error;
}

export async function setTripLive(tripId, isLive) {
  if (isLive) {
    await supabase.from('trips').update({ is_live: false }).neq('id', tripId);
  }
  const { data, error } = await supabase.from('trips')
    .update({ is_live: isLive }).eq('id', tripId).select().single();
  if (error) throw error;
  return data;
}

export async function updateTripSetupData(tripId, setupData) {
  const { error } = await supabase.from('trips').update({ setup_data: setupData }).eq('id', tripId);
  if (error) throw error;
}

export async function updateTripCityDates(tripId, cityDates) {
  const { error } = await supabase.from('trips').update({ city_dates: cityDates }).eq('id', tripId);
  if (error) throw error;
}

// ── ROSTER ────────────────────────────────────────────────────────────────
export async function getRoster(tripId) {
  const { data, error } = await supabase.from('roster_students').select('*').eq('trip_id', tripId);
  if (error) throw error;
  return (data || []).map(r => ({
    name: r.name, gender: r.gender, email: r.email || "",
    passport: r.passport || "", allergies: r.allergies || "", dob: r.dob || ""
  }));
}

// Merge-upload: updates existing students, adds new ones, keeps untouched ones.
// Uses Postgres UPSERT (insert-or-update) for safety with concurrent admin sessions.
export async function upsertRoster(tripId, students) {
  const rows = students.map(s => ({
    trip_id: tripId, name: s.name, gender: s.gender || "M",
    email: s.email || "", passport: s.passport || "", allergies: s.allergies || "", dob: s.dob || ""
  }));
  const { error } = await supabase.from('roster_students')
    .upsert(rows, { onConflict: 'trip_id,name' });
  if (error) throw error;
}

// ── STUDENT ACCOUNTS ──────────────────────────────────────────────────────
export async function getStudentByEmail(tripId, email) {
  const { data, error } = await supabase.from('student_accounts')
    .select('*').eq('trip_id', tripId).eq('email', email.toLowerCase()).limit(1).single();
  if (error && error.code !== 'PGRST116') console.error(error);
  return data || null;
}

export async function getAllStudentAccounts(tripId) {
  const { data, error } = await supabase.from('student_accounts').select('*').eq('trip_id', tripId);
  if (error) throw error;
  return data || [];
}

export async function registerStudent(tripId, student) {
  // unique(trip_id, email) constraint guarantees no duplicate accounts even
  // if two requests race — the second insert will cleanly fail with code 23505.
  const { data, error } = await supabase.from('student_accounts').insert({
    trip_id: tripId, email: student.email.toLowerCase(), name: student.name,
    pass_hash: student.passHash, first_name: student.firstName, last_name: student.lastName,
    gender: student.gender, dob: student.dob, passport: student.passport, allergies: student.allergies,
  }).select().single();
  if (error) {
    if (error.code === '23505') throw new Error('This email is already registered.');
    throw error;
  }
  return data;
}

export async function resetStudentPassword(studentId, newPassHash) {
  const { error } = await supabase.from('student_accounts')
    .update({ pass_hash: newPassHash }).eq('id', studentId);
  if (error) throw error;
}

// ── ROOM SELECTIONS — the concurrency-critical part ──────────────────────

// Get all current selections for a trip, shaped to match the original app's format:
// { studentName: { name, cityPicks: { Rome: {key,slot,name}, ... } } }
export async function getSelections(tripId) {
  const { data, error } = await supabase.from('room_selections').select('*').eq('trip_id', tripId);
  if (error) throw error;
  const out = {};
  (data || []).forEach(row => {
    if (!out[row.student_name]) out[row.student_name] = { name: row.student_name, cityPicks: {} };
    out[row.student_name].cityPicks[row.city] = { key: row.room_key, slot: row.slot, name: row.student_name };
  });
  return out;
}

// THE KEY SAFETY FUNCTION.
// Attempts to claim a room slot. Because of the unique(trip_id, city, room_key, slot)
// constraint in the schema, if two students try to claim the same slot at the
// same moment, only ONE insert succeeds — Postgres guarantees this atomically.
// The loser gets a clean "SLOT_TAKEN" error back instead of silently overwriting data.
export async function claimSlot(tripId, city, roomKey, slot, studentName) {
  const { error } = await supabase.from('room_selections').insert({
    trip_id: tripId, city, room_key: roomKey, slot, student_name: studentName,
  });
  if (error) {
    if (error.code === '23505') {
      // Unique constraint violation = someone else claimed this slot first
      const e = new Error('SLOT_TAKEN');
      e.code = 'SLOT_TAKEN';
      throw e;
    }
    throw error;
  }
}

// Release a slot (e.g. student switching rooms, or admin removing assignment)
export async function releaseSlot(tripId, city, roomKey, slot) {
  const { error } = await supabase.from('room_selections')
    .delete().eq('trip_id', tripId).eq('city', city).eq('room_key', roomKey).eq('slot', slot);
  if (error) throw error;
}

// Clears every room assignment for a single city (used to undo a bad
// bulk import so it can be safely re-run without leaving orphaned rows).
export async function clearCityAssignments(tripId, city) {
  const { error } = await supabase.from('room_selections')
    .delete().eq('trip_id', tripId).eq('city', city);
  if (error) throw error;
}

// Release whatever slot a student currently has in a city (used before re-picking)
export async function releaseStudentCityPick(tripId, city, studentName) {
  const { error } = await supabase.from('room_selections')
    .delete().eq('trip_id', tripId).eq('city', city).eq('student_name', studentName);
  if (error) throw error;
}

// Atomic "move" — release old slot AND claim new slot in a single transaction,
// so a failure partway through can't leave a student in limbo (in neither room).
export async function moveStudentToSlot(tripId, city, studentName, newRoomKey, newSlot) {
  // Supabase JS client doesn't expose raw transactions directly, so we call
  // a Postgres function (defined in schema) that does both steps atomically.
  const { error } = await supabase.rpc('move_student_slot', {
    p_trip_id: tripId, p_city: city, p_student_name: studentName,
    p_new_room_key: newRoomKey, p_new_slot: newSlot,
  });
  if (error) {
    if (error.message?.includes('slot_taken')) {
      const e = new Error('SLOT_TAKEN');
      e.code = 'SLOT_TAKEN';
      throw e;
    }
    throw error;
  }
}

// ── REAL-TIME SUBSCRIPTION ────────────────────────────────────────────────
// Lets the room board update live as other students make picks, without
// needing a manual refresh. Call this once when a room-picking screen mounts.
export function subscribeToRoomChanges(tripId, onChange) {
  const channel = supabase
    .channel(`room_selections_${tripId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'room_selections', filter: `trip_id=eq.${tripId}` },
      (payload) => onChange(payload)
    )
    .subscribe();
  return () => supabase.removeChannel(channel); // cleanup function for useEffect
}

// ── REGISTRATION DATA ─────────────────────────────────────────────────────
export async function getRegistrationData(tripId) {
  const { data, error } = await supabase.from('registration_data').select('*').eq('trip_id', tripId);
  if (error) throw error;
  return (data || []).map(r => ({ _id: r.id, _displayName: r.display_name, _fileName: r.file_name, _importedAt: new Date(r.imported_at).getTime(), ...r.data }));
}

export async function saveRegistrationData(tripId, records) {
  // Full replace: clear old, insert new (matches current app's re-upload behaviour)
  await supabase.from('registration_data').delete().eq('trip_id', tripId);
  const rows = records.map(r => ({
    trip_id: tripId, display_name: r._displayName, file_name: r._fileName, data: r,
  }));
  if (rows.length) {
    const { error } = await supabase.from('registration_data').insert(rows);
    if (error) throw error;
  }
}

export async function clearRegistrationData(tripId) {
  const { error } = await supabase.from('registration_data').delete().eq('trip_id', tripId);
  if (error) throw error;
}
