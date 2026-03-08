'use client';

import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function BuildingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const buildingId = params.id as string;
  const [building, setBuilding] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [beds, setBeds] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const [unitModal, setUnitModal] = useState(false);
  const [roomModal, setRoomModal] = useState(false);
  const [bedModal, setBedModal] = useState(false);
  const [assignModal, setAssignModal] = useState<{ bedId: string; bedNumber: string } | null>(null);

  const [unitNumber, setUnitNumber] = useState('');
  const [unitFloor, setUnitFloor] = useState(1);
  const [roomNumber, setRoomNumber] = useState('');
  const [roomFloor, setRoomFloor] = useState(1);
  const [roomTotalBeds, setRoomTotalBeds] = useState(1);
  const [bedNumber, setBedNumber] = useState('');
  const [bedBasePrice, setBedBasePrice] = useState(0);
  const [assigneeName, setAssigneeName] = useState('');
  const [assignPrice, setAssignPrice] = useState('');

  useEffect(() => {
    if (!buildingId) return;
    Promise.all([
      api.get('/hostels').then((r) => (r.data.hostels || []).find((h: any) => (h.id || h._id) === buildingId)),
      api.get(`/units?hostelId=${buildingId}`).then((r) => r.data.units || []),
      api.get('/users').then((r) => (r.data.users || []).filter((u: any) => u.role === 'resident')),
    ])
      .then(([b, u, res]) => {
        setBuilding(b || null);
        setUnits(u);
        setResidents(res);
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
        floor: roomFloor,
        totalBeds: roomTotalBeds,
      });
      setRoomModal(false);
      setRoomNumber('');
      setRoomFloor(1);
      setRoomTotalBeds(1);
      refreshRooms();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add room');
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
      const res = await api.post('/beds', { roomId: selectedRoomId, bedNumber: num, basePrice: bedBasePrice });
      setBedModal(false);
      setBedNumber('');
      setBedBasePrice(0);
      const raw = res.data?.bed ?? res.data;
      if (raw && (raw.id || raw._id)) {
        const newRow = {
          id: raw.id ?? raw._id,
          _id: raw._id ?? raw.id,
          roomId: raw.roomId ?? raw.room_id ?? selectedRoomId,
          bedNumber: raw.bedNumber ?? raw.bed_number ?? num,
          basePrice: Number(raw.basePrice ?? raw.base_price ?? bedBasePrice),
          residentId: null,
          resident: null,
          assignmentPrice: null,
          isOccupied: raw.is_occupied ?? false,
          isActive: raw.is_active ?? true,
        };
        setBeds((prev) => [...prev, newRow]);
      }
      // Do not call refreshBeds() here: if GET fails it overwrites state with [] and the new bed disappears
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add bed');
    }
  };

  const handleAssignBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModal || !assigneeName.trim() || assignPrice === '') return;
    try {
      await api.post(`/beds/${assignModal.bedId}/assign`, { assigneeName: assigneeName.trim(), price: Number(assignPrice) });
      setAssignModal(null);
      setAssigneeName('');
      setAssignPrice('');
      refreshBeds();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to assign bed');
    }
  };

  const handleUnassign = async (bedId: string) => {
    if (!confirm('Unassign this bed from the resident?')) return;
    try {
      await api.patch(`/beds/${bedId}/unassign`);
      refreshBeds();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to unassign');
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

        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Units (floor + unit number)</h3>
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
                    <tr
                      key={u.id}
                      className={selectedUnitId === u.id ? 'bg-indigo-50' : ''}
                    >
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{u.unitNumber}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{u.floor}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUnitId(selectedUnitId === u.id ? null : u.id);
                            setSelectedRoomId(null);
                          }}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        >
                          {selectedUnitId === u.id ? 'Hide rooms' : 'Show rooms'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selectedUnitId && (
          <section>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Rooms in this unit</h3>
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
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Floor</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Beds</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rooms.filter((r: any) => r.unitId === selectedUnitId).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-gray-500 text-sm">
                        No rooms in this unit. Add a room.
                      </td>
                    </tr>
                  ) : (
                    rooms
                      .filter((r: any) => r.unitId === selectedUnitId)
                      .map((r: any) => (
                        <tr
                          key={r.id}
                          className={selectedRoomId === r.id ? 'bg-indigo-50' : ''}
                        >
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{r.roomNumber}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{r.floor}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{r.totalBeds}</td>
                          <td className="px-4 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRoomId(selectedRoomId === r.id ? null : r.id);
                              }}
                              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                            >
                              {selectedRoomId === r.id ? 'Hide beds' : 'Manage beds'}
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

        {selectedRoomId && (
          <section>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Beds in this room (per-bed price → client price)</h3>
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
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Base price</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Assigned to</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Client price</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {beds.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-500 text-sm">
                        No beds. Add beds and assign to residents (each can have a different price).
                      </td>
                    </tr>
                  ) : (
                    beds.map((b: any) => (
                      <tr key={b.id}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{b.bedNumber}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">${b.basePrice}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {b.assigneeName || b.resident?.name || '—'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {b.assignmentPrice != null ? `$${b.assignmentPrice}` : '—'}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {b.residentId ? (
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
              <h4 className="text-lg font-semibold mb-4">Add Unit</h4>
              <form onSubmit={handleAddUnit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Unit number (e.g. A100, B100)</label>
                  <input
                    type="text"
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Floor (100 = 1st)</label>
                  <input
                    type="number"
                    min={0}
                    value={unitFloor}
                    onChange={(e) => setUnitFloor(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
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
              <h4 className="text-lg font-semibold mb-4">Add Room</h4>
              <form onSubmit={handleAddRoom} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Room number</label>
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="e.g. R1, R2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Floor</label>
                  <input
                    type="number"
                    min={0}
                    value={roomFloor}
                    onChange={(e) => setRoomFloor(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Number of beds in this room</label>
                  <input
                    type="number"
                    min={1}
                    value={roomTotalBeds}
                    onChange={(e) => setRoomTotalBeds(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
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
              <h4 className="text-lg font-semibold mb-4">Add Bed to this room</h4>
              <p className="text-sm text-gray-500 mb-3">Price is set when you assign the bed to a resident.</p>
              <form onSubmit={handleAddBed} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bed number (unique in this room)</label>
                  <input
                    type="text"
                    value={bedNumber}
                    onChange={(e) => setBedNumber(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
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
                  <label className="block text-sm font-medium text-gray-700">Base price ($) — optional, can set when assigning</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={bedBasePrice}
                    onChange={(e) => setBedBasePrice(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setBedModal(false)} className="px-4 py-2 text-gray-600">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg">
                    Add
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {assignModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
              <h4 className="text-lg font-semibold mb-2">Assign bed {assignModal.bedNumber}</h4>
              <form onSubmit={handleAssignBed} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Assignee name</label>
                  <input
                    type="text"
                    value={assigneeName}
                    onChange={(e) => setAssigneeName(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="Enter assignee name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price ($)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={assignPrice}
                    onChange={(e) => setAssignPrice(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => { setAssignModal(null); setAssigneeName(''); setAssignPrice(''); }} className="px-4 py-2 text-gray-600">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
                    Assign
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
