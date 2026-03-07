import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { AdminLayout } from './Dashboard';
import { DollarSign, Save, Edit, AlertCircle } from 'lucide-react';
import { useAlert } from '@/Components/AlertModal';

export default function PayoutRates({ rates = [] }) {
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const { alert, AlertComponent } = useAlert();

    const handleEdit = (rate) => {
        setEditingId(rate.id);
        setEditValue(rate.payout_rate.toString());
        setSuccessMsg('');
    };

    const handleSave = async (id) => {
        setSaving(true);
        setSuccessMsg('');
        try {
            const response = await fetch(`/admin/payout-rates/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ payout_rate: parseFloat(editValue) }),
            });

            let data;
            try {
                data = await response.json();
            } catch {
                alert.error('ไม่สามารถอ่านผลลัพธ์จากเซิร์ฟเวอร์ได้');
                return;
            }

            if (!response.ok || !data.success) {
                alert.error(data.message || 'เกิดข้อผิดพลาดในการบันทึก');
                return;
            }

            setSuccessMsg(data.message || 'บันทึกสำเร็จ');
            setEditingId(null);
            setTimeout(() => {
                router.reload();
            }, 1500);
        } catch (error) {
            alert.error('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + error.message, 'เชื่อมต่อไม่ได้');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditValue('');
    };

    const getTypeIcon = (betTypeId) => {
        const icons = {
            1: '2️⃣', 2: '2️⃣', 3: '3️⃣', 4: '3️⃣', 5: '1️⃣', 6: '1️⃣', 9: '3️⃣', 10: '4️⃣'
        };
        return icons[betTypeId] || '🎰';
    };

    const getTypeColor = (betTypeId) => {
        if ([4, 9].includes(betTypeId)) return 'from-purple-500/20 to-[#0d1e36] border-purple-500/30';
        if ([3].includes(betTypeId)) return 'from-orange-500/20 to-[#0d1e36] border-orange-500/30';
        if ([1, 2].includes(betTypeId)) return 'from-blue-500/20 to-[#0d1e36] border-blue-500/30';
        if ([5, 6].includes(betTypeId)) return 'from-emerald-500/20 to-[#0d1e36] border-emerald-500/30';
        return 'from-yellow-500/20 to-[#0d1e36] border-yellow-500/30';
    };

    return (
        <AdminLayout>
            <Head title="อัตราจ่าย" />

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <DollarSign className="text-yellow-400" size={28} />
                        จัดการอัตราจ่าย
                    </h2>
                    <p className="text-gray-400">{rates.length} ประเภท</p>
                </div>
            </div>

            {/* Info Alert */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-6 flex items-start gap-3">
                <AlertCircle size={20} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-200">
                    <strong>อัตราจ่ายจะมีผลทันที</strong> — เมื่อแก้ไขอัตราจ่ายแล้ว จะมีผลกับการแทงใหม่ทั้งหมด รวมถึงการคำนวณรางวัลด้วย
                </div>
            </div>

            {/* Success Message */}
            {successMsg && (
                <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-2xl p-4 mb-6 flex items-center gap-3 animate-pulse">
                    <span className="text-xl">✅</span>
                    <span className="text-emerald-300 font-bold">{successMsg}</span>
                </div>
            )}

            {/* Rates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {rates.map((rate) => (
                    <div
                        key={rate.id}
                        className={`bg-gradient-to-br ${getTypeColor(rate.bet_type_id)} rounded-2xl p-5 border transition-all hover:scale-[1.02]`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">{getTypeIcon(rate.bet_type_id)}</span>
                                <h3 className="text-white font-bold text-lg">{rate.name}</h3>
                            </div>
                            <span className="text-gray-500 text-xs font-mono">ID: {rate.bet_type_id}</span>
                        </div>

                        {editingId === rate.id ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-gray-400 text-xs block mb-1">อัตราจ่าย (ต่อ 1 บาท)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className="w-full px-4 py-3 bg-[#0a1628] border-2 border-yellow-500/50 rounded-xl text-yellow-400 text-xl font-bold text-center focus:border-yellow-500 outline-none"
                                        autoFocus
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCancel}
                                        className="flex-1 py-2.5 bg-gray-700 text-white rounded-xl text-sm font-medium hover:bg-gray-600 transition-colors"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        onClick={() => handleSave(rate.id)}
                                        disabled={saving}
                                        className="flex-1 py-2.5 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold rounded-xl text-sm shadow-lg shadow-yellow-500/30 hover:from-yellow-300 hover:to-yellow-400 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                                    >
                                        <Save size={14} />
                                        {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="text-center mb-3">
                                    <span className="text-yellow-400 text-3xl font-black">
                                        {Number(rate.payout_rate).toFixed(2)}
                                    </span>
                                    <span className="text-gray-400 text-sm block mt-1">บาท / 1 บาท</span>
                                </div>
                                <button
                                    onClick={() => handleEdit(rate)}
                                    className="w-full flex items-center justify-center gap-1 py-2.5 bg-[#0a1628] text-yellow-400 rounded-xl text-sm font-medium hover:bg-yellow-500/10 transition-colors"
                                >
                                    <Edit size={14} />
                                    แก้ไข
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {AlertComponent}
        </AdminLayout>
    );
}
