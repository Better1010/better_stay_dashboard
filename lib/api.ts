import { supabase } from '@/lib/supabase';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

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
  const { email, password } = payload || {};
  if (!email || !password) {
    throw new ApiRequestError(400, 'Email and password are required');
  }

  const signIn = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (signIn.error || !signIn.data.user || !signIn.data.session) {
    throw new ApiRequestError(401, signIn.error?.message || 'Invalid credentials');
  }

  const u = signIn.data.user;
  const user = {
    id: u.id,
    name: u.email ?? 'Admin',
    email: u.email ?? '',
    phone: '',
    role: 'super_admin' as const,
    hostelId: undefined as string | undefined,
    mustChangePassword: false,
  };

  return {
    data: {
      message: 'Login successful',
      token: signIn.data.session.access_token,
      user,
      redirectPath: '/super-admin',
    },
  };
};

const authSignup = async (_payload: any): Promise<ApiResponse> => {
  throw new ApiRequestError(400, 'Sign up is disabled. Create users in Supabase Dashboard → Authentication → Users.');
};

const getUsers = async (): Promise<ApiResponse> => {
  requireAuthUser();
  return { data: { users: [] } };
};

const getPendingUsers = async (): Promise<ApiResponse> => {
  requireAuthUser();
  return { data: { users: [] } };
};

const getRegisteredUsers = async (): Promise<ApiResponse> => {
  requireAuthUser();
  const res = await supabase.from('registered_users').select('*').order('created_at', { ascending: false });
  throwIfError(res.error, 'Failed to load registered users');
  const users = (res.data || []).map((u: any) => ({
    id: u.id,
    name: u.name,
    mobileNumber: u.mobile_number ?? '',
    nidFrontUrl: u.nid_picture_front_url,
    nidBackUrl: u.nid_picture_back_url,
    createdAt: u.created_at,
  }));
  return { data: { users } };
};

const createRegisteredUser = async (payload: any): Promise<ApiResponse> => {
  requireAuthUser();
  const name = payload?.name ? String(payload.name).trim() : '';
  const mobileNumber = payload?.mobileNumber ? String(payload.mobileNumber).trim() : '';
  const nidFrontUrl = payload?.nidFrontUrl ? String(payload.nidFrontUrl).trim() : '';
  const nidBackUrl = payload?.nidBackUrl ? String(payload.nidBackUrl).trim() : '';
  if (!name) throw new ApiRequestError(400, 'User name is required');
  if (!nidFrontUrl || !nidBackUrl) throw new ApiRequestError(400, 'NID front and back pictures are required');
  const res = await supabase
    .from('registered_users')
    .insert({
      name,
      mobile_number: mobileNumber || null,
      nid_picture_front_url: nidFrontUrl,
      nid_picture_back_url: nidBackUrl,
      created_at: nowIso(),
      updated_at: nowIso(),
    })
    .select('*')
    .single();
  throwIfError(res.error, 'Failed to create registered user');
  return {
    data: {
      user: {
        id: res.data.id,
        name: res.data.name,
        mobileNumber: res.data.mobile_number ?? '',
        nidFrontUrl: res.data.nid_picture_front_url,
        nidBackUrl: res.data.nid_picture_back_url,
        createdAt: res.data.created_at,
      },
    },
  };
};

const updateUserStatus = async (_id: string, _payload: any): Promise<ApiResponse> => {
  requireAuthUser();
  throw new ApiRequestError(400, 'User management is disabled. Manage users in Supabase Dashboard.');
};

const getHostels = async (): Promise<ApiResponse> => {
  requireAuthUser();
  const res = await supabase.from('hostels').select('*').order('created_at', { ascending: false });
  throwIfError(res.error, 'Failed to load hostels');

  const hostelIds = (res.data || []).map((h: any) => h.id as string);

  let roomCounts: Record<string, number> = {};
  let bedCounts: Record<string, number> = {};

  if (hostelIds.length > 0) {
    const roomsRes = await supabase.from('rooms').select('id, hostel_id').in('hostel_id', hostelIds);
    if (!roomsRes.error && roomsRes.data) {
      for (const r of roomsRes.data) {
        roomCounts[r.hostel_id] = (roomCounts[r.hostel_id] || 0) + 1;
      }
      const roomIds = roomsRes.data.map((r: any) => r.id as string);
      if (roomIds.length > 0) {
        const bedsRes = await supabase.from('beds').select('id, room_id').in('room_id', roomIds);
        if (!bedsRes.error && bedsRes.data) {
          const roomToHostel: Record<string, string> = {};
          for (const r of roomsRes.data) roomToHostel[r.id] = r.hostel_id;
          for (const b of bedsRes.data) {
            const hId = roomToHostel[b.room_id];
            if (hId) bedCounts[hId] = (bedCounts[hId] || 0) + 1;
          }
        }
      }
    }
  }

  const hostels = (res.data || []).map((h: any) => ({
    _id: h.id,
    ...h,
    adminId: h.admin_id,
    total_rooms: roomCounts[h.id] || 0,
    total_beds: bedCounts[h.id] || 0,
  }));
  return { data: { hostels } };
};

const deleteHostel = async (id: string): Promise<ApiResponse> => {
  requireAuthUser();
  const existing = await supabase.from('hostels').select('id').eq('id', id).single();
  throwIfError(existing.error, 'Building not found');
  if (!existing.data) throw new ApiRequestError(404, 'Building not found');
  const res = await supabase.from('hostels').delete().eq('id', id);
  throwIfError(res.error, 'Failed to delete building');
  return { data: { message: 'Building deleted' } };
};

const createHostel = async (payload: any): Promise<ApiResponse> => {
  requireAuthUser();
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
  requireAuthUser();
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
  requireAuthUser();
  const { hostelId, unitNumber, floor } = payload || {};
  if (!hostelId || !unitNumber || floor == null) {
    throw new ApiRequestError(400, 'hostelId, unitNumber and floor are required');
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
  requireAuthUser();
  const existing = await supabase.from('units').select('hostel_id').eq('id', id).single();
  throwIfError(existing.error, 'Unit not found');
  if (!existing.data) throw new ApiRequestError(404, 'Unit not found');
  const updates: any = { updated_at: nowIso() };
  if (payload?.unitNumber != null) updates.unit_number = String(payload.unitNumber).trim();
  if (payload?.floor != null) updates.floor = Number(payload.floor);
  const res = await supabase.from('units').update(updates).eq('id', id).select('*').single();
  throwIfError(res.error, 'Failed to update unit');
  return { data: { unit: { _id: res.data.id, ...res.data, hostelId: res.data.hostel_id, unitNumber: res.data.unit_number } } };
};

const deleteUnit = async (id: string): Promise<ApiResponse> => {
  requireAuthUser();
  const existing = await supabase.from('units').select('hostel_id').eq('id', id).single();
  throwIfError(existing.error, 'Unit not found');
  if (!existing.data) throw new ApiRequestError(404, 'Unit not found');
  const res = await supabase.from('units').delete().eq('id', id);
  throwIfError(res.error, 'Failed to delete unit');
  return { data: { message: 'Unit deleted' } };
};

const getRooms = async (queryParams?: { unitId?: string; hostelId?: string }): Promise<ApiResponse> => {
  requireAuthUser();
  let query = supabase.from('rooms').select('*');
  if (queryParams?.hostelId) {
    query = query.eq('hostel_id', queryParams.hostelId);
  }
  if (queryParams?.unitId) {
    query = query.eq('unit_id', queryParams.unitId);
  }

  const res = await query.order('floor', { ascending: true }).order('room_number', { ascending: true });
  throwIfError(res.error, 'Failed to load rooms');

  const roomRows = res.data || [];
  const roomIds = roomRows.map((r: any) => r.id);
  let bedCountByRoom: Record<string, number> = {};
  if (roomIds.length > 0) {
    const bedsRes = await supabase.from('beds').select('room_id').in('room_id', roomIds);
    for (const row of bedsRes.data || []) {
      const rid = row.room_id;
      bedCountByRoom[rid] = (bedCountByRoom[rid] || 0) + 1;
    }
  }

  const rooms = roomRows.map((r: any) => ({
    _id: r.id,
    id: r.id,
    hostelId: r.hostel_id,
    unitId: r.unit_id,
    roomNumber: r.room_number,
    floor: r.floor,
    totalBeds: r.total_beds,
    bedCount: bedCountByRoom[r.id] ?? 0,
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
  requireAuthUser();
  const { unitId, hostelId, roomNumber, floor, totalBeds, rent } = payload || {};
  if (!hostelId || !roomNumber) {
    throw new ApiRequestError(400, 'hostelId and roomNumber are required');
  }
  const res = await supabase
    .from('rooms')
    .insert({
      hostel_id: hostelId,
      unit_id: unitId || null,
      room_number: String(roomNumber).trim(),
      floor: floor != null ? Number(floor) : 0,
      total_beds: totalBeds != null ? Number(totalBeds) : 0,
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

const updateRoom = async (id: string, payload: any): Promise<ApiResponse> => {
  requireAuthUser();
  const existing = await supabase.from('rooms').select('*').eq('id', id).single();
  throwIfError(existing.error, 'Room not found');
  if (!existing.data) throw new ApiRequestError(404, 'Room not found');
  const updates: any = { updated_at: nowIso() };
  if (payload?.roomNumber != null) updates.room_number = String(payload.roomNumber).trim();
  if (payload?.floor != null) updates.floor = Number(payload.floor);
  if (payload?.totalBeds != null) updates.total_beds = Number(payload.totalBeds);
  if (payload?.rent != null) updates.rent = Number(payload.rent);
  const res = await supabase.from('rooms').update(updates).eq('id', id).select('*').single();
  if (res.error) {
    if (res.error.code === '23505') {
      throw new ApiRequestError(409, 'A room with that number already exists in this building.');
    }
    throw new ApiRequestError(400, res.error.message || 'Failed to update room');
  }
  return { data: { room: { _id: res.data.id, id: res.data.id, roomNumber: res.data.room_number, floor: res.data.floor, totalBeds: res.data.total_beds, rent: res.data.rent } } };
};

const getBeds = async (roomId: string): Promise<ApiResponse> => {
  requireAuthUser();
  const roomRes = await supabase.from('rooms').select('hostel_id').eq('id', roomId).single();
  throwIfError(roomRes.error, 'Room not found');
  if (!roomRes.data) throw new ApiRequestError(404, 'Room not found');
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
  const registeredUserIds = (assignmentsRes.data || [])
    .map((a: any) => a.registered_user_id)
    .filter((id: any): id is string => Boolean(id));
  const registeredUsersById = new Map<string, any>();
  if (registeredUserIds.length > 0) {
    const registeredRes = await supabase
      .from('registered_users')
      .select('id, name, mobile_number, nid_picture_front_url, nid_picture_back_url')
      .in('id', registeredUserIds);
    for (const u of registeredRes.data || []) {
      registeredUsersById.set(u.id, u);
    }
  }
  const beds = (res.data || []).map((b: any) => {
    const assignment = assignments.get(b.id);
    const registeredUser = assignment?.registered_user_id ? registeredUsersById.get(assignment.registered_user_id) : null;
    const assigneeName = assignment?.assignee_name ?? registeredUser?.name ?? null;
    return {
      _id: b.id,
      id: b.id,
      roomId: b.room_id,
      bedNumber: b.bed_number,
      basePrice: b.base_price ?? 0,
      pictureUrl: b.picture_url ?? null,
      residentId: b.resident_id,
      assignmentPrice: assignment?.price ?? null,
      registeredUserId: assignment?.registered_user_id ?? null,
      assigneeName: assigneeName || null,
      assigneeMobile: assignment?.mobile_number ?? registeredUser?.mobile_number ?? null,
      assigneeNidFrontUrl: assignment?.nid_picture_front_url ?? registeredUser?.nid_picture_front_url ?? null,
      assigneeNidBackUrl: assignment?.nid_picture_back_url ?? registeredUser?.nid_picture_back_url ?? null,
      assignedAt: assignment?.assigned_at ?? null,
      resident: b.resident_id ? { _id: b.resident_id, name: assigneeName ?? '', email: '', phone: '' } : (assigneeName ? { _id: null, name: assigneeName, email: '', phone: '' } : null),
      isOccupied: b.is_occupied,
      isActive: b.is_active,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    };
  });
  return { data: { beds } };
};

const createBed = async (payload: any): Promise<ApiResponse> => {
  requireAuthUser();
  const { roomId, bedNumber, basePrice } = payload || {};
  if (!roomId || !bedNumber) {
    throw new ApiRequestError(400, 'roomId and bedNumber are required');
  }
  const roomRes = await supabase.from('rooms').select('hostel_id').eq('id', roomId).single();
  throwIfError(roomRes.error, 'Room not found');
  if (!roomRes.data) throw new ApiRequestError(404, 'Room not found');
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
  requireAuthUser();
  const bedRes = await supabase.from('beds').select('room_id').eq('id', id).single();
  throwIfError(bedRes.error, 'Bed not found');
  if (!bedRes.data) throw new ApiRequestError(404, 'Bed not found');
  const roomRes = await supabase.from('rooms').select('hostel_id').eq('id', bedRes.data.room_id).single();
  throwIfError(roomRes.error, 'Room not found');
  if (!roomRes.data) throw new ApiRequestError(404, 'Room not found');
  const updates: any = { updated_at: nowIso() };
  if (payload?.basePrice != null) updates.base_price = Number(payload.basePrice);
  if (payload?.bedNumber != null) updates.bed_number = String(payload.bedNumber).trim();
  if (payload?.pictureUrl !== undefined) updates.picture_url = payload.pictureUrl || null;
  const res = await supabase.from('beds').update(updates).eq('id', id).select('*').single();
  if (res.error) {
    if (res.error.code === '23505') {
      throw new ApiRequestError(409, 'A bed with that number already exists in this room.');
    }
    throw new ApiRequestError(400, res.error.message || 'Failed to update bed');
  }

  if (payload?.assigneeName !== undefined || payload?.assignmentPrice !== undefined) {
    const existingAssign = await supabase.from('bed_assignments').select('*').eq('bed_id', id).is('ended_at', null).maybeSingle();
    if (existingAssign.data) {
      const assignUpdates: any = { updated_at: nowIso() };
      if (payload.assigneeName !== undefined) assignUpdates.assignee_name = payload.assigneeName || null;
      if (payload.assignmentPrice !== undefined) assignUpdates.price = Number(payload.assignmentPrice);
      await supabase.from('bed_assignments').update(assignUpdates).eq('id', existingAssign.data.id);
    }
  }

  return { data: { bed: { _id: res.data.id, id: res.data.id, bedNumber: res.data.bed_number, basePrice: res.data.base_price, pictureUrl: res.data.picture_url } } };
};

const assignBed = async (bedId: string, payload: any): Promise<ApiResponse> => {
  const current = requireAuthUser();
  const { registeredUserId, assigneeName, mobileNumber, nidFrontUrl, nidBackUrl, price } = payload || {};
  let registeredUser: any = null;
  let name = typeof assigneeName === 'string' ? assigneeName.trim() : '';
  let mobile = mobileNumber ? String(mobileNumber).trim() : null;
  let frontUrl = nidFrontUrl || null;
  let backUrl = nidBackUrl || null;

  if (registeredUserId) {
    const regRes = await supabase
      .from('registered_users')
      .select('id, name, mobile_number, nid_picture_front_url, nid_picture_back_url')
      .eq('id', registeredUserId)
      .single();
    throwIfError(regRes.error, 'Registered user not found');
    if (!regRes.data) throw new ApiRequestError(404, 'Registered user not found');
    registeredUser = regRes.data;
    name = registeredUser.name;
    mobile = registeredUser.mobile_number || null;
    frontUrl = registeredUser.nid_picture_front_url || null;
    backUrl = registeredUser.nid_picture_back_url || null;
  }

  if (!name) throw new ApiRequestError(400, 'Assignee name is required');
  if (!frontUrl || !backUrl) throw new ApiRequestError(400, 'NID front and back pictures are required');
  const bedRes = await supabase.from('beds').select('room_id, resident_id').eq('id', bedId).single();
  throwIfError(bedRes.error, 'Bed not found');
  if (!bedRes.data) throw new ApiRequestError(404, 'Bed not found');
  const roomRes = await supabase.from('rooms').select('hostel_id').eq('id', bedRes.data.room_id).single();
  throwIfError(roomRes.error, 'Room not found');
  if (!roomRes.data) throw new ApiRequestError(404, 'Room not found');
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
      registered_user_id: registeredUser?.id ?? null,
      assignee_name: name,
      mobile_number: mobile,
      nid_picture_front_url: frontUrl,
      nid_picture_back_url: backUrl,
      price: price != null ? Number(price) : 0,
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
  return { data: { message: 'Bed assigned', assignment: { id: assignRes.data.id, assigneeName: name } } };
};

const unassignBed = async (bedId: string): Promise<ApiResponse> => {
  const current = requireAuthUser();
  if (!['super_admin', 'hostel_admin'].includes(current.role)) {
    throw new ApiRequestError(403, 'Access denied');
  }
  const bedRes = await supabase.from('beds').select('room_id, resident_id').eq('id', bedId).single();
  throwIfError(bedRes.error, 'Bed not found');
  if (!bedRes.data) throw new ApiRequestError(404, 'Bed not found');
  const roomRes = await supabase.from('rooms').select('hostel_id, unit_id').eq('id', bedRes.data.room_id).single();
  throwIfError(roomRes.error, 'Room not found');
  if (!roomRes.data) throw new ApiRequestError(404, 'Room not found');
  const assignmentRes = await supabase
    .from('bed_assignments')
    .select('id, registered_user_id, assignee_name, mobile_number, nid_picture_front_url, nid_picture_back_url, assigned_at')
    .eq('bed_id', bedId)
    .is('ended_at', null)
    .maybeSingle();
  if (assignmentRes.data) {
    const a = assignmentRes.data;
    let assigneeName = a.assignee_name || 'Unknown';
    let mobileNumber = a.mobile_number || null;
    let frontUrl = a.nid_picture_front_url || null;
    let backUrl = a.nid_picture_back_url || null;
    if (a.registered_user_id) {
      const regRes = await supabase
        .from('registered_users')
        .select('name, mobile_number, nid_picture_front_url, nid_picture_back_url')
        .eq('id', a.registered_user_id)
        .maybeSingle();
      if (regRes.data) {
        assigneeName = regRes.data.name || assigneeName;
        mobileNumber = regRes.data.mobile_number || mobileNumber;
        frontUrl = regRes.data.nid_picture_front_url || frontUrl;
        backUrl = regRes.data.nid_picture_back_url || backUrl;
      }
    }
    const assignedAt = a.assigned_at ? new Date(a.assigned_at) : new Date();
    const now = new Date();
    let monthsStayed = 0;
    if (assignedAt.getTime() <= now.getTime()) {
      monthsStayed = Math.max(0, (now.getFullYear() - assignedAt.getFullYear()) * 12 + (now.getMonth() - assignedAt.getMonth()));
    }
    await supabase.from('client_history').insert({
      assignee_name: assigneeName,
      mobile_number: mobileNumber,
      nid_picture_front_url: frontUrl,
      nid_picture_back_url: backUrl,
      hostel_id: roomRes.data.hostel_id,
      unit_id: roomRes.data.unit_id || null,
      room_id: bedRes.data.room_id,
      bed_id: bedId,
      assigned_at: a.assigned_at,
      unassigned_at: nowIso(),
      months_stayed: monthsStayed,
      total_payment: 0,
      created_at: nowIso(),
    });
  }
  await supabase
    .from('bed_assignments')
    .update({ ended_at: nowIso(), updated_at: nowIso() })
    .eq('bed_id', bedId)
    .is('ended_at', null);
  await supabase.from('beds').update({ resident_id: null, is_occupied: false, updated_at: nowIso() }).eq('id', bedId);
  return { data: { message: 'Bed unassigned' } };
};

const updateBedAssignmentPrice = async (assignmentId: string, payload: any): Promise<ApiResponse> => {
  requireAuthUser();
  const price = payload?.price;
  if (price == null) {
    throw new ApiRequestError(400, 'price is required');
  }
  const assignRes = await supabase.from('bed_assignments').select('bed_id').eq('id', assignmentId).is('ended_at', null).single();
  throwIfError(assignRes.error, 'Assignment not found');
  if (!assignRes.data) throw new ApiRequestError(404, 'Assignment not found');
  const bedRes = await supabase.from('beds').select('room_id').eq('id', assignRes.data.bed_id).single();
  throwIfError(bedRes.error, 'Bed not found');
  if (!bedRes.data) throw new ApiRequestError(404, 'Bed not found');
  const roomRes = await supabase.from('rooms').select('hostel_id').eq('id', bedRes.data.room_id).single();
  throwIfError(roomRes.error, 'Room not found');
  if (!roomRes.data) throw new ApiRequestError(404, 'Room not found');
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
  const bedRes = await supabase.from('beds').select('room_id').eq('resident_id', current.id).limit(1);
  throwIfError(bedRes.error, 'Failed to load bed');
  const roomId = bedRes.data?.[0]?.room_id;
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
  requireAuthUser();
  const res = await supabase.from('complaints').select('*').order('created_at', { ascending: false });
  throwIfError(res.error, 'Failed to load complaints');

  const complaints = res.data || [];
  const hostelIds = complaints.map((c: any) => c.hostel_id).filter(Boolean);
  const hostelsRes = hostelIds.length
    ? await supabase.from('hostels').select('id, name').in('id', hostelIds)
    : { data: [], error: null };
  throwIfError(hostelsRes.error, 'Failed to load complaint hostels');
  const hostelMap = new Map((hostelsRes.data || []).map((h: any) => [h.id, h]));

  return {
    data: {
      complaints: complaints.map((c: any) => ({
        _id: c.id,
        residentId: c.resident_id ? { _id: c.resident_id, name: '', email: '', phone: '' } : null,
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
  if (!payload?.title || !payload?.description) {
    throw new ApiRequestError(400, 'Title and description are required');
  }
  if (!payload?.hostelId) {
    throw new ApiRequestError(400, 'hostelId is required');
  }

  const res = await supabase
    .from('complaints')
    .insert({
      resident_id: current.id,
      hostel_id: payload.hostelId,
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
  requireAuthUser();
  if (!['pending', 'in_progress', 'resolved', 'rejected'].includes(payload?.status)) {
    throw new ApiRequestError(400, 'Invalid status');
  }

  const existing = await supabase.from('complaints').select('*').eq('id', id).single();
  throwIfError(existing.error, 'Complaint not found');
  if (!existing.data) throw new ApiRequestError(404, 'Complaint not found');

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
  requireAuthUser();
  const res = await supabase.from('payments').select('*').order('created_at', { ascending: false });
  throwIfError(res.error, 'Failed to load payments');

  const payments = res.data || [];
  const hostelIds = payments.map((p: any) => p.hostel_id).filter(Boolean);
  const hostelsRes = hostelIds.length
    ? await supabase.from('hostels').select('id, name').in('id', hostelIds)
    : { data: [], error: null };
  throwIfError(hostelsRes.error, 'Failed to load payment hostels');
  const hostelMap = new Map((hostelsRes.data || []).map((h: any) => [h.id, h]));

  return {
    data: {
      payments: payments.map((p: any) => ({
        _id: p.id,
        residentId: p.resident_id ? { _id: p.resident_id, name: '', email: '', phone: '' } : null,
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
  requireAuthUser();
  const res = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
  throwIfError(res.error, 'Failed to load tasks');

  const tasks = res.data || [];
  const hostelIds = tasks.map((t: any) => t.hostel_id).filter(Boolean);
  const hostelsRes = hostelIds.length
    ? await supabase.from('hostels').select('id, name').in('id', hostelIds)
    : { data: [], error: null };
  throwIfError(hostelsRes.error, 'Failed to load task hostels');
  const hostelMap = new Map((hostelsRes.data || []).map((h: any) => [h.id, h]));

  return {
    data: {
      tasks: tasks.map((t: any) => ({
        _id: t.id,
        title: t.title,
        description: t.description,
        assignedTo: t.assigned_to ? { _id: t.assigned_to, name: '', email: '', phone: '' } : null,
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
  requireAuthUser();
  if (!['pending', 'in_progress', 'completed', 'cancelled'].includes(payload?.status)) {
    throw new ApiRequestError(400, 'Invalid status');
  }

  const existing = await supabase.from('tasks').select('*').eq('id', id).single();
  throwIfError(existing.error, 'Task not found');
  if (!existing.data) throw new ApiRequestError(404, 'Task not found');

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
  requireAuthUser();
  const res = await supabase.from('notices').select('*').order('created_at', { ascending: false });
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

const getAllUnits = async (): Promise<ApiResponse> => {
  requireAuthUser();
  const res = await supabase
    .from('units')
    .select('*, hostels(name)')
    .order('floor', { ascending: true })
    .order('unit_number', { ascending: true });
  throwIfError(res.error, 'Failed to load units');
  const units = (res.data || []).map((u: any) => ({
    id: u.id,
    _id: u.id,
    hostelId: u.hostel_id,
    hostelName: u.hostels?.name ?? '',
    unitNumber: u.unit_number,
    floor: u.floor,
  }));
  return { data: { units } };
};

const getExpenseCategories = async (): Promise<ApiResponse> => {
  requireAuthUser();
  const res = await supabase.from('expense_categories').select('*').order('name', { ascending: true });
  throwIfError(res.error, 'Failed to load expense categories');
  const categories = (res.data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    createdAt: c.created_at,
  }));
  return { data: { categories } };
};

const createExpenseCategory = async (payload: any): Promise<ApiResponse> => {
  requireAuthUser();
  const name = payload?.name?.trim();
  if (!name) throw new ApiRequestError(400, 'Category name is required');
  const res = await supabase
    .from('expense_categories')
    .insert({ name, created_at: nowIso() })
    .select('*')
    .single();
  throwIfError(res.error, res.error?.message || 'Failed to create category');
  return { data: { category: { id: res.data.id, name: res.data.name, createdAt: res.data.created_at } } };
};

const getExpenses = async (queryParams?: { month?: number; year?: number }): Promise<ApiResponse> => {
  requireAuthUser();
  const now = new Date();
  const month = queryParams?.month && queryParams.month >= 1 && queryParams.month <= 12 ? queryParams.month : now.getMonth() + 1;
  const year = queryParams?.year && queryParams.year >= 2000 ? queryParams.year : now.getFullYear();

  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const startDate = new Date(`${start}T00:00:00.000Z`);
  const next = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 1));
  const endExclusive = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01`;

  const res = await supabase
    .from('expenses')
    .select('*, units(unit_number, floor, hostel_id, hostels(name)), expense_categories(name)')
    .gte('expense_date', start)
    .lt('expense_date', endExclusive)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });
  throwIfError(res.error, 'Failed to load expenses');
  const expenses = (res.data || []).map((e: any) => {
    const u = e.units || {};
    const h = u.hostels || u.hostel || {};
    return {
    id: e.id,
    unitId: e.unit_id,
    hostelId: u.hostel_id ?? '',
    unitNumber: u.unit_number ?? '',
    unitFloor: u.floor ?? '',
    hostelName: (typeof h === 'object' && h !== null && 'name' in h ? h.name : '') ?? '',
    expenseName: e.expense_name,
    categoryId: e.category_id,
    categoryName: e.expense_categories?.name ?? '',
    amount: Number(e.amount),
    expenseDate: e.expense_date,
    notes: e.notes ?? '',
    createdAt: e.created_at,
  };
  });
  return { data: { expenses, month, year } };
};

const createExpense = async (payload: any): Promise<ApiResponse> => {
  requireAuthUser();
  const { unitId, expenseName, categoryId, amount, expenseDate, notes } = payload || {};
  if (!unitId || !expenseName?.trim() || !categoryId || amount == null || !expenseDate) {
    throw new ApiRequestError(400, 'Unit, description, category, amount and date are required');
  }
  const res = await supabase
    .from('expenses')
    .insert({
      unit_id: unitId,
      expense_name: String(expenseName).trim(),
      category_id: categoryId,
      amount: Number(amount),
      expense_date: expenseDate,
      notes: notes ? String(notes).trim() : null,
      created_at: nowIso(),
    })
    .select('*')
    .single();
  throwIfError(res.error, res.error?.message || 'Failed to create expense');
  return { data: { expense: { id: res.data.id, unitId: res.data.unit_id, expenseName: res.data.expense_name, categoryId: res.data.category_id, amount: Number(res.data.amount), expenseDate: res.data.expense_date, notes: res.data.notes, createdAt: res.data.created_at } } };
};

const updateExpense = async (id: string, payload: any): Promise<ApiResponse> => {
  requireAuthUser();
  const { expenseName, categoryId, amount, expenseDate, notes, unitId } = payload || {};
  const updates: Record<string, unknown> = {};
  if (expenseName !== undefined) updates.expense_name = String(expenseName).trim();
  if (categoryId !== undefined) updates.category_id = categoryId;
  if (amount !== undefined) updates.amount = Number(amount);
  if (expenseDate !== undefined) updates.expense_date = expenseDate;
  if (notes !== undefined) updates.notes = notes ? String(notes).trim() : null;
  if (unitId !== undefined) updates.unit_id = unitId;
  if (Object.keys(updates).length === 0) {
    throw new ApiRequestError(400, 'No fields to update');
  }
  const res = await supabase.from('expenses').update(updates).eq('id', id).select('*').single();
  throwIfError(res.error, res.error?.message || 'Failed to update expense');
  return { data: { expense: res.data } };
};

const deleteExpense = async (id: string): Promise<ApiResponse> => {
  requireAuthUser();
  const res = await supabase.from('expenses').delete().eq('id', id);
  throwIfError(res.error, res.error?.message || 'Failed to delete expense');
  return { data: { success: true } };
};

const getClientHistory = async (): Promise<ApiResponse> => {
  requireAuthUser();
  const res = await supabase
    .from('client_history')
    .select('*, hostels(name), units(unit_number), rooms(room_number), beds(bed_number)')
    .order('unassigned_at', { ascending: false });
  throwIfError(res.error, 'Failed to load client history');
  const list = (res.data || []).map((row: any) => ({
    id: row.id,
    assigneeName: row.assignee_name,
    mobileNumber: row.mobile_number,
    nidPictureFrontUrl: row.nid_picture_front_url,
    nidPictureBackUrl: row.nid_picture_back_url,
    buildingName: row.hostels?.name ?? '',
    unitNumber: row.units?.unit_number ?? '',
    roomNumber: row.rooms?.room_number ?? '',
    bedNumber: row.beds?.bed_number ?? '',
    assignedAt: row.assigned_at,
    unassignedAt: row.unassigned_at,
    monthsStayed: row.months_stayed ?? 0,
    totalPayment: Number(row.total_payment ?? 0),
    createdAt: row.created_at,
  }));
  return { data: { history: list } };
};

const getIncome = async (queryParams?: {
  hostelId?: string;
  unitId?: string;
  month?: number;
  year?: number;
  search?: string;
}): Promise<ApiResponse> => {
  requireAuthUser();
  const now = new Date();
  const month = queryParams?.month && queryParams.month >= 1 && queryParams.month <= 12 ? queryParams.month : now.getMonth() + 1;
  const year = queryParams?.year && queryParams.year >= 2000 ? queryParams.year : now.getFullYear();
  const search = (queryParams?.search || '').trim().toLowerCase();

  const activeAssignRes = await supabase
    .from('bed_assignments')
    .select('id, bed_id, registered_user_id, assignee_name, mobile_number')
    .is('ended_at', null);
  throwIfError(activeAssignRes.error, 'Failed to load active assignments');
  const activeAssignments = activeAssignRes.data || [];
  if (activeAssignments.length === 0) {
    return { data: { rows: [], totalIncome: 0, month, year } };
  }

  const bedIds = activeAssignments.map((a: any) => a.bed_id);
  const bedsRes = await supabase
    .from('beds')
    .select('id, bed_number, base_price, room_id')
    .in('id', bedIds);
  throwIfError(bedsRes.error, 'Failed to load beds');
  const beds = bedsRes.data || [];
  if (beds.length === 0) {
    return { data: { rows: [], totalIncome: 0, month, year } };
  }

  const roomIds = beds.map((b: any) => b.room_id);
  const roomsRes = await supabase
    .from('rooms')
    .select('id, room_number, unit_id, hostel_id')
    .in('id', roomIds);
  throwIfError(roomsRes.error, 'Failed to load rooms');
  const rooms = roomsRes.data || [];
  const roomsById = new Map(rooms.map((r: any) => [r.id, r]));

  const filteredBeds = beds.filter((b: any) => {
    const room = roomsById.get(b.room_id);
    if (!room) return false;
    if (queryParams?.hostelId && room.hostel_id !== queryParams.hostelId) return false;
    if (queryParams?.unitId && room.unit_id !== queryParams.unitId) return false;
    return true;
  });
  if (filteredBeds.length === 0) {
    return { data: { rows: [], totalIncome: 0, month, year } };
  }

  const filteredBedIds = filteredBeds.map((b: any) => b.id);
  const filteredBedIdSet = new Set(filteredBedIds);
  const assignments = activeAssignments.filter((a: any) => filteredBedIdSet.has(a.bed_id));
  const assignmentsByBedId = new Map(assignments.map((a: any) => [a.bed_id, a]));
  const registeredUserIds = assignments
    .map((a: any) => a.registered_user_id)
    .filter((id: any): id is string => Boolean(id));
  const registeredUsersById = new Map<string, any>();
  if (registeredUserIds.length > 0) {
    const registeredRes = await supabase
      .from('registered_users')
      .select('id, name, mobile_number')
      .in('id', registeredUserIds);
    throwIfError(registeredRes.error, 'Failed to load registered users');
    for (const u of registeredRes.data || []) {
      registeredUsersById.set(u.id, u);
    }
  }

  const unitIds = rooms.map((r: any) => r.unit_id).filter((id: any): id is string => Boolean(id));
  const hostelIds = rooms.map((r: any) => r.hostel_id).filter((id: any): id is string => Boolean(id));
  const [unitsRes, hostelsRes, paidRes] = await Promise.all([
    unitIds.length > 0 ? supabase.from('units').select('id, unit_number').in('id', unitIds) : Promise.resolve({ data: [], error: null } as any),
    hostelIds.length > 0 ? supabase.from('hostels').select('id, name').in('id', hostelIds) : Promise.resolve({ data: [], error: null } as any),
    supabase
      .from('income_payments')
      .select('id, bed_id, amount')
      .eq('month', month)
      .eq('year', year)
      .in('bed_id', filteredBedIds),
  ]);
  throwIfError(unitsRes.error, 'Failed to load units');
  throwIfError(hostelsRes.error, 'Failed to load hostels');
  throwIfError(paidRes.error, 'Failed to load income payments');

  const unitsById = new Map<string, any>((unitsRes.data || []).map((u: any) => [u.id, u]));
  const hostelsById = new Map<string, any>((hostelsRes.data || []).map((h: any) => [h.id, h]));
  const paidByBedId = new Map<string, any>((paidRes.data || []).map((p: any) => [p.bed_id, p]));

  const rows = filteredBeds
    .map((bed: any) => {
      const room = roomsById.get(bed.room_id);
      if (!room) return null;
      const assignment = assignmentsByBedId.get(bed.id);
      if (!assignment) return null;
      const registered = assignment.registered_user_id ? registeredUsersById.get(assignment.registered_user_id) : null;
      const assigneeName = registered?.name || assignment.assignee_name || '';
      const mobileNumber = registered?.mobile_number || assignment.mobile_number || '';
      const paid = paidByBedId.get(bed.id);
      return {
        bedId: bed.id,
        bedNumber: bed.bed_number,
        basePrice: Number(bed.base_price ?? 0),
        roomNumber: room.room_number,
        unitNumber: room.unit_id ? unitsById.get(room.unit_id)?.unit_number || '' : '',
        buildingName: hostelsById.get(room.hostel_id)?.name || '',
        assigneeName,
        mobileNumber,
        status: paid ? 'paid' : 'unpaid',
        paidAmount: paid ? Number(paid.amount) : 0,
        paymentId: paid ? paid.id : null,
      };
    })
    .filter(Boolean) as any[];

  const searchedRows = search
    ? rows.filter((row: any) =>
        row.bedNumber.toLowerCase().includes(search) ||
        row.assigneeName.toLowerCase().includes(search) ||
        row.mobileNumber.toLowerCase().includes(search)
      )
    : rows;

  const totalIncome = searchedRows.reduce((sum: number, row: any) => sum + (row.status === 'paid' ? row.paidAmount : 0), 0);
  return { data: { rows: searchedRows, totalIncome, month, year } };
};

const getPaidMonths = async (bedId: string, year: number): Promise<ApiResponse> => {
  requireAuthUser();
  if (!bedId) throw new ApiRequestError(400, 'bedId is required');
  if (!year || year < 2000) throw new ApiRequestError(400, 'Valid year is required');
  const res = await supabase
    .from('income_payments')
    .select('month')
    .eq('bed_id', bedId)
    .eq('year', year);
  throwIfError(res.error, 'Failed to load paid months');
  const months = Array.from(new Set((res.data || []).map((r: any) => Number(r.month)).filter((m: any) => m >= 1 && m <= 12))).sort((a, b) => a - b);
  return { data: { months } };
};

const payIncome = async (payload: any): Promise<ApiResponse> => {
  const current = requireAuthUser();
  const bedId = payload?.bedId ? String(payload.bedId) : '';
  const month = Number(payload?.month);
  const year = Number(payload?.year);
  const amount = Number(payload?.amount);
  if (!bedId) throw new ApiRequestError(400, 'bedId is required');
  if (!month || month < 1 || month > 12) throw new ApiRequestError(400, 'Valid month is required');
  if (!year || year < 2000) throw new ApiRequestError(400, 'Valid year is required');
  if (!Number.isFinite(amount) || amount < 0) throw new ApiRequestError(400, 'Valid amount is required');

  const activeAssignRes = await supabase
    .from('bed_assignments')
    .select('id')
    .eq('bed_id', bedId)
    .is('ended_at', null)
    .maybeSingle();
  throwIfError(activeAssignRes.error, 'Failed to verify assignment');
  if (!activeAssignRes.data) {
    throw new ApiRequestError(400, 'This bed is not currently assigned');
  }

  const upsertRes = await supabase
    .from('income_payments')
    .upsert(
      {
        bed_id: bedId,
        assignment_id: activeAssignRes.data.id,
        month,
        year,
        amount,
        paid_at: nowIso(),
        paid_by: current.id,
        created_at: nowIso(),
        updated_at: nowIso(),
      },
      { onConflict: 'bed_id,month,year' }
    )
    .select('*')
    .single();
  throwIfError(upsertRes.error, 'Failed to mark payment');
  return { data: { payment: upsertRes.data, message: 'Payment recorded' } };
};

const deleteIncomePayment = async (paymentId: string): Promise<ApiResponse> => {
  requireAuthUser();
  if (!paymentId) throw new ApiRequestError(400, 'paymentId is required');
  const res = await supabase.from('income_payments').delete().eq('id', paymentId);
  throwIfError(res.error, 'Failed to delete payment');
  return { data: { success: true } };
};

const getAnalytics = async (queryParams?: {
  hostelId?: string;
  unitId?: string;
  month?: number;
  year?: number;
  search?: string;
}): Promise<ApiResponse> => {
  requireAuthUser();
  const now = new Date();
  const month = queryParams?.month && queryParams.month >= 1 && queryParams.month <= 12 ? queryParams.month : now.getMonth() + 1;
  const year = queryParams?.year && queryParams.year >= 2000 ? queryParams.year : now.getFullYear();
  const hostelId = queryParams?.hostelId ? String(queryParams.hostelId) : undefined;
  const unitId = queryParams?.unitId ? String(queryParams.unitId) : undefined;
  const search = (queryParams?.search || '').trim().toLowerCase();

  // 1) Income (paid) for month/year (source of truth: income_payments table)
  const incomeRes = await supabase
    .from('income_payments')
    .select('id, bed_id, assignment_id, amount, paid_at')
    .eq('month', month)
    .eq('year', year);
  throwIfError(incomeRes.error, 'Failed to load income payments');

  const payments = incomeRes.data || [];
  const bedIds = Array.from(new Set(payments.map((p: any) => p.bed_id).filter(Boolean)));
  const assignmentIds = Array.from(new Set(payments.map((p: any) => p.assignment_id).filter(Boolean)));

  const bedsRes =
    bedIds.length > 0
      ? await supabase.from('beds').select('id, bed_number, base_price, room_id').in('id', bedIds)
      : { data: [] as any[], error: null };
  throwIfError(bedsRes.error, 'Failed to load beds');

  const beds = bedsRes.data || [];
  const roomIds = Array.from(new Set(beds.map((b: any) => b.room_id).filter(Boolean)));

  const roomsRes =
    roomIds.length > 0
      ? await supabase.from('rooms').select('id, room_number, unit_id, hostel_id').in('id', roomIds)
      : { data: [] as any[], error: null };
  throwIfError(roomsRes.error, 'Failed to load rooms');
  const rooms = roomsRes.data || [];

  const unitIds = Array.from(new Set(rooms.map((r: any) => r.unit_id).filter(Boolean)));
  const hostelIds = Array.from(new Set(rooms.map((r: any) => r.hostel_id).filter(Boolean)));

  const [unitsRes, hostelsRes, assignmentsRes] = await Promise.all([
    unitIds.length > 0 ? supabase.from('units').select('id, unit_number').in('id', unitIds) : Promise.resolve({ data: [], error: null } as any),
    hostelIds.length > 0 ? supabase.from('hostels').select('id, name').in('id', hostelIds) : Promise.resolve({ data: [], error: null } as any),
    assignmentIds.length > 0
      ? supabase.from('bed_assignments').select('id, assignee_name, mobile_number').in('id', assignmentIds)
      : Promise.resolve({ data: [], error: null } as any),
  ]);
  throwIfError(unitsRes.error, 'Failed to load units');
  throwIfError(hostelsRes.error, 'Failed to load hostels');
  throwIfError(assignmentsRes.error, 'Failed to load assignments');

  const unitsById = new Map<string, any>((unitsRes.data || []).map((u: any) => [u.id, u]));
  const hostelsById = new Map<string, any>((hostelsRes.data || []).map((h: any) => [h.id, h]));
  const bedsById = new Map<string, any>(beds.map((b: any) => [b.id, b]));
  const roomsById = new Map<string, any>(rooms.map((r: any) => [r.id, r]));
  const assignmentsById = new Map<string, any>((assignmentsRes.data || []).map((a: any) => [a.id, a]));

  const incomeRows: any[] = [];
  let totalIncome = 0;

  for (const p of payments) {
    const bed = bedsById.get(p.bed_id);
    const room = bed ? roomsById.get(bed.room_id) : null;
    if (!bed || !room) continue;
    if (hostelId && room.hostel_id !== hostelId) continue;
    if (unitId && room.unit_id !== unitId) continue;

    const assignment = p.assignment_id ? assignmentsById.get(p.assignment_id) : null;
    const assigneeName = assignment?.assignee_name || '—';
    const mobileNumber = assignment?.mobile_number || '—';

    if (search) {
      const hay = `${bed.bed_number} ${assigneeName} ${mobileNumber}`.toLowerCase();
      if (!hay.includes(search)) continue;
    }

    const buildingName = hostelsById.get(room.hostel_id)?.name || '';
    const unitNumber = room.unit_id ? unitsById.get(room.unit_id)?.unit_number || '' : '';

    incomeRows.push({
      paymentId: p.id,
      bedId: bed.id,
      bedNumber: bed.bed_number,
      roomNumber: room.room_number,
      unitNumber,
      buildingName,
      assigneeName,
      mobileNumber,
      amount: Number(p.amount ?? 0),
      paidAt: p.paid_at ?? null,
    });
    totalIncome += Number(p.amount ?? 0);
  }

  // 2) Expenses for month/year (source of truth: expenses table)
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const startDate = new Date(`${start}T00:00:00.000Z`);
  const next = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 1));
  const endExclusive = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01`;

  let expQuery = supabase
    .from('expenses')
    .select('*, units(unit_number, floor, hostel_id, hostels(name)), expense_categories(name)')
    .gte('expense_date', start)
    .lt('expense_date', endExclusive);

  if (unitId) {
    expQuery = expQuery.eq('unit_id', unitId);
  } else if (hostelId) {
    const unitsInHostelRes = await supabase.from('units').select('id').eq('hostel_id', hostelId);
    throwIfError(unitsInHostelRes.error, 'Failed to load units for hostel filter');
    const unitIdsForHostel = (unitsInHostelRes.data || []).map((u: any) => u.id);
    if (unitIdsForHostel.length === 0) {
      // No units in this hostel => no expenses to return
      const expenseRows: any[] = [];
      return { data: { incomeRows, expenseRows, totalIncome, totalExpense: 0, profit: totalIncome, month, year } };
    }
    expQuery = expQuery.in('unit_id', unitIdsForHostel);
  }

  const expRes = await expQuery.order('expense_date', { ascending: false }).order('created_at', { ascending: false });
  throwIfError(expRes.error, 'Failed to load expenses');

  const expenseRows = (expRes.data || []).map((e: any) => {
    const u = e.units || {};
    const h = u.hostels || u.hostel || {};
    return {
      expenseId: e.id,
      expenseName: e.expense_name,
      categoryName: e.expense_categories?.name ?? '',
      amount: Number(e.amount ?? 0),
      expenseDate: e.expense_date,
      notes: e.notes ?? '',
      unitId: e.unit_id,
      unitNumber: u.unit_number ?? '',
      unitFloor: u.floor ?? '',
      buildingName: (typeof h === 'object' && h !== null && 'name' in h ? h.name : '') ?? '',
    };
  });

  const totalExpense = expenseRows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const profit = totalIncome - totalExpense;

  return { data: { incomeRows, expenseRows, totalIncome, totalExpense, profit, month, year } };
};

const getDeposits = async (queryParams?: { search?: string }): Promise<ApiResponse> => {
  requireAuthUser();
  const search = (queryParams?.search || '').trim().toLowerCase();

  const depRes = await supabase
    .from('deposits')
    .select('id, registered_user_id, amount, created_at')
    .order('created_at', { ascending: false });
  throwIfError(depRes.error, 'Failed to load deposits');

  const deposits = depRes.data || [];
  const userIds = Array.from(new Set(deposits.map((d: any) => d.registered_user_id).filter(Boolean)));
  const usersRes =
    userIds.length > 0
      ? await supabase
          .from('registered_users')
          .select('id, name, mobile_number')
          .in('id', userIds)
      : ({ data: [], error: null } as any);
  throwIfError(usersRes.error, 'Failed to load registered users');
  const usersById = new Map<string, any>((usersRes.data || []).map((u: any) => [u.id, u]));

  const rows = deposits
    .map((d: any) => {
      const user = usersById.get(d.registered_user_id);
      return {
        id: d.id,
        registeredUserId: d.registered_user_id,
        clientName: user?.name || 'Unknown',
        mobileNumber: user?.mobile_number || '',
        amount: Number(d.amount || 0),
        createdAt: d.created_at,
      };
    })
    .filter((row: any) => (search ? row.clientName.toLowerCase().includes(search) : true));

  const totalDeposit = rows.reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
  return { data: { deposits: rows, totalDeposit } };
};

const createDeposit = async (payload: any): Promise<ApiResponse> => {
  const current = requireAuthUser();
  const registeredUserId = payload?.registeredUserId ? String(payload.registeredUserId) : '';
  const amount = Number(payload?.amount);
  if (!registeredUserId) throw new ApiRequestError(400, 'registeredUserId is required');
  if (!Number.isFinite(amount) || amount <= 0) throw new ApiRequestError(400, 'Valid amount is required');

  const userRes = await supabase.from('registered_users').select('id').eq('id', registeredUserId).single();
  throwIfError(userRes.error, 'Registered user not found');
  if (!userRes.data) throw new ApiRequestError(404, 'Registered user not found');

  const res = await supabase
    .from('deposits')
    .insert({
      registered_user_id: registeredUserId,
      amount,
      created_by: current.id,
      created_at: nowIso(),
      updated_at: nowIso(),
    })
    .select('*')
    .single();
  throwIfError(res.error, 'Failed to create deposit');
  return { data: { deposit: res.data } };
};

const getInvestments = async (): Promise<ApiResponse> => {
  requireAuthUser();
  const res = await supabase.from('investments').select('*').order('date', { ascending: false }).order('created_at', { ascending: false });
  throwIfError(res.error, 'Failed to load investments');
  const investments = (res.data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    date: row.date,
    amount: Number(row.amount ?? 0),
    createdAt: row.created_at,
  }));
  return { data: { investments } };
};

const createInvestment = async (payload: any): Promise<ApiResponse> => {
  const current = requireAuthUser();
  const name = payload?.name ? String(payload.name).trim() : '';
  const description = payload?.description ? String(payload.description).trim() : '';
  const date = payload?.date ? String(payload.date) : '';
  const amount = Number(payload?.amount);
  if (!name) throw new ApiRequestError(400, 'Investment name is required');
  if (!date) throw new ApiRequestError(400, 'Investment date is required');
  if (!Number.isFinite(amount) || amount <= 0) throw new ApiRequestError(400, 'Valid investment amount is required');

  const res = await supabase
    .from('investments')
    .insert({
      name,
      description: description || null,
      date,
      amount,
      created_by: current.id,
      created_at: nowIso(),
      updated_at: nowIso(),
    })
    .select('*')
    .single();
  throwIfError(res.error, 'Failed to create investment');
  return { data: { investment: res.data } };
};

const dispatch = async (method: Method, path: string, payload?: any): Promise<ApiResponse> => {
  if (method === 'POST' && path === '/auth/login') return authLogin(payload);
  if (method === 'POST' && path === '/auth/signup') return authSignup(payload);

  if (method === 'GET' && path === '/users') return getUsers();
  if (method === 'GET' && path === '/users/pending') return getPendingUsers();
  if (method === 'GET' && path === '/registered-users') return getRegisteredUsers();
  if (method === 'POST' && path === '/registered-users') return createRegisteredUser(payload);
  if (method === 'PATCH' && path.startsWith('/users/')) {
    const id = getPathParam(path, /^\/users\/([^/]+)\/status$/);
    if (!id) throw new ApiRequestError(404, 'Endpoint not found');
    return updateUserStatus(id, payload);
  }

  if (method === 'GET' && path === '/hostels') return getHostels();
  if (method === 'POST' && path === '/hostels') return createHostel(payload);
  if (method === 'DELETE' && path.match(/^\/hostels\/[^/]+$/)) {
    const id = getPathParam(path, /^\/hostels\/([^/]+)$/);
    if (!id) throw new ApiRequestError(404, 'Not found');
    return deleteHostel(id);
  }
  if (method === 'GET' && path.startsWith('/units') && !path.match(/^\/units\/[^/]+/)) {
    const hostelId = getQueryParam(path, 'hostelId');
    if (hostelId) return getUnits(hostelId);
    return getAllUnits();
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
  if (method === 'PATCH' && path.match(/^\/rooms\/[^/]+$/) && !path.includes('/beds')) {
    const id = getPathParam(path, /^\/rooms\/([^/]+)$/);
    if (!id) throw new ApiRequestError(404, 'Not found');
    return updateRoom(id, payload);
  }
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

  if (method === 'GET' && path === '/expense-categories') return getExpenseCategories();
  if (method === 'POST' && path === '/expense-categories') return createExpenseCategory(payload);
  if (method === 'GET' && path.startsWith('/expenses') && path === '/expenses') return getExpenses();
  if (method === 'GET' && path.startsWith('/expenses?')) {
    const month = getQueryParam(path, 'month');
    const year = getQueryParam(path, 'year');
    return getExpenses({ month: month ? Number(month) : undefined, year: year ? Number(year) : undefined });
  }
  if (method === 'POST' && path === '/expenses') return createExpense(payload);
  if (method === 'PATCH' && path.match(/^\/expenses\/[^/]+$/)) {
    const id = getPathParam(path, /^\/expenses\/([^/]+)$/);
    if (!id) throw new ApiRequestError(404, 'Not found');
    return updateExpense(id, payload);
  }
  if (method === 'DELETE' && path.match(/^\/expenses\/[^/]+$/)) {
    const id = getPathParam(path, /^\/expenses\/([^/]+)$/);
    if (!id) throw new ApiRequestError(404, 'Not found');
    return deleteExpense(id);
  }

  if (method === 'GET' && path === '/client-history') return getClientHistory();
  if (method === 'GET' && path.startsWith('/deposits')) {
    const search = getQueryParam(path, 'search') || undefined;
    return getDeposits({ search });
  }
  if (method === 'POST' && path === '/deposits') return createDeposit(payload);
  if (method === 'GET' && path === '/investments') return getInvestments();
  if (method === 'POST' && path === '/investments') return createInvestment(payload);
  if (method === 'GET' && path.startsWith('/analytics')) {
    const hostelId = getQueryParam(path, 'hostelId') || undefined;
    const unitId = getQueryParam(path, 'unitId') || undefined;
    const month = getQueryParam(path, 'month');
    const year = getQueryParam(path, 'year');
    const search = getQueryParam(path, 'search') || undefined;
    return getAnalytics({
      hostelId,
      unitId,
      month: month ? Number(month) : undefined,
      year: year ? Number(year) : undefined,
      search,
    });
  }
  if (method === 'GET' && path.startsWith('/income')) {
    if (path.startsWith('/income/paid-months')) {
      const bedId = getQueryParam(path, 'bedId') || '';
      const year = Number(getQueryParam(path, 'year'));
      return getPaidMonths(bedId, year);
    }
    const hostelId = getQueryParam(path, 'hostelId') || undefined;
    const unitId = getQueryParam(path, 'unitId') || undefined;
    const month = getQueryParam(path, 'month');
    const year = getQueryParam(path, 'year');
    const search = getQueryParam(path, 'search') || undefined;
    return getIncome({
      hostelId,
      unitId,
      month: month ? Number(month) : undefined,
      year: year ? Number(year) : undefined,
      search,
    });
  }
  if (method === 'POST' && path === '/income/pay') return payIncome(payload);
  if (method === 'DELETE' && path.match(/^\/income-payments\/[^/]+$/)) {
    const id = getPathParam(path, /^\/income-payments\/([^/]+)$/);
    if (!id) throw new ApiRequestError(404, 'Not found');
    return deleteIncomePayment(id);
  }

  throw new ApiRequestError(404, `Unsupported endpoint: ${method} ${path}`);
};

const api = {
  get: (path: string) => dispatch('GET', path),
  post: (path: string, payload?: any) => dispatch('POST', path, payload),
  patch: (path: string, payload?: any) => dispatch('PATCH', path, payload),
  delete: (path: string) => dispatch('DELETE', path),
};

export default api;
