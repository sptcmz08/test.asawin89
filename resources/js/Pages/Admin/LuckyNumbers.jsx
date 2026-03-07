import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { AdminLayout } from './Dashboard';
import { Plus, Trash2, Star, Ban, X } from 'lucide-react';
import { useAlert } from '@/Components/AlertModal';

export default function AdminLuckyNumbers({ luckyNumbers = [], lotteryTypes = [], betTypeNames = {} }) {
    const [showModal, setShowModal] = useState(false);
    const { alert, AlertComponent } = useAlert();
    const [formData, setFormData] = useState({
        lottery_type_id: '',
        bet_type_id: '',
        number: '',
        is_special: false,
        is_forbidden: false,
        payout_rate: '',
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            await fetch('/admin/lucky-numbers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });
            router.reload();
            setShowModal(false);
            setFormData({
                lottery_type_id: '',
                bet_type_id: '',
                number: '',
                is_special: false,
                is_forbidden: false,
                payout_rate: '',
            });
        } catch (error) {
            alert.error('เกิดข้อผิดพลาดในการบันทึก');
        }
    };

    const handleDelete = async (id) => {
        alert.confirm('ต้องการลบเลขนี้?', async () => {
            try {
                await fetch(`/admin/lucky-numbers/${id}`, {
                    method: 'DELETE',
                });
                alert.success('ลบเลขเรียบร้อย', 'ลบสำเร็จ!');
                setTimeout(() => router.reload(), 1500);
            } catch (error) {
                alert.error('เกิดข้อผิดพลาดในการลบ');
            }
        }, 'ลบเลข');
    };

    const specialNumbers = luckyNumbers.filter(n => n.is_special);
    const forbiddenNumbers = luckyNumbers.filter(n => n.is_forbidden);

    return (
        <AdminLayout>
            <Head title="เลขอั้น / ห้ามแทง" />

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Star className="text-yellow-400" size={28} />
                        เลขอั้น / ห้ามแทง
                    </h2>
                    <p className="text-gray-400">{luckyNumbers.length} รายการ • ลบอัตโนมัติเมื่อออกรางวัล</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold rounded-xl shadow-lg shadow-yellow-500/30"
                >
                    <Plus size={20} /> เพิ่มเลข
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="bg-gradient-to-br from-yellow-500/20 to-[#0d1e36] rounded-2xl p-4 border border-yellow-500/30">
                    <div className="flex items-center gap-2 mb-1">
                        <Star size={18} className="text-yellow-400" />
                        <span className="text-gray-400 text-sm">เลขอั้น (จ่ายลด)</span>
                    </div>
                    <p className="text-yellow-400 text-2xl font-bold">{specialNumbers.length}</p>
                </div>
                <div className="bg-gradient-to-br from-red-500/20 to-[#0d1e36] rounded-2xl p-4 border border-red-500/30">
                    <div className="flex items-center gap-2 mb-1">
                        <Ban size={18} className="text-red-400" />
                        <span className="text-gray-400 text-sm">เลขห้ามแทง</span>
                    </div>
                    <p className="text-red-400 text-2xl font-bold">{forbiddenNumbers.length}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Special Numbers */}
                <div className="bg-[#0d1e36]/80 backdrop-blur rounded-2xl p-5 border border-yellow-500/30">
                    <div className="flex items-center gap-2 mb-4">
                        <Star className="text-yellow-400" size={22} />
                        <h3 className="text-yellow-400 font-bold text-lg">เลขอั้น (จ่ายลด)</h3>
                    </div>

                    {specialNumbers.length === 0 ? (
                        <div className="text-center py-8">
                            <Star size={40} className="mx-auto mb-2 opacity-30 text-yellow-400" />
                            <p className="text-gray-500">ไม่มีเลขอั้น</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {specialNumbers.map((num) => (
                                <div key={num.id} className="flex items-center justify-between bg-[#0a1628] rounded-xl p-3 hover:bg-[#1a3a5c]/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className="text-yellow-400 font-bold font-mono text-xl bg-yellow-500/10 px-3 py-1 rounded-lg">
                                            {num.number}
                                        </span>
                                        <div className="flex flex-col">
                                            <span className="text-gray-500 text-xs">
                                                {num.lottery_type?.name || '—'}
                                                {num.bet_type_id && betTypeNames[num.bet_type_id] ? ` • ${betTypeNames[num.bet_type_id]}` : ''}
                                            </span>
                                            <span className="text-gray-500 text-xs">
                                                จ่าย {num.payout_rate || 50}%
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(num.id)}
                                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Forbidden Numbers */}
                <div className="bg-[#0d1e36]/80 backdrop-blur rounded-2xl p-5 border border-red-500/30">
                    <div className="flex items-center gap-2 mb-4">
                        <Ban className="text-red-400" size={22} />
                        <h3 className="text-red-400 font-bold text-lg">เลขห้ามแทง</h3>
                    </div>

                    {forbiddenNumbers.length === 0 ? (
                        <div className="text-center py-8">
                            <Ban size={40} className="mx-auto mb-2 opacity-30 text-red-400" />
                            <p className="text-gray-500">ไม่มีเลขห้ามแทง</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {forbiddenNumbers.map((num) => (
                                <div key={num.id} className="flex items-center justify-between bg-[#0a1628] rounded-xl p-3 hover:bg-[#1a3a5c]/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className="text-red-400 font-bold font-mono text-xl bg-red-500/10 px-3 py-1 rounded-lg">
                                            {num.number}
                                        </span>
                                        <span className="text-gray-500 text-xs">
                                            {num.lottery_type?.name || '—'}
                                            {num.bet_type_id && betTypeNames[num.bet_type_id] ? ` • ${betTypeNames[num.bet_type_id]}` : ''}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(num.id)}
                                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Add Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gradient-to-br from-[#0d1e36] to-[#0a1628] rounded-3xl w-full max-w-md p-6 border border-yellow-500/30 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Star className="text-yellow-400" size={24} />
                                เพิ่มเลขอั้น / ห้ามแทง
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-gray-400 text-sm block mb-2">ประเภทหวย</label>
                                <select
                                    value={formData.lottery_type_id}
                                    onChange={(e) => setFormData({ ...formData, lottery_type_id: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#0a1628] border-2 border-[#1a3a5c] rounded-xl text-white focus:border-yellow-500 outline-none"
                                    required
                                >
                                    <option value="">เลือกประเภทหวย</option>
                                    {lotteryTypes.map(lt => (
                                        <option key={lt.id} value={lt.id}>{lt.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-gray-400 text-sm block mb-2">ประเภทการแทง</label>
                                <select
                                    value={formData.bet_type_id}
                                    onChange={(e) => setFormData({ ...formData, bet_type_id: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#0a1628] border-2 border-[#1a3a5c] rounded-xl text-white focus:border-yellow-500 outline-none"
                                >
                                    <option value="">ทุกประเภท</option>
                                    {Object.entries(betTypeNames).map(([id, name]) => (
                                        <option key={id} value={id}>{name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-gray-400 text-sm block mb-2">เลข</label>
                                <input
                                    type="text"
                                    value={formData.number}
                                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                                    placeholder="เช่น 123, 45"
                                    className="w-full px-4 py-3 bg-[#0a1628] border-2 border-[#1a3a5c] rounded-xl text-white text-center text-xl font-mono focus:border-yellow-500 outline-none"
                                    required
                                />
                            </div>

                            <div className="flex gap-4">
                                <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.is_special && !formData.is_forbidden ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'border-[#1a3a5c] text-gray-400 hover:border-yellow-500/50'}`}>
                                    <input
                                        type="radio"
                                        name="type"
                                        className="hidden"
                                        checked={formData.is_special && !formData.is_forbidden}
                                        onChange={() => setFormData({ ...formData, is_special: true, is_forbidden: false })}
                                    />
                                    <Star size={18} />
                                    เลขอั้น
                                </label>
                                <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.is_forbidden ? 'bg-red-500/20 border-red-500 text-red-400' : 'border-[#1a3a5c] text-gray-400 hover:border-red-500/50'}`}>
                                    <input
                                        type="radio"
                                        name="type"
                                        className="hidden"
                                        checked={formData.is_forbidden}
                                        onChange={() => setFormData({ ...formData, is_special: false, is_forbidden: true })}
                                    />
                                    <Ban size={18} />
                                    ห้ามแทง
                                </label>
                            </div>

                            {formData.is_special && (
                                <div>
                                    <label className="text-gray-400 text-sm block mb-2">อัตราจ่าย (%)</label>
                                    <input
                                        type="number"
                                        value={formData.payout_rate}
                                        onChange={(e) => setFormData({ ...formData, payout_rate: e.target.value })}
                                        placeholder="50"
                                        className="w-full px-4 py-3 bg-[#0a1628] border-2 border-[#1a3a5c] rounded-xl text-white text-center focus:border-yellow-500 outline-none"
                                    />
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold rounded-xl shadow-lg shadow-yellow-500/30"
                                >
                                    บันทึก
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {AlertComponent}
        </AdminLayout>
    );
}
