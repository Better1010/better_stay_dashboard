'use client';

import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { uploadBedPicture } from '@/lib/supabase';

export default function BuildingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const buildingId = params.id as string;
  const [building, setBuilding] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [beds, setBeds] = useState<any[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  type ViewStep = 'units' | 'rooms' | 'beds';
  const [viewStep, setViewStep] = useState<ViewStep>('units');

  const [unitModal, setUnitModal] = useState(false);
  const [roomModal, setRoomModal] = useState(false);
  const [bedModal, setBedModal] = useState(false);
  const [assignModal, setAssignModal] = useState<{ bedId: string; bedNumber: string } | null>(null);
  const [viewAssigneeBed, setViewAssigneeBed] = useState<{
    bedNumber: string;
    assigneeName: string;
    assigneeMobile: string | null;
    assigneeNidFrontUrl: string | null;
    assigneeNidBackUrl: string | null;
    assignedAt: string | null;
  } | null>(null);
  const [editRoomModal, setEditRoomModal] = useState<{ id: string; roomNumber: string; totalBeds: number } | null>(null);
  const [editRoomNumber, setEditRoomNumber] = useState('');
  const [editRoomTotalBeds, setEditRoomTotalBeds] = useState(1);

  const [unitNumber, setUnitNumber] = useState('');
  const [unitFloor, setUnitFloor] = useState(1);
  const [roomNumber, setRoomNumber] = useState('');
  const [bedNumber, setBedNumber] = useState('');
  const [bedBasePrice, setBedBasePrice] = useState(0);
  const [bedPictureFile, setBedPictureFile] = useState<File | null>(null);
  const [selectedRegisteredUserId, setSelectedRegisteredUserId] = useState('');
  const [editBedModal, setEditBedModal] = useState<{ id: string; bedNumber: string; basePrice: number; pictureUrl: string; assigneeName: string } | null>(null);
  const [editBedNumber, setEditBedNumber] = useState('');
  const [editBedBasePrice, setEditBedBasePrice] = useState(0);
  const [editBedPictureFile, setEditBedPictureFile] = useState<File | null>(null);
  const [editBedPictureUrl, setEditBedPictureUrl] = useState('');
  const [editAssigneeName, setEditAssigneeName] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!buildingId) return;
    Promise.all([
      api.get('/hostels').then((r) => (r.data.hostels || []).find((h: any) => (h.id || h._id) === buildingId)),
      api.get(`/units?hostelId=${buildingId}`).then((r) => r.data.units || []),
      api.get('/registered-users').then((r) => r.data.users || []),
    ])
      .then(([b, u, registered]) => {
        setBuilding(b || null);
        setUnits(u);
        setRegisteredUsers(registered);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [buildingId]);

  useEffect(() => {
    if (!buildingId) return;
    const q = selectedUnitId ? `unitId=${selectedUnitId}&hostelId=${buildingId}` : `hostelId=${buildingId}`;
    api.get(`/rooms?${q}`).then((r) => setRooms(r.data.rooms || [])).catch(() => setRooms([]));
  }, [buildingId, selectedUnitId]);

  useEffect(() => {
    if (!selectedRoomId) {
      setBeds([]);
      return;
    }
    api.get(`/rooms/${selectedRoomId}/beds`).then((r) => setBeds(r.data.beds || [])).catch(() => setBeds([]));
  }, [selectedRoomId]);

  const refreshUnits = () => {
    api.get(`/units?hostelId=${buildingId}`).then((r) => setUnits(r.data.units || [])).catch(() => {});
  };
  const refreshRooms = () => {
    const q = selectedUnitId ? `unitId=${selectedUnitId}&hostelId=${buildingId}` : `hostelId=${buildingId}`;
    api.get(`/rooms?${q}`).then((r) => setRooms(r.data.rooms || [])).catch(() => {});
  };
  const refreshBeds = async () => {
    if (selectedRoomId) {
      const r = await api.get(`/rooms/${selectedRoomId}/beds`).catch(() => ({ data: { beds: [] } }));
      setBeds(r.data?.beds ?? []);
    }
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/units', { hostelId: buildingId, unitNumber: unitNumber.trim(), floor: unitFloor });
      setUnitModal(false);
      setUnitNumber('');
      setUnitFloor(1);
      refreshUnits();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add unit');
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/rooms', {
        hostelId: buildingId,
        unitId: selectedUnitId || undefined,
        roomNumber: roomNumber.trim(),
        floor: 0,
        totalBeds: 0,
      });
      setRoomModal(false);
      setRoomNumber('');
      refreshRooms();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add room');
    }
  };

  const openEditRoom = (r: any) => {
    setEditRoomModal({ id: r.id, roomNumber: r.roomNumber, totalBeds: r.totalBeds });
    setEditRoomNumber(r.roomNumber);
    setEditRoomTotalBeds(r.totalBeds);
  };

  const handleEditRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRoomModal) return;
    try {
      await api.patch(`/rooms/${editRoomModal.id}`, {
        roomNumber: editRoomNumber.trim(),
        totalBeds: editRoomTotalBeds,
      });
      setEditRoomModal(null);
      refreshRooms();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update room');
    }
  };

  const handleAddBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId) return;
    const num = bedNumber.trim();
    if (!num) {
      alert('Please enter a bed number (e.g. B1, B2).');
      return;
    }
    try {
      setUploading(true);
      const res = await api.post('/beds', { roomId: selectedRoomId, bedNumber: num, basePrice: bedBasePrice });
      const raw = res.data?.bed ?? res.data;
      const bedId = raw?.id ?? raw?._id;

      let pictureUrl: string | null = null;
      if (bedPictureFile && bedId) {
        try {
          pictureUrl = await uploadBedPicture(bedPictureFile, bedId);
          await api.patch(`/beds/${bedId}`, { pictureUrl });
        } catch (uploadErr: unknown) {
          const msg = uploadErr instanceof Error ? uploadErr.message : 'Unknown upload error';
          alert(`Bed created but image upload failed: ${msg}`);
        }
      }

      setBedModal(false);
      setBedNumber('');
      setBedBasePrice(0);
      setBedPictureFile(null);
      if (raw && bedId) {
        const newRow = {
          id: bedId,
          _id: bedId,
          roomId: raw.roomId ?? raw.room_id ?? selectedRoomId,
          bedNumber: raw.bedNumber ?? raw.bed_number ?? num,
          basePrice: Number(raw.basePrice ?? raw.base_price ?? bedBasePrice),
          pictureUrl,
          residentId: null,
          resident: null,
          assignmentPrice: null,
          isOccupied: raw.is_occupied ?? false,
          isActive: raw.is_active ?? true,
        };
        setBeds((prev) => [...prev, newRow]);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add bed');
    } finally {
      setUploading(false);
    }
  };

  const handleAssignBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModal || !selectedRegisteredUserId) {
      alert('Please select a registered user.');
      return;
    }
    try {
      setUploading(true);
      await api.post(`/beds/${assignModal.bedId}/assign`, {
        registeredUserId: selectedRegisteredUserId,
        price: 0,
      });
      setAssignModal(null);
      setSelectedRegisteredUserId('');
      refreshBeds();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to assign bed');
    } finally {
      setUploading(false);
    }
  };

  const handleUnassign = async (bedId: string) => {
    try {
      await api.patch(`/beds/${bedId}/unassign`);
      refreshBeds();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to unassign');
    }
  };

  const openEditBed = (b: any) => {
    setEditBedModal({
      id: b.id,
      bedNumber: b.bedNumber,
      basePrice: b.basePrice,
      pictureUrl: b.pictureUrl || '',
      assigneeName: b.assigneeName || '',
    });
    setEditBedNumber(b.bedNumber);
    setEditBedBasePrice(b.basePrice);
    setEditBedPictureUrl(b.pictureUrl || '');
    setEditBedPictureFile(null);
    setEditAssigneeName(b.assigneeName || '');
  };

  const handleEditBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBedModal) return;
    try {
      setUploading(true);
      let pictureUrl = editBedPictureUrl;
      if (editBedPictureFile) {
        pictureUrl = await uploadBedPicture(editBedPictureFile, editBedModal.id);
      }
      await api.patch(`/beds/${editBedModal.id}`, {
        bedNumber: editBedNumber.trim(),
        basePrice: editBedBasePrice,
        pictureUrl: pictureUrl || null,
        assigneeName: editAssigneeName.trim() || null,
      });
      setEditBedModal(null);
      setEditBedPictureFile(null);
      refreshBeds();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err && typeof err === 'object' && 'response' in err ? (err as any).response?.data?.message : null) || 'Failed to update bed';
      alert(msg);
    } finally {
      setUploading(false);
    }
  };

  if (loading || !building) {
    return (
      <DashboardLayout requiredRole={['super_admin']}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout requiredRole={['super_admin']}>
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/super-admin/hostels" className="text-gray-500 hover:text-gray-700">
            ← Buildings
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">{building.name}</h2>
        </div>

        {viewStep === 'units' && (
          <section>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Units</h3>
              <button
                type="button"
                onClick={() => setUnitModal(true)}
                className="px-3 py-1.5 bg-black text-yellow-400 rounded-lg hover:bg-gray-800 text-sm font-medium"
              >
                + Add Unit
              </button>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit number</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Floor</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {units.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-gray-500 text-sm">
                        No units. Add a unit (e.g. A100, B100).
                      </td>
                    </tr>
                  ) : (
                    units.map((u: any) => (
                      <tr key={u.id}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{u.unitNumber}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{u.floor}</td>
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUnitId(u.id);
                              setSelectedRoomId(null);
                              setViewStep('rooms');
                            }}
                            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                          >
                            Show rooms
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {viewStep === 'rooms' && selectedUnitId && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => { setViewStep('units'); setSelectedUnitId(null); setSelectedRoomId(null); }}
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                ← Back to units
              </button>
              <span className="text-gray-400">|</span>
              <span className="text-sm text-gray-700">
                {building.name} → Unit {units.find((u: any) => u.id === selectedUnitId)?.unitNumber ?? selectedUnitId}
              </span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Rooms</h3>
              <button
                type="button"
                onClick={() => setRoomModal(true)}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
              >
                + Add Room
              </button>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Beds</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rooms.filter((r: any) => r.unitId === selectedUnitId).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-gray-500 text-sm">
                        No rooms in this unit. Add a room.
                      </td>
                    </tr>
                  ) : (
                    rooms
                      .filter((r: any) => r.unitId === selectedUnitId)
                      .map((r: any) => (
                        <tr key={r.id}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{r.roomNumber}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{r.bedCount ?? 0}</td>
                          <td className="px-4 py-2 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => openEditRoom(r)}
                              className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRoomId(r.id);
                                setViewStep('beds');
                              }}
                              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                            >
                              Manage beds
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {viewStep === 'beds' && selectedRoomId && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => { setViewStep('rooms'); setSelectedRoomId(null); }}
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                ← Back to rooms
              </button>
              <span className="text-gray-400">|</span>
              <span className="text-sm text-gray-700">
                {building.name} → Unit {units.find((u: any) => u.id === selectedUnitId)?.unitNumber} → Room {rooms.find((r: any) => r.id === selectedRoomId)?.roomNumber}
              </span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Beds</h3>
              <button
                type="button"
                onClick={() => setBedModal(true)}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
              >
                + Add Bed
              </button>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bed</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Picture</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Assigned to</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {beds.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-500 text-sm">
                        No beds. Add beds and assign to residents.
                      </td>
                    </tr>
                  ) : (
                    beds.map((b: any) => (
                      <tr key={b.id}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{b.bedNumber}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">${b.basePrice}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {b.pictureUrl ? (
                            <a href={b.pictureUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 underline">
                              View
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {b.assigneeName || b.resident?.name || '—'}
                        </td>
                        <td className="px-4 py-2 text-right space-x-2">
                          {(b.residentId || b.assigneeName) ? (
                            <button
                              type="button"
                              onClick={() =>
                                setViewAssigneeBed({
                                  bedNumber: b.bedNumber,
                                  assigneeName: b.assigneeName || b.resident?.name || '',
                                  assigneeMobile: b.assigneeMobile ?? null,
                                  assigneeNidFrontUrl: b.assigneeNidFrontUrl ?? null,
                                  assigneeNidBackUrl: b.assigneeNidBackUrl ?? null,
                                  assignedAt: b.assignedAt ?? null,
                                })
                              }
                              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                            >
                              View
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => openEditBed(b)}
                            className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                          >
                            Edit
                          </button>
                          {(b.residentId || b.assigneeName) ? (
                            <button
                              type="button"
                              onClick={() => handleUnassign(b.id)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Unassign
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setAssignModal({ bedId: b.id, bedNumber: b.bedNumber })}
                              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                            >
                              Assign
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {unitModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
              <h4 className="text-lg font-semibold mb-4 text-gray-900">Add Unit</h4>
              <form onSubmit={handleAddUnit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900">Unit number (e.g. A100, B100)</label>
                  <input
                    type="text"
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Floor (100 = 1st)</label>
                  <input
                    type="number"
                    min={0}
                    value={unitFloor}
                    onChange={(e) => setUnitFloor(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setUnitModal(false)} className="px-4 py-2 text-gray-600">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-black text-yellow-400 rounded-lg">
                    Add
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {roomModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
              <h4 className="text-lg font-semibold mb-4 text-gray-900">Add Room</h4>
              <form onSubmit={handleAddRoom} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900">Room number</label>
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400"
                    placeholder="e.g. R1, R2"
                    required
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setRoomModal(false)} className="px-4 py-2 text-gray-600">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
                    Add
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {bedModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
              <h4 className="text-lg font-semibold mb-4 text-gray-900">Add Bed to this room</h4>
              <form onSubmit={handleAddBed} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900">Bed number (unique in this room)</label>
                  <input
                    type="text"
                    value={bedNumber}
                    onChange={(e) => setBedNumber(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400"
                    placeholder={beds.length === 0 ? 'e.g. B1' : `e.g. B${beds.length + 1}`}
                    required
                  />
                  {beds.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      Existing: {beds.map((b: any) => b.bedNumber).join(', ')}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Price</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={bedBasePrice}
                    onChange={(e) => setBedBasePrice(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Picture (optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setBedPictureFile(e.target.files?.[0] || null)}
                    className="mt-1 block w-full text-sm text-gray-900 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                  />
                  {bedPictureFile && (
                    <div className="mt-2">
                      <img
                        src={URL.createObjectURL(bedPictureFile)}
                        alt="Preview"
                        className="w-24 h-24 object-cover rounded-md border border-gray-200"
                      />
                    </div>
                  )}
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => { setBedModal(false); setBedPictureFile(null); }} className="px-4 py-2 text-gray-600">
                    Cancel
                  </button>
                  <button type="submit" disabled={uploading} className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50">
                    {uploading ? 'Uploading...' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editBedModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
              <h4 className="text-lg font-semibold mb-4 text-gray-900">Edit Bed {editBedModal.bedNumber}</h4>
              <form onSubmit={handleEditBed} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900">Bed number</label>
                  <input
                    type="text"
                    value={editBedNumber}
                    onChange={(e) => setEditBedNumber(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Price</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={editBedBasePrice}
                    onChange={(e) => setEditBedBasePrice(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Picture</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setEditBedPictureFile(file);
                      if (file) setEditBedPictureUrl('');
                    }}
                    className="mt-1 block w-full text-sm text-gray-900 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                  />
                  {editBedPictureFile ? (
                    <div className="mt-2">
                      <img
                        src={URL.createObjectURL(editBedPictureFile)}
                        alt="New preview"
                        className="w-24 h-24 object-cover rounded-md border border-gray-200"
                      />
                    </div>
                  ) : editBedPictureUrl ? (
                    <div className="mt-2 flex items-center gap-3">
                      <img
                        src={editBedPictureUrl}
                        alt="Current"
                        className="w-24 h-24 object-cover rounded-md border border-gray-200"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <button
                        type="button"
                        onClick={() => setEditBedPictureUrl('')}
                        className="text-red-600 hover:text-red-800 text-xs font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Assigned to</label>
                  <input
                    type="text"
                    value={editAssigneeName}
                    onChange={(e) => setEditAssigneeName(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400"
                    placeholder="Assignee name"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button type="button" onClick={() => { setEditBedModal(null); setEditBedPictureFile(null); }} className="px-4 py-2 text-gray-600">
                    Cancel
                  </button>
                  <button type="submit" disabled={uploading} className="px-4 py-2 bg-black text-yellow-400 rounded-lg disabled:opacity-50">
                    {uploading ? 'Uploading...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editRoomModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
              <h4 className="text-lg font-semibold mb-4 text-gray-900">Edit Room {editRoomModal.roomNumber}</h4>
              <form onSubmit={handleEditRoom} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900">Room number</label>
                  <input
                    type="text"
                    value={editRoomNumber}
                    onChange={(e) => setEditRoomNumber(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Number of beds</label>
                  <input
                    type="number"
                    min={1}
                    value={editRoomTotalBeds}
                    onChange={(e) => setEditRoomTotalBeds(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setEditRoomModal(null)} className="px-4 py-2 text-gray-600">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-black text-yellow-400 rounded-lg">
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {assignModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl max-h-[90vh] overflow-y-auto">
              <h4 className="text-lg font-semibold mb-2 text-gray-900">Assign bed {assignModal.bedNumber}</h4>
              <form onSubmit={handleAssignBed} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900">Select registered user</label>
                  <select
                    value={selectedRegisteredUserId}
                    onChange={(e) => setSelectedRegisteredUserId(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                    required
                  >
                    <option value="">Select user</option>
                    {registeredUsers.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.name} {u.mobileNumber ? `(${u.mobileNumber})` : ''}
                      </option>
                    ))}
                  </select>
                  {registeredUsers.length === 0 && (
                    <p className="mt-1 text-xs text-red-600">
                      No registered users found. Add users from Register User page first.
                    </p>
                  )}
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => { setAssignModal(null); setSelectedRegisteredUserId(''); }}
                    className="px-4 py-2 text-gray-600"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={uploading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">
                    {uploading ? 'Uploading...' : 'Assign'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {viewAssigneeBed && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
              <h4 className="text-lg font-semibold mb-4 text-gray-900">Assignee details — Bed {viewAssigneeBed.bedNumber}</h4>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-gray-500 font-medium">Name</dt>
                  <dd className="text-gray-900 mt-0.5">{viewAssigneeBed.assigneeName || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">Mobile number</dt>
                  <dd className="text-gray-900 mt-0.5">{viewAssigneeBed.assigneeMobile || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">Assigned at</dt>
                  <dd className="text-gray-900 mt-0.5">
                    {viewAssigneeBed.assignedAt ? new Date(viewAssigneeBed.assignedAt).toLocaleString() : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium mb-1">NID (front)</dt>
                  <dd className="mt-0.5">
                    {viewAssigneeBed.assigneeNidFrontUrl ? (
                      <a href={viewAssigneeBed.assigneeNidFrontUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 underline">
                        View image
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium mb-1">NID (back)</dt>
                  <dd className="mt-0.5">
                    {viewAssigneeBed.assigneeNidBackUrl ? (
                      <a href={viewAssigneeBed.assigneeNidBackUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 underline">
                        View image
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </dd>
                </div>
              </dl>
              <div className="mt-6 flex justify-end">
                <button type="button" onClick={() => setViewAssigneeBed(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
