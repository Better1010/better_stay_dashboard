'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';
import { confirmAction, notifyError, notifySuccess, notifyWarning } from '@/lib/notify';
import { uploadNidPicture } from '@/lib/supabase';

const editBtnClass =
  'border-0 bg-transparent p-0 text-sm font-medium text-secondary shadow-none hover:text-secondary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/35 focus-visible:ring-offset-0';

type RegisteredUserRow = {
  id: string;
  name: string;
  mobileNumber?: string;
  nidFrontUrl?: string | null;
  nidBackUrl?: string | null;
  status?: 'active' | 'inactive';
  activeBedId?: string | null;
  buildingId?: string;
  buildingName?: string;
  unitId?: string;
  unitNumber?: string;
  roomId?: string;
  roomNumber?: string;
  bedNumber?: string;
  createdAt?: string;
};

type HostelOption = {
  id?: string;
  _id?: string;
  name: string;
};

type UnitOption = {
  id: string;
  unitNumber: string;
};

type RoomOption = {
  id: string;
  roomNumber: string;
};

type BedOption = {
  id: string;
  bedNumber: string;
  basePrice?: number;
  residentId?: string | null;
  registeredUserId?: string | null;
  assigneeName?: string | null;
};

type ApiLikeError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'response' in error) {
    return (error as ApiLikeError).response?.data?.message || fallback;
  }

  return fallback;
}

function formatWhen(iso: string | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function roomNumberValue(roomNumber: string | undefined) {
  if (!roomNumber) return null;
  const match = roomNumber.match(/\d+/);
  if (!match) return null;
  return Number(match[0]);
}

function compareUsersByRoom(a: RegisteredUserRow, b: RegisteredUserRow, direction: 'asc' | 'desc') {
  const aNum = roomNumberValue(a.roomNumber);
  const bNum = roomNumberValue(b.roomNumber);
  if (aNum === null && bNum === null) {
    return (a.roomNumber || '').localeCompare(b.roomNumber || '', undefined, { numeric: true, sensitivity: 'base' });
  }
  if (aNum === null) return 1;
  if (bNum === null) return -1;
  if (aNum !== bNum) return direction === 'asc' ? aNum - bNum : bNum - aNum;
  const label = (a.roomNumber || '').localeCompare(b.roomNumber || '', undefined, { numeric: true, sensitivity: 'base' });
  if (label !== 0) return direction === 'asc' ? label : -label;
  return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
}

function mergeHostels(items: HostelOption[], current?: { id: string; name: string } | null) {
  if (!current?.id) return items;
  if (items.some((item) => (item.id || item._id) === current.id)) return items;
  return [{ id: current.id, name: current.name }, ...items];
}

function mergeUnits(items: UnitOption[], current?: { id: string; unitNumber: string } | null) {
  if (!current?.id) return items;
  if (items.some((item) => item.id === current.id)) return items;
  return [{ id: current.id, unitNumber: current.unitNumber }, ...items];
}

function mergeRooms(items: RoomOption[], current?: { id: string; roomNumber: string } | null) {
  if (!current?.id) return items;
  if (items.some((item) => item.id === current.id)) return items;
  return [{ id: current.id, roomNumber: current.roomNumber }, ...items];
}

function mergeBeds(items: BedOption[], current?: { id: string; bedNumber: string } | null) {
  if (!current?.id) return items;
  if (items.some((item) => item.id === current.id)) return items;
  return [{ id: current.id, bedNumber: current.bedNumber }, ...items];
}

export default function RegisterUserPage() {
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [nidFrontFile, setNidFrontFile] = useState<File | null>(null);
  const [nidBackFile, setNidBackFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [users, setUsers] = useState<RegisteredUserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [roomSort, setRoomSort] = useState<'asc' | 'desc' | ''>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [hostels, setHostels] = useState<HostelOption[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [beds, setBeds] = useState<BedOption[]>([]);
  const [selectedHostelId, setSelectedHostelId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedBedId, setSelectedBedId] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [statusUpdatingUserId, setStatusUpdatingUserId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<RegisteredUserRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [editOriginalBedId, setEditOriginalBedId] = useState('');
  const [editHostels, setEditHostels] = useState<HostelOption[]>([]);
  const [editUnits, setEditUnits] = useState<UnitOption[]>([]);
  const [editRooms, setEditRooms] = useState<RoomOption[]>([]);
  const [editBeds, setEditBeds] = useState<BedOption[]>([]);
  const [editHostelId, setEditHostelId] = useState('');
  const [editUnitId, setEditUnitId] = useState('');
  const [editRoomId, setEditRoomId] = useState('');
  const [editBedId, setEditBedId] = useState('');
  const [editOptionsLoading, setEditOptionsLoading] = useState(false);
  const [editNidFrontFile, setEditNidFrontFile] = useState<File | null>(null);
  const [editNidBackFile, setEditNidBackFile] = useState<File | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await api.get('/registered-users');
      setUsers(res.data.users || []);
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const loadAvailableHostels = useCallback(async () => {
    try {
      const res = await api.get('/hostels?availableBedsOnly=true');
      setHostels((res.data.hostels || []) as HostelOption[]);
    } catch {
      setHostels([]);
    }
  }, []);

  useEffect(() => {
    loadAvailableHostels();
  }, [loadAvailableHostels]);

  useEffect(() => {
    setUnits([]);
    setRooms([]);
    setBeds([]);
    setSelectedUnitId('');
    setSelectedRoomId('');
    setSelectedBedId('');

    if (!selectedHostelId) return;

    api
      .get(`/units?hostelId=${selectedHostelId}&availableBedsOnly=true`)
      .then((res) => setUnits((res.data.units || []) as UnitOption[]))
      .catch(() => setUnits([]));
  }, [selectedHostelId]);

  useEffect(() => {
    setRooms([]);
    setBeds([]);
    setSelectedRoomId('');
    setSelectedBedId('');

    if (!selectedHostelId || !selectedUnitId) return;

    api
      .get(`/rooms?hostelId=${selectedHostelId}&unitId=${selectedUnitId}&availableBedsOnly=true`)
      .then((res) => setRooms((res.data.rooms || []) as RoomOption[]))
      .catch(() => setRooms([]));
  }, [selectedHostelId, selectedUnitId]);

  useEffect(() => {
    setBeds([]);
    setSelectedBedId('');

    if (!selectedRoomId) return;

    api
      .get(`/rooms/${selectedRoomId}/beds?availableOnly=true`)
      .then((res) => setBeds((res.data.beds || []) as BedOption[]))
      .catch(() => setBeds([]));
  }, [selectedRoomId]);

  useEffect(() => {
    if (status === 'inactive') {
      setSelectedHostelId('');
      setSelectedUnitId('');
      setSelectedRoomId('');
      setSelectedBedId('');
      setUnits([]);
      setRooms([]);
      setBeds([]);
    }
  }, [status]);

  const showToast = (type: 'success' | 'error' | 'warning', message: string) => {
    if (type === 'success') notifySuccess(message);
    else if (type === 'warning') notifyWarning(message);
    else notifyError(message);
  };

  const availableBeds = beds;
  const assignmentRequired = status === 'active';
  const canSubmitAssignment =
    !assignmentRequired ||
    (Boolean(selectedHostelId && selectedUnitId && selectedRoomId && selectedBedId) && availableBeds.length > 0);

  const resetAssignmentFields = () => {
    setSelectedHostelId('');
    setSelectedUnitId('');
    setSelectedRoomId('');
    setSelectedBedId('');
    setStatus('active');
    setUnits([]);
    setRooms([]);
    setBeds([]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!nidFrontFile || !nidBackFile) {
      showToast('error', 'NID front and back pictures are required.');
      return;
    }
    if (assignmentRequired && (!selectedHostelId || !selectedUnitId || !selectedRoomId || !selectedBedId)) {
      showToast('error', 'Please select building, unit, room and bed before assigning.');
      return;
    }
    try {
      setUploading(true);
      const prefix = `registered-user-${Date.now()}`;
      const [nidFrontUrl, nidBackUrl] = await Promise.all([
        uploadNidPicture(nidFrontFile, prefix),
        uploadNidPicture(nidBackFile, prefix),
      ]);
      const created = await api.post('/registered-users', {
        name: name.trim(),
        mobileNumber: mobileNumber.trim(),
        nidFrontUrl,
        nidBackUrl,
        status,
      });
      const newUserId = created.data.user?.id;
      if (!newUserId) {
        throw new Error('Registered user was created, but assignment could not continue.');
      }
      if (assignmentRequired) {
        await api.post(`/beds/${selectedBedId}/assign`, {
          registeredUserId: newUserId,
          price: 0,
        });
      }
      setName('');
      setMobileNumber('');
      setNidFrontFile(null);
      setNidBackFile(null);
      resetAssignmentFields();
      form.reset();
      showToast(
        'success',
        assignmentRequired ? 'User registered and assigned successfully.' : 'User registered successfully.',
      );
      await Promise.all([fetchUsers(), loadAvailableHostels()]);
    } catch (err: unknown) {
      showToast('error', getErrorMessage(err, 'Failed to register and assign user'));
    } finally {
      setUploading(false);
    }
  };

  const openEditUser = async (user: RegisteredUserRow) => {
    setEditUser(user);
    setEditName(user.name);
    setEditMobile(user.mobileNumber || '');
    setEditStatus(user.status || 'active');
    setEditOriginalBedId(user.activeBedId || '');
    setEditHostelId(user.buildingId || '');
    setEditUnitId(user.unitId || '');
    setEditRoomId(user.roomId || '');
    setEditBedId(user.activeBedId || '');
    setEditNidFrontFile(null);
    setEditNidBackFile(null);
    setEditOptionsLoading(true);
    try {
      const hostelsRes = await api.get('/hostels?availableBedsOnly=true');
      setEditHostels(
        mergeHostels((hostelsRes.data.hostels || []) as HostelOption[], {
          id: user.buildingId || '',
          name: user.buildingName || '',
        }),
      );

      if (user.buildingId) {
        const unitsRes = await api.get(`/units?hostelId=${user.buildingId}&availableBedsOnly=true`);
        setEditUnits(
          mergeUnits((unitsRes.data.units || []) as UnitOption[], {
            id: user.unitId || '',
            unitNumber: user.unitNumber || '',
          }),
        );
      } else {
        setEditUnits([]);
      }

      if (user.buildingId && user.unitId) {
        const roomsRes = await api.get(
          `/rooms?hostelId=${user.buildingId}&unitId=${user.unitId}&availableBedsOnly=true`,
        );
        setEditRooms(
          mergeRooms((roomsRes.data.rooms || []) as RoomOption[], {
            id: user.roomId || '',
            roomNumber: user.roomNumber || '',
          }),
        );
      } else {
        setEditRooms([]);
      }

      if (user.roomId) {
        const bedsRes = await api.get(`/rooms/${user.roomId}/beds?availableOnly=true`);
        setEditBeds(
          mergeBeds((bedsRes.data.beds || []) as BedOption[], {
            id: user.activeBedId || '',
            bedNumber: user.bedNumber || '',
          }),
        );
      } else {
        setEditBeds([]);
      }
    } catch {
      setEditHostels([]);
      setEditUnits([]);
      setEditRooms([]);
      setEditBeds([]);
    } finally {
      setEditOptionsLoading(false);
    }
  };

  useEffect(() => {
    if (!editUser) return;

    if (editStatus === 'inactive') {
      setEditHostelId('');
      setEditUnitId('');
      setEditRoomId('');
      setEditBedId('');
      setEditUnits([]);
      setEditRooms([]);
      setEditBeds([]);
      return;
    }

    if (!editHostelId) {
      setEditUnits([]);
      setEditRooms([]);
      setEditBeds([]);
      setEditUnitId('');
      setEditRoomId('');
      setEditBedId('');
      return;
    }

    api
      .get(`/units?hostelId=${editHostelId}&availableBedsOnly=true`)
      .then((res) => {
        const nextUnits = mergeUnits((res.data.units || []) as UnitOption[], {
          id: editUser.unitId || '',
          unitNumber: editUser.unitNumber || '',
        });
        setEditUnits(nextUnits);
        if (editUnitId && !nextUnits.some((unit) => unit.id === editUnitId)) {
          setEditUnitId('');
          setEditRoomId('');
          setEditBedId('');
          setEditRooms([]);
          setEditBeds([]);
        }
      })
      .catch(() => setEditUnits([]));
  }, [editUser, editHostelId, editStatus, editUnitId]);

  useEffect(() => {
    if (!editUser || editStatus === 'inactive' || !editHostelId || !editUnitId) return;

    api
      .get(`/rooms?hostelId=${editHostelId}&unitId=${editUnitId}&availableBedsOnly=true`)
      .then((res) => {
        const nextRooms = mergeRooms((res.data.rooms || []) as RoomOption[], {
          id: editUser.roomId || '',
          roomNumber: editUser.roomNumber || '',
        });
        setEditRooms(nextRooms);
        if (editRoomId && !nextRooms.some((room) => room.id === editRoomId)) {
          setEditRoomId('');
          setEditBedId('');
          setEditBeds([]);
        }
      })
      .catch(() => setEditRooms([]));
  }, [editUser, editHostelId, editUnitId, editStatus, editRoomId]);

  useEffect(() => {
    if (!editUser || editStatus === 'inactive' || !editRoomId) return;

    api
      .get(`/rooms/${editRoomId}/beds?availableOnly=true`)
      .then((res) => {
        const nextBeds = mergeBeds((res.data.beds || []) as BedOption[], {
          id: editUser.activeBedId || '',
          bedNumber: editUser.bedNumber || '',
        });
        setEditBeds(nextBeds);
        if (editBedId && !nextBeds.some((bed) => bed.id === editBedId)) {
          setEditBedId('');
        }
      })
      .catch(() => setEditBeds([]));
  }, [editUser, editRoomId, editStatus, editBedId]);

  const editAssignmentRequired = editStatus === 'active';
  const editAvailableBeds = editBeds;
  const canSaveEditAssignment =
    !editAssignmentRequired ||
    Boolean(editHostelId && editUnitId && editRoomId && editBedId && editAvailableBeds.length > 0);

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser || !editName.trim()) return;
    if (editAssignmentRequired && (!editHostelId || !editUnitId || !editRoomId || !editBedId)) {
      showToast('error', 'Please select building, unit, room and bed for active users.');
      return;
    }
    try {
      setEditSaving(true);
      const prefix = `registered-user-${editUser.id}-${Date.now()}`;
      let nidFrontUrl: string | undefined;
      let nidBackUrl: string | undefined;
      if (editNidFrontFile) nidFrontUrl = await uploadNidPicture(editNidFrontFile, `${prefix}-front`);
      if (editNidBackFile) nidBackUrl = await uploadNidPicture(editNidBackFile, `${prefix}-back`);
      const body: Record<string, string> = {
        name: editName.trim(),
        mobileNumber: editMobile.trim(),
        status: editStatus,
      };
      if (nidFrontUrl) body.nidFrontUrl = nidFrontUrl;
      if (nidBackUrl) body.nidBackUrl = nidBackUrl;
      await api.patch(`/registered-users/${editUser.id}`, body);

      if (editStatus === 'active' && editBedId && editBedId !== editOriginalBedId) {
        if (editOriginalBedId) {
          await api.patch(`/beds/${editOriginalBedId}/unassign`);
        }
        await api.post(`/beds/${editBedId}/assign`, {
          registeredUserId: editUser.id,
          price: 0,
        });
      }

      setEditUser(null);
      showToast(
        editStatus === 'inactive' ? 'warning' : 'success',
        editStatus === 'inactive'
          ? 'User updated. Status is inactive and room and bed are empty.'
          : editBedId !== editOriginalBedId
            ? 'User and bed assignment updated successfully.'
            : 'User updated successfully.',
      );
      await Promise.all([fetchUsers(), loadAvailableHostels(), refreshAssignmentDropdowns()]);
    } catch (err: unknown) {
      showToast('error', getErrorMessage(err, 'Failed to update user'));
    } finally {
      setEditSaving(false);
    }
  };

  const refreshAssignmentDropdowns = useCallback(async () => {
    await loadAvailableHostels();
    if (selectedHostelId) {
      const unitsRes = await api.get(`/units?hostelId=${selectedHostelId}&availableBedsOnly=true`).catch(() => null);
      const nextUnits = (unitsRes?.data.units || []) as UnitOption[];
      setUnits(nextUnits);
      if (!nextUnits.some((unit) => unit.id === selectedUnitId)) {
        setSelectedUnitId('');
        setSelectedRoomId('');
        setSelectedBedId('');
        setRooms([]);
        setBeds([]);
        return;
      }
    }
    if (selectedHostelId && selectedUnitId) {
      const roomsRes = await api
        .get(`/rooms?hostelId=${selectedHostelId}&unitId=${selectedUnitId}&availableBedsOnly=true`)
        .catch(() => null);
      const nextRooms = (roomsRes?.data.rooms || []) as RoomOption[];
      setRooms(nextRooms);
      if (!nextRooms.some((room) => room.id === selectedRoomId)) {
        setSelectedRoomId('');
        setSelectedBedId('');
        setBeds([]);
        return;
      }
    }
    if (selectedRoomId) {
      const bedsRes = await api.get(`/rooms/${selectedRoomId}/beds?availableOnly=true`).catch(() => null);
      const nextBeds = (bedsRes?.data.beds || []) as BedOption[];
      setBeds(nextBeds);
      if (!nextBeds.some((bed) => bed.id === selectedBedId)) {
        setSelectedBedId('');
      }
    }
  }, [loadAvailableHostels, selectedBedId, selectedHostelId, selectedRoomId, selectedUnitId]);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    const next = users.filter((u) => {
      const matchesSearch = !query || u.name.toLowerCase().includes(query);
      const userStatus = u.status === 'inactive' ? 'inactive' : 'active';
      const matchesStatus = statusFilter === 'all' || userStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
    if (!roomSort) return next;
    return [...next].sort((a, b) => compareUsersByRoom(a, b, roomSort));
  }, [users, userSearch, roomSort, statusFilter]);

  const toggleUserStatus = async (user: RegisteredUserRow) => {
    const nextStatus = user.status === 'inactive' ? 'active' : 'inactive';
    const goingInactive = nextStatus === 'inactive';
    const assignmentLabel = [user.roomNumber, user.bedNumber].filter(Boolean).join(' · ');
    const confirmed = await confirmAction({
      title: goingInactive ? 'Mark this user inactive?' : 'Mark this user active?',
      message: goingInactive
        ? assignmentLabel
          ? `${user.name} will be unassigned from ${assignmentLabel}. Room and bed will become empty.`
          : `${user.name} will be marked inactive. Room and bed will stay empty.`
        : `Mark ${user.name} as active? Assign a room and bed from Edit after this.`,
      confirmLabel: goingInactive ? 'Mark inactive' : 'Mark active',
      danger: goingInactive,
    });
    if (!confirmed) return;

    try {
      setStatusUpdatingUserId(user.id);
      await api.patch(`/registered-users/${user.id}`, { status: nextStatus });
      await fetchUsers();
      await refreshAssignmentDropdowns();
      showToast(
        goingInactive ? 'warning' : 'success',
        goingInactive
          ? 'User is now inactive. Room and bed are empty.'
          : 'User is now active. Assign a room and bed from Edit if needed.',
      );
    } catch (err: unknown) {
      showToast('error', getErrorMessage(err, 'Failed to update status'));
    } finally {
      setStatusUpdatingUserId(null);
    }
  };

  return (
    <DashboardLayout requiredRole={['super_admin']}>
      <div className="space-y-10">
        <div>
          <div className="mb-6 max-w-3xl">
            <h2 className="text-2xl font-bold text-gray-900">Register & Assign User</h2>
            <p className="mt-2 text-sm text-gray-600">
              Add the user details, choose their building/unit/room/bed, then assign them in one flow.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-900">User name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900">Mobile number</label>
              <input
                type="text"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                placeholder="e.g. 01XXXXXXXXX"
              />
            </div>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-900">NID picture (front) — required</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNidFrontFile(e.target.files?.[0] || null)}
                className="mt-1 block w-full text-sm text-gray-900 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900">NID picture (back) — required</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNidBackFile(e.target.files?.[0] || null)}
                className="mt-1 block w-full text-sm text-gray-900 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                required
              />
            </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Bed assignment</h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Each bed can hold only one active user. Inactive users are removed from their bed and the bed
                      becomes available again.
                    </p>
                  </div>
                  <div className="w-full sm:max-w-[180px]">
                    <label className="block text-sm font-medium text-gray-900">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
                      required
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {assignmentRequired ? (
                  hostels.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-6 text-sm text-gray-500">
                      No available beds right now. All beds are currently assigned.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900">Building</label>
                        <select
                          value={selectedHostelId}
                          onChange={(e) => setSelectedHostelId(e.target.value)}
                          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
                          required
                        >
                          <option value="">Select building</option>
                          {hostels.map((hostel) => (
                            <option key={hostel.id || hostel._id || hostel.name} value={hostel.id || hostel._id || ''}>
                              {hostel.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900">Unit</label>
                        <select
                          value={selectedUnitId}
                          onChange={(e) => setSelectedUnitId(e.target.value)}
                          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 disabled:bg-gray-100"
                          disabled={!selectedHostelId}
                          required
                        >
                          <option value="">
                            {selectedHostelId && units.length === 0 ? 'No available unit' : 'Select unit'}
                          </option>
                          {units.map((unit) => (
                            <option key={unit.id} value={unit.id}>
                              {unit.unitNumber}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900">Room</label>
                        <select
                          value={selectedRoomId}
                          onChange={(e) => setSelectedRoomId(e.target.value)}
                          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 disabled:bg-gray-100"
                          disabled={!selectedUnitId}
                          required
                        >
                          <option value="">
                            {selectedUnitId && rooms.length === 0 ? 'No available room' : 'Select room'}
                          </option>
                          {rooms.map((room) => (
                            <option key={room.id} value={room.id}>
                              {room.roomNumber}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900">Bed</label>
                        <select
                          value={selectedBedId}
                          onChange={(e) => setSelectedBedId(e.target.value)}
                          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 disabled:bg-gray-100"
                          disabled={!selectedRoomId || availableBeds.length === 0}
                          required
                        >
                          <option value="">
                            {selectedRoomId && availableBeds.length === 0 ? 'No available bed' : 'Select bed'}
                          </option>
                          {availableBeds.map((bed) => (
                            <option key={bed.id} value={bed.id}>
                              {bed.bedNumber}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )
                ) : (
                  <p className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-4 text-sm text-gray-500">
                    Inactive users are saved without a bed assignment.
                  </p>
                )}
              </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={uploading || !canSubmitAssignment}
                className="rounded-lg bg-secondary px-4 py-2 text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50"
              >
                {uploading ? 'Saving...' : assignmentRequired ? 'Register & Assign' : 'Register User'}
              </button>
            </div>
          </form>
          </div>
        </div>

        <section>
          <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-end sm:justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Registered users</h3>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="w-full sm:w-64">
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Type user name..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                />
              </div>
              <button
                type="button"
                onClick={() => fetchUsers()}
                disabled={usersLoading}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50 self-start sm:self-end sm:mb-0.5"
              >
                Refresh list
              </button>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Mobile
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      NID (front)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      NID (back)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Building
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <div className="flex flex-col gap-1.5">
                        <span>Room</span>
                        <select
                          value={roomSort}
                          onChange={(e) => setRoomSort(e.target.value as 'asc' | 'desc' | '')}
                          className="w-full min-w-[8.5rem] rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium normal-case tracking-normal text-gray-700"
                          aria-label="Sort rooms numerically"
                        >
                          <option value="">Default</option>
                          <option value="asc">Ascending</option>
                          <option value="desc">Descending</option>
                        </select>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Bed
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <div className="flex flex-col gap-1.5">
                        <span>Status</span>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                          className="w-full min-w-[7.5rem] rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium normal-case tracking-normal text-gray-700"
                          aria-label="Filter by status"
                        >
                          <option value="all">All</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Registered
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {usersLoading ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-10 text-center text-sm text-gray-500">
                        Loading users…
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-10 text-center text-sm text-gray-500">
                        {users.length === 0
                          ? 'No registered users yet. Add someone using the form above.'
                          : 'No users match your search or filters.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{u.mobileNumber || '—'}</td>
                        <td className="px-4 py-3 text-sm">
                          {u.nidFrontUrl ? (
                            <a
                              href={u.nidFrontUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {u.nidBackUrl ? (
                            <a
                              href={u.nidBackUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{u.buildingName || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{u.unitNumber || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{u.roomNumber || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{u.bedNumber || '—'}</td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            type="button"
                            onClick={() => toggleUserStatus(u)}
                            disabled={statusUpdatingUserId === u.id}
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize transition-colors disabled:opacity-60 ${
                              u.status === 'inactive'
                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {statusUpdatingUserId === u.id ? 'Updating...' : u.status || 'active'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatWhen(u.createdAt)}</td>
                        <td className="px-4 py-3 text-sm text-right">
                          <button type="button" onClick={() => openEditUser(u)} className={editBtnClass}>
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {editUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Edit registered user</h3>
              <form onSubmit={handleEditUser} className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-900">User name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900">Mobile number</label>
                    <input
                      type="text"
                      value={editMobile}
                      onChange={(e) => setEditMobile(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                      placeholder="e.g. 01XXXXXXXXX"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">Bed assignment</h4>
                      <p className="mt-1 text-xs text-gray-500">
                        Update building, unit, room, and bed. Setting inactive removes the user from their bed.
                      </p>
                    </div>
                    <div className="w-full sm:max-w-[180px]">
                      <label className="block text-sm font-medium text-gray-900">Status</label>
                      <select
                        value={editStatus}
                        onChange={async (e) => {
                          const nextStatus = e.target.value as 'active' | 'inactive';
                          if (nextStatus === 'inactive' && editStatus === 'active') {
                            const assignmentLabel = [editUser?.roomNumber, editUser?.bedNumber].filter(Boolean).join(' · ');
                            const confirmed = await confirmAction({
                              title: 'Mark this user inactive?',
                              message: assignmentLabel
                                ? `${editUser?.name || 'This user'} will be unassigned from ${assignmentLabel}. Room and bed will become empty.`
                                : 'Setting inactive will clear this user’s room and bed.',
                              confirmLabel: 'Mark inactive',
                              danger: true,
                            });
                            if (!confirmed) return;
                          }
                          setEditStatus(nextStatus);
                        }}
                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
                        required
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  {editOptionsLoading ? (
                    <p className="text-sm text-gray-500">Loading assignment options…</p>
                  ) : editAssignmentRequired ? (
                    editHostels.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-4 text-sm text-gray-500">
                        No available beds right now. All beds are currently assigned.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-900">Building</label>
                          <select
                            value={editHostelId}
                            onChange={(e) => {
                              setEditHostelId(e.target.value);
                              setEditUnitId('');
                              setEditRoomId('');
                              setEditBedId('');
                            }}
                            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
                            required
                          >
                            <option value="">Select building</option>
                            {editHostels.map((hostel) => (
                              <option key={hostel.id || hostel._id || hostel.name} value={hostel.id || hostel._id || ''}>
                                {hostel.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-900">Unit</label>
                          <select
                            value={editUnitId}
                            onChange={(e) => {
                              setEditUnitId(e.target.value);
                              setEditRoomId('');
                              setEditBedId('');
                            }}
                            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 disabled:bg-gray-100"
                            disabled={!editHostelId}
                            required
                          >
                            <option value="">
                              {editHostelId && editUnits.length === 0 ? 'No available unit' : 'Select unit'}
                            </option>
                            {editUnits.map((unit) => (
                              <option key={unit.id} value={unit.id}>
                                {unit.unitNumber}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-900">Room</label>
                          <select
                            value={editRoomId}
                            onChange={(e) => {
                              setEditRoomId(e.target.value);
                              setEditBedId('');
                            }}
                            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 disabled:bg-gray-100"
                            disabled={!editUnitId}
                            required
                          >
                            <option value="">
                              {editUnitId && editRooms.length === 0 ? 'No available room' : 'Select room'}
                            </option>
                            {editRooms.map((room) => (
                              <option key={room.id} value={room.id}>
                                {room.roomNumber}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-900">Bed</label>
                          <select
                            value={editBedId}
                            onChange={(e) => setEditBedId(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 disabled:bg-gray-100"
                            disabled={!editRoomId || editAvailableBeds.length === 0}
                            required
                          >
                            <option value="">
                              {editRoomId && editAvailableBeds.length === 0 ? 'No available bed' : 'Select bed'}
                            </option>
                            {editAvailableBeds.map((bed) => (
                              <option key={bed.id} value={bed.id}>
                                {bed.bedNumber}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )
                  ) : (
                    <p className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-4 text-sm text-gray-500">
                      Inactive users are saved without a bed assignment.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-900">Replace NID front (optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setEditNidFrontFile(e.target.files?.[0] || null)}
                      className="mt-1 block w-full text-sm text-gray-900 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
                    />
                    {editUser.nidFrontUrl ? (
                      <p className="mt-1 text-xs text-gray-500">
                        Current:{' '}
                        <a href={editUser.nidFrontUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600">
                          View
                        </a>
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900">Replace NID back (optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setEditNidBackFile(e.target.files?.[0] || null)}
                      className="mt-1 block w-full text-sm text-gray-900 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
                    />
                    {editUser.nidBackUrl ? (
                      <p className="mt-1 text-xs text-gray-500">
                        Current:{' '}
                        <a href={editUser.nidBackUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600">
                          View
                        </a>
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditUser(null)}
                    disabled={editSaving}
                    className="px-4 py-2 text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving || editOptionsLoading || !canSaveEditAssignment}
                    className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50"
                  >
                    {editSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
