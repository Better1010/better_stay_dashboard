import { supabase } from '@/lib/supabase';

type Method = 'GET' | 'POST' | 'PATCH';

type ApiResponse<T = any> = {
  data: T;
};

class ApiRequestError extends Error {
  response: { status: number; data: { message: string } };

  constructor(status: number, message: string) {
    super(message);
    this.response = { status, data: { message } };
  }
}

const redirectPathByRole: Record<string, string> = {
  super_admin: '/super-admin',
  hostel_admin: '/admin',
  resident: '/resident',
  staff: '/staff',
};

const nowIso = () => new Date().toISOString();

const throwIfError = (error: any, fallbackMessage: string) => {
  if (error) {
    throw new ApiRequestError(400, error.message || fallbackMessage);
  }
};

const getStoredUser = () => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const requireAuthUser = () => {
  const user = getStoredUser();
  if (!user) {
    throw new ApiRequestError(401, 'Authentication required');
  }
  return user;
};

const mapProfile = (p: any) => ({
  _id: p.id,
  id: p.id,
  name: p.name,
  email: p.email,
  phone: p.phone,
  role: p.role,
  status: p.status,
  hostelId: p.hostel_id,
  roomId: p.room_id,
  bedId: p.bed_id,
  staffType: p.staff_type,
  mustChangePassword: p.must_change_password || false,
  identificationDocument: p.identification_document || null,
  createdAt: p.created_at,
  updatedAt: p.updated_at,
});

const enrichProfiles = async (profiles: any[]) => {
  const roomIds = profiles.map((p) => p.room_id).filter(Boolean);
  const hostelIds = profiles.map((p) => p.hostel_id).filter(Boolean);
  const bedIds = profiles.map((p) => p.bed_id).filter(Boolean);

  const [roomsRes, hostelsRes, bedsRes] = await Promise.all([
    roomIds.length
      ? supabase.from('rooms').select('id, room_number').in('id', roomIds)
      : Promise.resolve({ data: [], error: null }),
    hostelIds.length
      ? supabase.from('hostels').select('id, name').in('id', hostelIds)
      : Promise.resolve({ data: [], error: null }),
    bedIds.length
      ? supabase.from('beds').select('id, bed_number').in('id', bedIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  throwIfError(roomsRes.error, 'Failed to load rooms');
  throwIfError(hostelsRes.error, 'Failed to load hostels');
  throwIfError(bedsRes.error, 'Failed to load beds');

  const rooms = new Map((roomsRes.data || []).map((r: any) => [r.id, r]));
  const hostels = new Map((hostelsRes.data || []).map((h: any) => [h.id, h]));
  const beds = new Map((bedsRes.data || []).map((b: any) => [b.id, b]));

  return profiles.map((p) => ({
    ...mapProfile(p),
    roomId: p.room_id ? { _id: p.room_id, roomNumber: rooms.get(p.room_id)?.room_number } : null,
    hostelId: p.hostel_id ? { _id: p.hostel_id, name: hostels.get(p.hostel_id)?.name } : null,
    bedId: p.bed_id ? { _id: p.bed_id, bedNumber: beds.get(p.bed_id)?.bed_number } : null,
  }));
};

const getPathParam = (path: string, regex: RegExp) => {
  const basePath = path.split('?')[0];
  const match = basePath.match(regex);
  return match?.[1] || null;
};

const getQueryParam = (path: string, key: string): string | null => {
  try {
    const q = path.split('?')[1];
    if (!q) return null;
    const params = new URLSearchParams(q);
    return params.get(key);
  } catch {
    return null;
  }
};

const authLogin = async (payload: any): Promise<ApiResponse> => {
  const { email, phone, password } = payload || {};
  if (!password || (!email && !phone)) {
    throw new ApiRequestError(400, 'Email/Phone and password are required');
  }

  let resolvedEmail = email?.trim()?.toLowerCase();
  if (!resolvedEmail && phone) {
    const profileByPhone = await supabase
      .from('profiles')
      .select('email')
      .eq('phone', phone.trim())
      .maybeSingle();
    throwIfError(profileByPhone.error, 'Invalid credentials');
    resolvedEmail = profileByPhone.data?.email || null;
  }

  if (!resolvedEmail) {
    throw new ApiRequestError(401, 'Invalid credentials');
  }

  const signIn = await supabase.auth.signInWithPassword({
    email: resolvedEmail,
    password,
  });
  if (signIn.error || !signIn.data.user || !signIn.data.session) {
    throw new ApiRequestError(401, signIn.error?.message || 'Invalid credentials');
  }

  const profileRes = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', signIn.data.user.id)
    .maybeSingle();
  throwIfError(profileRes.error, 'Failed to load profile');

  const profile = profileRes.data;
  if (!profile) {
    await supabase.auth.signOut();
    throw new ApiRequestError(
      403,
      'No profile found for this account. Please sign up first, or contact support if you already signed up.'
    );
  }
  if (profile.status !== 'active') {
    await supabase.auth.signOut();
    throw new ApiRequestError(403, `Account is ${profile.status}. Please contact administrator.`);
  }

  const user = {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    role: profile.role,
    hostelId: profile.hostel_id,
    mustChangePassword: profile.must_change_password || false,
  };

  return {
    data: {
      message: 'Login successful',
      token: signIn.data.session.access_token,
      user,
      redirectPath: redirectPathByRole[profile.role] || '/',
    },
  };
};

const authSignup = async (payload: any): Promise<ApiResponse> => {
  const { name, email, phone, password, hostelId } = payload || {};
  if (!name || !email || !phone || !password) {
    throw new ApiRequestError(400, 'All fields are required');
  }
  if (password.length < 6) {
    throw new ApiRequestError(400, 'Password must be at least 6 characters');
  }

  const existing = await supabase
    .from('profiles')
    .select('id')
    .or(`email.eq.${email.toLowerCase()},phone.eq.${phone}`)
    .limit(1);
  throwIfError(existing.error, 'Failed to check existing user');
  if ((existing.data || []).length > 0) {
    throw new ApiRequestError(400, 'User with this email or phone already exists');
  }

  const signUp = await supabase.auth.signUp({
    email: email.toLowerCase(),
    password,
    options: {
      data: { name, phone },
    },
  });
  if (signUp.error || !signUp.data.user) {
    throw new ApiRequestError(400, signUp.error?.message || 'Signup failed');
  }

  const insertProfile = await supabase.from('profiles').insert({
    auth_user_id: signUp.data.user.id,
    name,
    email: email.toLowerCase(),
    phone,
    role: 'resident',
    status: 'pending',
    hostel_id: hostelId || null,
    room_id: null,
    bed_id: null,
    identification_document: null,
    must_change_password: false,
    created_at: nowIso(),
    updated_at: nowIso(),
  });
  if (insertProfile.error) {
    if (insertProfile.error.code === '23505') {
      return {
        data: {
          message: 'Account created successfully. Please wait for admin approval.',
          userId: signUp.data.user.id,
        },
      };
    }
    throw new ApiRequestError(400, insertProfile.error.message || 'Failed to create profile');
  }

  await supabase.auth.signOut();

  return {
    data: {
      message: 'Account created successfully. Please wait for admin approval.',
      userId: signUp.data.user.id,
    },
  };
};

const getUsers = async (): Promise<ApiResponse> => {
  const current = requireAuthUser();
  let query = supabase.from('profiles').select('*');

  if (current.role === 'super_admin') {
    // no filter
  } else if (current.role === 'hostel_admin') {
    query = query.eq('hostel_id', current.hostelId);
  } else if (current.role === 'staff') {
    query = query.eq('hostel_id', current.hostelId).eq('role', 'resident');
  } else {
    throw new ApiRequestError(403, 'Access denied');
  }

  const res = await query.order('created_at', { ascending: false });
  throwIfError(res.error, 'Failed to load users');

  const users = await enrichProfiles(res.data || []);
  return { data: { users } };
};

const getPendingUsers = async (): Promise<ApiResponse> => {
  const current = requireAuthUser();
  if (!['super_admin', 'hostel_admin'].includes(current.role)) {
    throw new ApiRequestError(403, 'Access denied');
  }

  let query = supabase
    .from('profiles')
    .select('*')
    .eq('status', 'pending')
    .eq('role', 'resident');

  if (current.role === 'hostel_admin') {
    query = query.eq('hostel_id', current.hostelId);
  }

  const res = await query.order('created_at', { ascending: false });
  throwIfError(res.error, 'Failed to load pending users');

  const users = await enrichProfiles(res.data || []);
  return { data: { users } };
};

const updateUserStatus = async (id: string, payload: any): Promise<ApiResponse> => {
  const current = requireAuthUser();
  if (!['super_admin', 'hostel_admin'].includes(current.role)) {
    throw new ApiRequestError(403, 'Access denied');
  }

  const status = payload?.status;
  if (!['pending', 'active', 'blocked'].includes(status)) {
    throw new ApiRequestError(400, 'Invalid status');
  }

  const existing = await supabase.from('profiles').select('*').eq('id', id).single();
  throwIfError(existing.error, 'User not found');

  if (current.role === 'hostel_admin' && existing.data.hostel_id !== current.hostelId) {
    throw new ApiRequestError(403, 'Access denied');
  }

  const updated = await supabase
    .from('profiles')
    .update({ status, updated_at: nowIso() })
    .eq('id', id)
    .select('*')
    .single();
  throwIfError(updated.error, 'Failed to update user status');

  return { data: { message: `User status updated to ${status}`, user: mapProfile(updated.data) } };
};

const getHostels = async (): Promise<ApiResponse> => {
  const current = requireAuthUser();
  let query = supabase.from('hostels').select('*');

  if (['hostel_admin', 'resident', 'staff'].includes(current.role)) {
    query = query.eq('id', current.hostelId);
  }

  const res = await query.order('created_at', { ascending: false });
  throwIfError(res.error, 'Failed to load hostels');

  const hostels = (res.data || []).map((h: any) => ({
    _id: h.id,
    ...h,
    adminId: h.admin_id,
  }));
  return { data: { hostels } };
};

const createHostel = async (payload: any): Promise<ApiResponse> => {
  const current = requireAuthUser();
  if (current.role !== 'super_admin') {
    throw new ApiRequestError(403, 'Access denied');
  }
  const { name, address, city, phone, email } = payload || {};
  if (!name || !address || !city || !phone || !email) {
    throw new ApiRequestError(400, 'name, address, city, phone and email are required');
  }
  const res = await supabase
    .from('hostels')
    .insert({
      name: String(name).trim(),
      address: String(address).trim(),
      city: String(city).trim(),
      phone: String(phone).trim(),
      email: String(email).trim(),
      created_at: nowIso(),
      updated_at: nowIso(),
    })
    .select('*')
    .single();
  throwIfError(res.error, res.error?.message || 'Failed to create building');
  return { data: { hostel: { _id: res.data.id, ...res.data } } };
};

const getUnits = async (hostelId: string): Promise<ApiResponse> => {
  const current = requireAuthUser();
  if (!['super_admin', 'hostel_admin'].includes(current.role)) {
    throw new ApiRequestError(403, 'Access denied');
  }
  if (current.role === 'hostel_admin' && current.hostelId !== hostelId) {
    throw new ApiRequestError(403, 'Access denied');
  }
  const res = await supabase
    .from('units')
    .select('*')
    .eq('hostel_id', hostelId)
    .order('floor', { ascending: true })
    .order('unit_number', { ascending: true });
  throwIfError(res.error, 'Failed to load units');
  const units = (res.data || []).map((u: any) => ({
    _id: u.id,
    id: u.id,
    hostelId: u.hostel_id,
    unitNumber: u.unit_number,
    floor: u.floor,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  }));
  return { data: { units } };
};

const createUnit = async (payload: any): Promise<ApiResponse> => {
  const current = requireAuthUser();
  if (!['super_admin', 'hostel_admin'].includes(current.role)) {
    throw new ApiRequestError(403, 'Access denied');
  }
  const { hostelId, unitNumber, floor } = payload || {};
  if (!hostelId || !unitNumber || floor == null) {
    throw new ApiRequestError(400, 'hostelId, unitNumber and floor are required');
  }
  if (current.role === 'hostel_admin' && current.hostelId !== hostelId) {
    throw new ApiRequestError(403, 'Access denied');
  }
  const res = await supabase
    .from('units')
    .insert({
      hostel_id: hostelId,
      unit_number: String(unitNumber).trim(),
      floor: Number(floor),
      created_at: nowIso(),
      updated_at: nowIso(),
    })
    .select('*')
    .single();
  throwIfError(res.error, res.error?.message || 'Failed to create unit');
  return { data: { unit: { _id: res.data.id, ...res.data, hostelId: res.data.hostel_id, unitNumber: res.data.unit_number } } };
};

const updateUnit = async (id: string, payload: any): Promise<ApiResponse> => {
  const current = requireAuthUser();
  if (!['super_admin', 'hostel_admin'].includes(current.role)) {
    throw new ApiRequestError(403, 'Access denied');
  }
  const existing = await supabase.from('units').select('hostel_id').eq('id', id).single();
  throwIfError(existing.error, 'Unit not found');
  if (current.role === 'hostel_admin' && existing.data.hostel_id !== current.hostelId) {
    throw new ApiRequestError(403, 'Access denied');
  }
  const updates: any = { updated_at: nowIso() };
  if (payload?.unitNumber != null) updates.unit_number = String(payload.unitNumber).trim();
  if (payload?.floor != null) updates.floor = Number(payload.floor);
  const res = await supabase.from('units').update(updates).eq('id', id).select('*').single();
  throwIfError(res.error, 'Failed to update unit');
  return { data: { unit: { _id: res.data.id, ...res.data, hostelId: res.data.hostel_id, unitNumber: res.data.unit_number } } };
};

const deleteUnit = async (id: string): Promise<ApiResponse> => {
  const current = requireAuthUser();
  if (!['super_admin', 'hostel_admin'].includes(current.role)) {
    throw new ApiRequestError(403, 'Access denied');
  }
  const existing = await supabase.from('units').select('hostel_id').eq('id', id).single();
  throwIfError(existing.error, 'Unit not found');
  if (current.role === 'hostel_admin' && existing.data.hostel_id !== current.hostelId) {
    throw new ApiRequestError(403, 'Access denied');
  }
  const res = await supabase.from('units').delete().eq('id', id);
  throwIfError(res.error, 'Failed to delete unit');
  return { data: { message: 'Unit deleted' } };
};

const getRooms = async (queryParams?: { unitId?: string; hostelId?: string }): Promise<ApiResponse> => {
  const current = requireAuthUser();
  if (!['super_admin', 'hostel_admin'].includes(current.role)) {
    throw new ApiRequestError(403, 'Access denied');
  }

  let query = supabase.from('rooms').select('*');
  if (current.role === 'hostel_admin') {
    query = query.eq('hostel_id', current.hostelId);
  } else if (queryParams?.hostelId) {
    query = query.eq('hostel_id', queryParams.hostelId);
  }
  if (queryParams?.unitId) {
    query = query.eq('unit_id', queryParams.unitId);
  }

  const res = await query.order('floor', { ascending: true }).order('room_number', { ascending: true });
  throwIfError(res.error, 'Failed to load rooms');

  const rooms = (res.data || []).map((r: any) => ({
    _id: r.id,
    id: r.id,
    hostelId: r.hostel_id,
    unitId: r.unit_id,
    roomNumber: r.room_number,
    floor: r.floor,
    totalBeds: r.total_beds,
    occupiedBeds: r.occupied_beds,
    rent: r.rent,
    amenities: r.amenities || [],
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
  return { data: { rooms } };
};

const createRoom = async (payload: any): Promise<ApiResponse> => {
  const current = requireAuthUser();
  if (!['super_admin', 'hostel_admin'].includes(current.role)) {
    throw new ApiRequestError(403, 'Access denied');
  }
  const { unitId, hostelId, roomNumber, floor, totalBeds, rent } = payload || {};
  if (!hostelId || !roomNumber || floor == null) {
    throw new ApiRequestError(400, 'hostelId, roomNumber and floor are required');
  }
  if (current.role === 'hostel_admin' && current.hostelId !== hostelId) {
    throw new ApiRequestError(403, 'Access denied');
  }
  const res = await supabase
    .from('rooms')
    .insert({
      hostel_id: hostelId,
      unit_id: unitId || null,
      room_number: String(roomNumber).trim(),
      floor: Number(floor),
      total_beds: totalBeds != null ? Number(totalBeds) : 1,
      rent: rent != null ? Number(rent) : 0,
      created_at: nowIso(),
      updated_at: nowIso(),
    })
    .select('*')
    .single();
  throwIfError(res.error, res.error?.message || 'Failed to create room');
  return {
    data: {
      room: {
        _id: res.data.id,
        id: res.data.id,
        hostelId: res.data.hostel_id,
        unitId: res.data.unit_id,
        roomNumber: res.data.room_number,
        floor: res.data.floor,
        totalBeds: res.data.total_beds,
        rent: res.data.rent,
      },
    },
  };
};

const getBeds = async (roomId: string): Promise<ApiResponse> => {
  const current = requireAuthUser();
  if (!['super_admin', 'hostel_admin'].includes(current.role)) {
    throw new ApiRequestError(403, 'Access denied');
  }
  const roomRes = await supabase.from('rooms').select('hostel_id').eq('id', roomId).single();
  throwIfError(roomRes.error, 'Room not found');
  if (current.role === 'hostel_admin' && roomRes.data.hostel_id !== current.hostelId) {
    throw new ApiRequestError(403, 'Access denied');
  }
  const res = await supabase
    .from('beds')
    .select('*')
    .eq('room_id', roomId)
    .order('bed_number', { ascending: true });
  throwIfError(res.error, 'Failed to load beds');
  const bedIds = (res.data || []).map((b: any) => b.id);
  const assignmentsRes =
    bedIds.length > 0
      ? await supabase
          .from('bed_assignments')
          .select('*')
          .in('bed_id', bedIds)
          .is('ended_at', null)
      : { data: [] as any[] };
  const assignments = new Map((assignmentsRes.data || []).map((a: any) => [a.bed_id, a]));
  const residentIds = [...new Set((assignmentsRes.data || []).map((a: any) => a.resident_id).filter(Boolean))];
  const residentsRes =
    residentIds.length > 0
      ? await supabase.from('profiles').select('id, name, email, phone').in('id', residentIds)
      : { data: [] as any[] };
  const residents = new Map((residentsRes.data || []).map((r: any) => [r.id, r]));
  const beds = (res.data || []).map((b: any) => {
    const assignment = assignments.get(b.id);
    const resident = assignment?.resident_id ? residents.get(assignment.resident_id) : null;
    const assigneeName = assignment?.assignee_name ?? resident?.name ?? null;
    return {
      _id: b.id,
      id: b.id,
      roomId: b.room_id,
      bedNumber: b.bed_number,
      basePrice: b.base_price ?? 0,
      residentId: b.resident_id,
      assignmentPrice: assignment?.price ?? null,
      assigneeName: assigneeName || (resident ? resident.name : null),
      resident: resident ? { _id: resident.id, name: resident.name, email: resident.email, phone: resident.phone } : (assigneeName ? { _id: null, name: assigneeName, email: '', phone: '' } : null),
      isOccupied: b.is_occupied,
      isActive: b.is_active,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    };
  });
  return { data: { beds } };
};

const createBed = async (payload: any): Promise<ApiResponse> => {
  const current = requireAuthUser();
  if (!['super_admin', 'hostel_admin'].includes(current.role)) {
    throw new ApiRequestError(403, 'Access denied');
  }
  const { roomId, bedNumber, basePrice } = payload || {};
  if (!roomId || !bedNumber) {
    throw new ApiRequestError(400, 'roomId and bedNumber are required');
  }
  const roomRes = await supabase.from('rooms').select('hostel_id').eq('id', roomId).single();
  throwIfError(roomRes.error, 'Room not found');
  if (current.role === 'hostel_admin' && roomRes.data.hostel_id !== current.hostelId) {
    throw new ApiRequestError(403, 'Access denied');
  }
  const trimmedBedNumber = String(bedNumber).trim();
  if (!trimmedBedNumber) {
    throw new ApiRequestError(400, 'Bed number is required');
  }
  const res = await supabase
    .from('beds')
    .insert({
      room_id: roomId,
      bed_number: trimmedBedNumber,
      base_price: basePrice != null ? Number(basePrice) : 0,
      created_at: nowIso(),
      updated_at: nowIso(),
    })
    .select('*')
    .single();
  if (res.error) {
    if (res.error.code === '23505') {
      throw new ApiRequestError(409, 'This room already has a bed with that number. Use a different bed number (e.g. B1, B2, B3).');
    }
    throw new ApiRequestError(400, res.error.message || 'Failed to create bed');
  }
  return {
    data: {
      bed: {
        _id: res.data.id,
        id: res.data.id,
        roomId: res.data.room_id,
        bedNumber: res.data.bed_number,
        basePrice: res.data.base_price ?? 0,
      },
    },
  };
};

const updateBed = async (id: string, payload: any): Promise<ApiResponse> => {
  const current = requireAuthUser();
  if (!['super_admin', 'hostel_admin'].includes(current.role)) {
    throw new ApiRequestError(403, 'Access denied');
  }
  const bedRes = await supabase.from('beds').select('room_id').eq('id', id).single();
  throwIfError(bedRes.error, 'Bed not found');
  const roomRes = await supabase.from('rooms').select('hostel_id').eq('id', bedRes.data.room_id).single();
  if (current.role === 'hostel_admin' && roomRes.data.hostel_id !== current.hostelId) {
    throw new ApiRequestError(403, 'Access denied');
  }
  const updates: any = { updated_at: nowIso() };
  if (payload?.basePrice != null) updates.base_price = Number(payload.basePrice);
  const res = await supabase.from('beds').update(updates).eq('id', id).select('*').single();
  throwIfError(res.error, 'Failed to update bed');
  return { data: { bed: { _id: res.data.id, basePrice: res.data.base_price } } };
};

const assignBed = async (bedId: string, payload: any): Promise<ApiResponse> => {
  const current = requireAuthUser();
  if (!['super_admin', 'hostel_admin'].includes(current.role)) {
    throw new ApiRequestError(403, 'Access denied');
  }
  const { assigneeName, price } = payload || {};
  const name = typeof assigneeName === 'string' ? assigneeName.trim() : '';
  if (!name || price == null) {
    throw new ApiRequestError(400, 'Assignee name and price are required');
  }
  const bedRes = await supabase.from('beds').select('room_id, resident_id').eq('id', bedId).single();
  throwIfError(bedRes.error, 'Bed not found');
  const roomRes = await supabase.from('rooms').select('hostel_id').eq('id', bedRes.data.room_id).single();
  if (current.role === 'hostel_admin' && roomRes.data.hostel_id !== current.hostelId) {
    throw new ApiRequestError(403, 'Access denied');
  }
  await supabase
    .from('bed_assignments')
    .update({ ended_at: nowIso(), updated_at: nowIso() })
    .eq('bed_id', bedId)
    .is('ended_at', null);
  const assignRes = await supabase
    .from('bed_assignments')
    .insert({
      bed_id: bedId,
      resident_id: null,
      assignee_name: name,
      price: Number(price),
      assigned_by: current.id,
      assigned_at: nowIso(),
      created_at: nowIso(),
      updated_at: nowIso(),
    })
    .select('*')
    .single();
  throwIfError(assignRes.error, 'Failed to create assignment');
  await supabase
    .from('beds')
    .update({ resident_id: null, is_occupied: true, updated_at: nowIso() })
    .eq('id', bedId);
  return { data: { message: 'Bed assigned', assignment: { id: assignRes.data.id, price: assignRes.data.price, assigneeName: name } } };
};

const unassignBed = async (bedId: string): Promise<ApiResponse> => {
  const current = requireAuthUser();
  if (!['super_admin', 'hostel_admin'].includes(current.role)) {
    throw new ApiRequestError(403, 'Access denied');
  }
  const bedRes = await supabase.from('beds').select('room_id, resident_id').eq('id', bedId).single();
  throwIfError(bedRes.error, 'Bed not found');
  const roomRes = await supabase.from('rooms').select('hostel_id').eq('id', bedRes.data.room_id).single();
  if (current.role === 'hostel_admin' && roomRes.data.hostel_id !== current.hostelId) {
    throw new ApiRequestError(403, 'Access denied');
  }
  const residentId = bedRes.data.resident_id;
  await supabase
    .from('bed_assignments')
    .update({ ended_at: nowIso(), updated_at: nowIso() })
    .eq('bed_id', bedId)
    .is('ended_at', null);
  await supabase.from('beds').update({ resident_id: null, is_occupied: false, updated_at: nowIso() }).eq('id', bedId);
  if (residentId) {
    await supabase.from('profiles').update({ room_id: null, bed_id: null, updated_at: nowIso() }).eq('id', residentId);
  }
  return { data: { message: 'Bed unassigned' } };
};

const updateBedAssignmentPrice = async (assignmentId: string, payload: any): Promise<ApiResponse> => {
  const current = requireAuthUser();
  if (!['super_admin', 'hostel_admin'].includes(current.role)) {
    throw new ApiRequestError(403, 'Access denied');
  }
  const price = payload?.price;
  if (price == null) {
    throw new ApiRequestError(400, 'price is required');
  }
  const assignRes = await supabase.from('bed_assignments').select('bed_id').eq('id', assignmentId).is('ended_at', null).single();
  throwIfError(assignRes.error, 'Assignment not found');
  const bedRes = await supabase.from('beds').select('room_id').eq('id', assignRes.data.bed_id).single();
  const roomRes = await supabase.from('rooms').select('hostel_id').eq('id', bedRes.data.room_id).single();
  if (current.role === 'hostel_admin' && roomRes.data.hostel_id !== current.hostelId) {
    throw new ApiRequestError(403, 'Access denied');
  }
  const res = await supabase
    .from('bed_assignments')
    .update({ price: Number(price), updated_at: nowIso() })
    .eq('id', assignmentId)
    .select('*')
    .single();
  throwIfError(res.error, 'Failed to update price');
  return { data: { assignment: { id: res.data.id, price: res.data.price } } };
};

const getMyRoom = async (): Promise<ApiResponse> => {
  const current = requireAuthUser();
  if (current.role !== 'resident') {
    throw new ApiRequestError(403, 'Access denied');
  }

  const profileRes = await supabase.from('profiles').select('room_id').eq('id', current.id).single();
  throwIfError(profileRes.error, 'Failed to load resident profile');

  const roomId = profileRes.data?.room_id;
  if (!roomId) {
    return { data: { room: null, message: 'No room assigned' } };
  }

  const roomRes = await supabase.from('rooms').select('*').eq('id', roomId).single();
  throwIfError(roomRes.error, 'Room not found');
  const roomRow = roomRes.data!;

  const hostelRes = await supabase
    .from('hostels')
    .select('id, name, address')
    .eq('id', roomRow.hostel_id)
    .single();
  throwIfError(hostelRes.error, 'Hostel not found');
  const hostelRow = hostelRes.data!;

  const bedsRes = await supabase.from('beds').select('*').eq('room_id', roomId);
  throwIfError(bedsRes.error, 'Failed to load beds');

  const room = {
    _id: roomRow.id,
    roomNumber: roomRow.room_number,
    floor: roomRow.floor,
    rent: roomRow.rent,
    hostelId: {
      _id: hostelRow.id,
      name: hostelRow.name,
      address: hostelRow.address,
    },
  };

  const beds = (bedsRes.data || []).map((b: any) => ({
    _id: b.id,
    roomId: b.room_id,
    bedNumber: b.bed_number,
    residentId: b.resident_id,
    isOccupied: b.is_occupied,
    isActive: b.is_active,
  }));

  return { data: { room, beds } };
};

const getComplaints = async (): Promise<ApiResponse> => {
  const current = requireAuthUser();
  let query = supabase.from('complaints').select('*');

  if (current.role === 'resident') {
    query = query.eq('resident_id', current.id);
  } else if (current.role === 'hostel_admin') {
    query = query.eq('hostel_id', current.hostelId);
  } else if (current.role !== 'super_admin') {
    throw new ApiRequestError(403, 'Access denied');
  }

  const res = await query.order('created_at', { ascending: false });
  throwIfError(res.error, 'Failed to load complaints');

  const complaints = res.data || [];
  const residentIds = complaints.map((c: any) => c.resident_id).filter(Boolean);
  const hostelIds = complaints.map((c: any) => c.hostel_id).filter(Boolean);

  const [residentsRes, hostelsRes] = await Promise.all([
    residentIds.length
      ? supabase.from('profiles').select('id, name, email, phone').in('id', residentIds)
      : Promise.resolve({ data: [], error: null }),
    hostelIds.length
      ? supabase.from('hostels').select('id, name').in('id', hostelIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  throwIfError(residentsRes.error, 'Failed to load complaint residents');
  throwIfError(hostelsRes.error, 'Failed to load complaint hostels');

  const residentMap = new Map((residentsRes.data || []).map((r: any) => [r.id, r]));
  const hostelMap = new Map((hostelsRes.data || []).map((h: any) => [h.id, h]));

  return {
    data: {
      complaints: complaints.map((c: any) => ({
        _id: c.id,
        residentId: c.resident_id
          ? {
              _id: c.resident_id,
              name: residentMap.get(c.resident_id)?.name,
              email: residentMap.get(c.resident_id)?.email,
              phone: residentMap.get(c.resident_id)?.phone,
            }
          : null,
        hostelId: c.hostel_id ? { _id: c.hostel_id, name: hostelMap.get(c.hostel_id)?.name } : null,
        title: c.title,
        description: c.description,
        category: c.category,
        status: c.status,
        response: c.response,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
    },
  };
};

const createComplaint = async (payload: any): Promise<ApiResponse> => {
  const current = requireAuthUser();
  if (current.role !== 'resident') {
    throw new ApiRequestError(403, 'Only residents can submit complaints');
  }
  if (!payload?.title || !payload?.description) {
    throw new ApiRequestError(400, 'Title and description are required');
  }

  const res = await supabase
    .from('complaints')
    .insert({
      resident_id: current.id,
      hostel_id: current.hostelId,
      title: payload.title,
      description: payload.description,
      category: payload.category || 'general',
      status: 'pending',
      created_at: nowIso(),
      updated_at: nowIso(),
    })
    .select('*')
    .single();
  throwIfError(res.error, 'Failed to create complaint');

  return { data: { complaint: res.data } };
};

const updateComplaintStatus = async (id: string, payload: any): Promise<ApiResponse> => {
  const current = requireAuthUser();
  if (!['super_admin', 'hostel_admin'].includes(current.role)) {
    throw new ApiRequestError(403, 'Access denied');
  }
  if (!['pending', 'in_progress', 'resolved', 'rejected'].includes(payload?.status)) {
    throw new ApiRequestError(400, 'Invalid status');
  }

  const existing = await supabase.from('complaints').select('*').eq('id', id).single();
  throwIfError(existing.error, 'Complaint not found');

  if (current.role === 'hostel_admin' && existing.data.hostel_id !== current.hostelId) {
    throw new ApiRequestError(403, 'Access denied');
  }

  const res = await supabase
    .from('complaints')
    .update({ status: payload.status, updated_at: nowIso() })
    .eq('id', id)
    .select('*')
    .single();
  throwIfError(res.error, 'Failed to update complaint status');

  return { data: { message: 'Complaint status updated', complaint: res.data } };
};

const getPayments = async (): Promise<ApiResponse> => {
  const current = requireAuthUser();
  let query = supabase.from('payments').select('*');

  if (current.role === 'resident') {
    query = query.eq('resident_id', current.id);
  } else if (current.role === 'hostel_admin') {
    query = query.eq('hostel_id', current.hostelId);
  } else if (current.role !== 'super_admin') {
    throw new ApiRequestError(403, 'Access denied');
  }

  const res = await query.order('created_at', { ascending: false });
  throwIfError(res.error, 'Failed to load payments');

  const payments = res.data || [];
  const residentIds = payments.map((p: any) => p.resident_id).filter(Boolean);
  const hostelIds = payments.map((p: any) => p.hostel_id).filter(Boolean);

  const [residentsRes, hostelsRes] = await Promise.all([
    residentIds.length
      ? supabase.from('profiles').select('id, name, email, phone').in('id', residentIds)
      : Promise.resolve({ data: [], error: null }),
    hostelIds.length
      ? supabase.from('hostels').select('id, name').in('id', hostelIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  throwIfError(residentsRes.error, 'Failed to load payment residents');
  throwIfError(hostelsRes.error, 'Failed to load payment hostels');

  const residentMap = new Map((residentsRes.data || []).map((r: any) => [r.id, r]));
  const hostelMap = new Map((hostelsRes.data || []).map((h: any) => [h.id, h]));

  return {
    data: {
      payments: payments.map((p: any) => ({
        _id: p.id,
        residentId: p.resident_id
          ? {
              _id: p.resident_id,
              name: residentMap.get(p.resident_id)?.name,
              email: residentMap.get(p.resident_id)?.email,
              phone: residentMap.get(p.resident_id)?.phone,
            }
          : null,
        hostelId: p.hostel_id ? { _id: p.hostel_id, name: hostelMap.get(p.hostel_id)?.name } : null,
        amount: p.amount,
        method: p.method,
        transactionId: p.transaction_id,
        status: p.status,
        month: p.month,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })),
    },
  };
};

const getTasks = async (): Promise<ApiResponse> => {
  const current = requireAuthUser();
  let query = supabase.from('tasks').select('*');

  if (current.role === 'staff') {
    query = query.eq('assigned_to', current.id);
  } else if (current.role === 'hostel_admin') {
    query = query.eq('hostel_id', current.hostelId);
  } else if (current.role !== 'super_admin') {
    throw new ApiRequestError(403, 'Access denied');
  }

  const res = await query.order('created_at', { ascending: false });
  throwIfError(res.error, 'Failed to load tasks');

  const tasks = res.data || [];
  const assignedIds = tasks.map((t: any) => t.assigned_to).filter(Boolean);
  const hostelIds = tasks.map((t: any) => t.hostel_id).filter(Boolean);

  const [staffRes, hostelsRes] = await Promise.all([
    assignedIds.length
      ? supabase.from('profiles').select('id, name, email, phone').in('id', assignedIds)
      : Promise.resolve({ data: [], error: null }),
    hostelIds.length
      ? supabase.from('hostels').select('id, name').in('id', hostelIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  throwIfError(staffRes.error, 'Failed to load task assignees');
  throwIfError(hostelsRes.error, 'Failed to load task hostels');

  const staffMap = new Map((staffRes.data || []).map((u: any) => [u.id, u]));
  const hostelMap = new Map((hostelsRes.data || []).map((h: any) => [h.id, h]));

  return {
    data: {
      tasks: tasks.map((t: any) => ({
        _id: t.id,
        title: t.title,
        description: t.description,
        assignedTo: t.assigned_to
          ? {
              _id: t.assigned_to,
              name: staffMap.get(t.assigned_to)?.name,
              email: staffMap.get(t.assigned_to)?.email,
              phone: staffMap.get(t.assigned_to)?.phone,
            }
          : null,
        hostelId: t.hostel_id ? { _id: t.hostel_id, name: hostelMap.get(t.hostel_id)?.name } : null,
        priority: t.priority,
        type: t.type,
        status: t.status,
        createdBy: t.created_by,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      })),
    },
  };
};

const updateTaskStatus = async (id: string, payload: any): Promise<ApiResponse> => {
  const current = requireAuthUser();
  if (!['pending', 'in_progress', 'completed', 'cancelled'].includes(payload?.status)) {
    throw new ApiRequestError(400, 'Invalid status');
  }

  const existing = await supabase.from('tasks').select('*').eq('id', id).single();
  throwIfError(existing.error, 'Task not found');

  if (current.role === 'staff' && existing.data.assigned_to !== current.id) {
    throw new ApiRequestError(403, 'Access denied');
  }
  if (current.role === 'hostel_admin' && existing.data.hostel_id !== current.hostelId) {
    throw new ApiRequestError(403, 'Access denied');
  }
  if (!['staff', 'hostel_admin', 'super_admin'].includes(current.role)) {
    throw new ApiRequestError(403, 'Access denied');
  }

  const res = await supabase
    .from('tasks')
    .update({ status: payload.status, updated_at: nowIso() })
    .eq('id', id)
    .select('*')
    .single();
  throwIfError(res.error, 'Failed to update task status');

  return { data: { message: 'Task status updated', task: res.data } };
};

const getNotices = async (): Promise<ApiResponse> => {
  const current = requireAuthUser();
  let query = supabase.from('notices').select('*');
  if (['resident', 'staff', 'hostel_admin'].includes(current.role)) {
    query = query.eq('hostel_id', current.hostelId);
  }

  const res = await query.order('created_at', { ascending: false });
  throwIfError(res.error, 'Failed to load notices');

  return {
    data: {
      notices: (res.data || []).map((n: any) => ({
        _id: n.id,
        title: n.title,
        content: n.content,
        hostelId: n.hostel_id,
        isImportant: n.is_important,
        createdBy: n.created_by,
        createdAt: n.created_at,
      })),
    },
  };
};

const dispatch = async (method: Method, path: string, payload?: any): Promise<ApiResponse> => {
  if (method === 'POST' && path === '/auth/login') return authLogin(payload);
  if (method === 'POST' && path === '/auth/signup') return authSignup(payload);

  if (method === 'GET' && path === '/users') return getUsers();
  if (method === 'GET' && path === '/users/pending') return getPendingUsers();
  if (method === 'PATCH' && path.startsWith('/users/')) {
    const id = getPathParam(path, /^\/users\/([^/]+)\/status$/);
    if (!id) throw new ApiRequestError(404, 'Endpoint not found');
    return updateUserStatus(id, payload);
  }

  if (method === 'GET' && path === '/hostels') return getHostels();
  if (method === 'POST' && path === '/hostels') return createHostel(payload);
  if (method === 'GET' && path.startsWith('/units') && !path.match(/^\/units\/[^/]+/)) {
    const hostelId = getQueryParam(path, 'hostelId');
    if (!hostelId) throw new ApiRequestError(400, 'hostelId is required');
    return getUnits(hostelId);
  }
  if (method === 'POST' && path === '/units') return createUnit(payload);
  if (method === 'PATCH' && path.match(/^\/units\/[^/]+$/)) {
    const id = getPathParam(path, /^\/units\/([^/]+)$/);
    if (!id) throw new ApiRequestError(404, 'Not found');
    return updateUnit(id, payload);
  }
  if (method === 'DELETE' && path.match(/^\/units\/[^/]+$/)) {
    const id = getPathParam(path, /^\/units\/([^/]+)$/);
    if (!id) throw new ApiRequestError(404, 'Not found');
    return deleteUnit(id);
  }
  if (method === 'GET' && path.match(/^\/rooms\/[^/]+\/beds$/)) {
    const roomId = getPathParam(path, /^\/rooms\/([^/]+)\/beds$/);
    if (!roomId) throw new ApiRequestError(404, 'Not found');
    return getBeds(roomId);
  }
  if (method === 'GET' && path.startsWith('/rooms') && path !== '/rooms/my-room') {
    const unitId = getQueryParam(path, 'unitId');
    const hostelId = getQueryParam(path, 'hostelId');
    return getRooms({ unitId: unitId || undefined, hostelId: hostelId || undefined });
  }
  if (method === 'POST' && path === '/rooms') return createRoom(payload);
  if (method === 'GET' && path === '/rooms/my-room') return getMyRoom();
  if (method === 'POST' && path === '/beds') return createBed(payload);
  if (method === 'PATCH' && path.match(/^\/beds\/[^/]+$/) && !path.includes('/assign') && !path.includes('/unassign')) {
    const id = getPathParam(path, /^\/beds\/([^/]+)$/);
    if (!id) throw new ApiRequestError(404, 'Not found');
    return updateBed(id, payload);
  }
  if (method === 'POST' && path.match(/^\/beds\/[^/]+\/assign$/)) {
    const bedId = getPathParam(path, /^\/beds\/([^/]+)\/assign$/);
    if (!bedId) throw new ApiRequestError(404, 'Not found');
    return assignBed(bedId, payload);
  }
  if (method === 'PATCH' && path.match(/^\/beds\/[^/]+\/unassign$/)) {
    const bedId = getPathParam(path, /^\/beds\/([^/]+)\/unassign$/);
    if (!bedId) throw new ApiRequestError(404, 'Not found');
    return unassignBed(bedId);
  }
  if (method === 'PATCH' && path.startsWith('/bed-assignments/')) {
    const id = getPathParam(path, /^\/bed-assignments\/([^/]+)$/);
    if (!id) throw new ApiRequestError(404, 'Not found');
    return updateBedAssignmentPrice(id, payload);
  }

  if (method === 'GET' && path === '/complaints') return getComplaints();
  if (method === 'POST' && path === '/complaints') return createComplaint(payload);
  if (method === 'PATCH' && path.startsWith('/complaints/')) {
    const id = getPathParam(path, /^\/complaints\/([^/]+)\/status$/);
    if (!id) throw new ApiRequestError(404, 'Endpoint not found');
    return updateComplaintStatus(id, payload);
  }

  if (method === 'GET' && path === '/payments') return getPayments();
  if (method === 'GET' && path === '/tasks') return getTasks();
  if (method === 'PATCH' && path.startsWith('/tasks/')) {
    const id = getPathParam(path, /^\/tasks\/([^/]+)\/status$/);
    if (!id) throw new ApiRequestError(404, 'Endpoint not found');
    return updateTaskStatus(id, payload);
  }

  if (method === 'GET' && path === '/notices') return getNotices();

  throw new ApiRequestError(404, `Unsupported endpoint: ${method} ${path}`);
};

const api = {
  get: (path: string) => dispatch('GET', path),
  post: (path: string, payload?: any) => dispatch('POST', path, payload),
  patch: (path: string, payload?: any) => dispatch('PATCH', path, payload),
};

export default api;
