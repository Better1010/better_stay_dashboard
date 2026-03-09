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

const updateUserStatus = async (_id: string, _payload: any): Promise<ApiResponse> => {
  requireAuthUser();
  throw new ApiRequestError(400, 'User management is disabled. Manage users in Supabase Dashboard.');
};

const getHostels = async (): Promise<ApiResponse> => {
  requireAuthUser();
  const res = await supabase.from('hostels').select('*').order('created_at', { ascending: false });
  throwIfError(res.error, 'Failed to load hostels');

  const hostels = (res.data || []).map((h: any) => ({
    _id: h.id,
    ...h,
    adminId: h.admin_id,
  }));
  return { data: { hostels } };
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
  requireAuthUser();
  const { unitId, hostelId, roomNumber, floor, totalBeds, rent } = payload || {};
  if (!hostelId || !roomNumber || floor == null) {
    throw new ApiRequestError(400, 'hostelId, roomNumber and floor are required');
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
  const beds = (res.data || []).map((b: any) => {
    const assignment = assignments.get(b.id);
    const assigneeName = assignment?.assignee_name ?? null;
    return {
      _id: b.id,
      id: b.id,
      roomId: b.room_id,
      bedNumber: b.bed_number,
      basePrice: b.base_price ?? 0,
      residentId: b.resident_id,
      assignmentPrice: assignment?.price ?? null,
      assigneeName: assigneeName || null,
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
  const res = await supabase.from('beds').update(updates).eq('id', id).select('*').single();
  throwIfError(res.error, 'Failed to update bed');
  return { data: { bed: { _id: res.data.id, basePrice: res.data.base_price } } };
};

const assignBed = async (bedId: string, payload: any): Promise<ApiResponse> => {
  const current = requireAuthUser();
  const { assigneeName, price } = payload || {};
  const name = typeof assigneeName === 'string' ? assigneeName.trim() : '';
  if (!name || price == null) {
    throw new ApiRequestError(400, 'Assignee name and price are required');
  }
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
  if (!bedRes.data) throw new ApiRequestError(404, 'Bed not found');
  const roomRes = await supabase.from('rooms').select('hostel_id').eq('id', bedRes.data.room_id).single();
  throwIfError(roomRes.error, 'Room not found');
  if (!roomRes.data) throw new ApiRequestError(404, 'Room not found');
  const residentId = bedRes.data.resident_id;
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
