import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { AdminLayout } from './Dashboard';
import { Calendar, Clock, Edit, Power, X, CheckCircle, XCircle, Timer, RotateCcw, Settings } from 'lucide-react';
import { useAlert } from '@/Components/AlertModal';

const formatThaiTime = (timeStr) => {
    if (!timeStr) return '-';
    if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) return timeStr.substring(0, 5);
    return timeStr;
};

export default function AdminSchedule({ lotteryTypes = [], rounds = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [editingType, setEditingType] = useState(null);
    const { alert, AlertComponent } = useAlert();
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        draw_days: '',
        draw_time: '',
        open_time: '',
        close_time: '',
        schedule_type: 'weekly',
        is_active: true,
    });

    const scheduleTypeLabels = { daily: 'รายวัน', weekly: 'รายสัปดาห์', monthly: 'รายเดือน' };

    const handleEdit = (lottery) => {
        setEditingType(lottery);
        setFormData({
            name: lottery.name,
            slug: lottery.slug,
            draw_days: lottery.draw_days || '',
            draw_time: lottery.draw_time || '',
            open_time: lottery.open_time || '',
            close_time: lottery.close_time || '',
            schedule_type: lottery.schedule_type || 'weekly',
            is_active: lottery.is_active !== false,
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const url = editingType
                ? `/admin/lottery-types/${editingType.id}`
                : '/admin/lottery-types';

            const response = await fetch(url, {
                method: editingType ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                alert.error(data.message || 'เกิดข้อผิดพลาดในการบันทึก');
                return;
            }
            alert.success('บันทึกตารางงวดเรียบร้อย', 'บันทึกสำเร็จ!');
            setTimeout(() => router.reload(), 1500);
            setShowModal(false);
            setEditingType(null);
        } catch (error) {
            alert.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        }
    };

    const handleToggleActive = async (id, currentStatus) => {
        try {
            const response = await fetch(`/admin/lottery-types/${id}/toggle`, {
                method: 'POST',
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                alert.error(data.message || 'เกิดข้อผิดพลาด');
                return;
            }
            alert.success(currentStatus ? 'ปิดใช้งานเรียบร้อย' : 'เปิดใช้งานเรียบร้อย', 'ดำเนินการแล้ว');
            setTimeout(() => router.reload(), 1500);
        } catch (error) {
            alert.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        }
    };

    const activeCount = lotteryTypes.filter(l => l.is_active !== false).length;
    const inactiveCount = lotteryTypes.filter(l => l.is_active === false).length;

    return (
        <AdminLayout>
            <Head title="ตารางงวด" />

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Calendar className="text-blue-400" size={28} />
                        ตารางงวด
                    </h2>
                    <p className="text-gray-400">{lotteryTypes.length} ประเภทหวย</p>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="bg-gradient-to-br from-emerald-500/20 to-[#0d1e36] rounded-2xl p-4 border border-emerald-500/30">
                    <div className="flex items-center gap-2 mb-1">
                        <CheckCircle size={18} className="text-emerald-400" />
                        <span className="text-gray-400 text-sm">เปิดใช้งาน</span>
                    </div>
                    <p className="text-emerald-400 text-2xl font-bold">{activeCount}</p>
                </div>
                <div className="bg-gradient-to-br from-red-500/20 to-[#0d1e36] rounded-2xl p-4 border border-red-500/30">
                    <div className="flex items-center gap-2 mb-1">
                        <XCircle size={18} className="text-red-400" />
                        <span className="text-gray-400 text-sm">ปิดใช้งาน</span>
                    </div>
                    <p className="text-red-400 text-2xl font-bold">{inactiveCount}</p>
                </div>
            </div>

            {/* Lottery Types Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {lotteryTypes.map((lottery) => (
                    <div
                        key={lottery.id}
                        className={`bg-[#0d1e36]/80 backdrop-blur rounded-2xl p-5 border transition-all hover:border-yellow-500/50 ${lottery.is_active !== false ? 'border-[#1a3a5c]' : 'border-red-500/30 opacity-60'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-white font-bold text-lg">{lottery.name}</h3>
                                <p className="text-gray-500 text-xs font-mono">{lottery.slug}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${lottery.is_active !== false
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/20 text-red-400'
                                }`}>
                                {lottery.is_active !== false ? 'เปิด' : 'ปิด'}
                            </span>
                        </div>

                        <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                                <Calendar size={16} className="text-blue-400" />
                                <span>{lottery.draw_days || 'ไม่ระบุ'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                                <Clock size={16} className="text-yellow-400" />
                                <span>ออก: <span className="text-yellow-400 font-bold">{formatThaiTime(lottery.draw_time)}</span></span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                                <Timer size={16} className="text-orange-400" />
                                <span>ปิดรับ: <span className="text-orange-400">{lottery.close_before_minutes || 30} นาที</span>ก่อน</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                                <RotateCcw size={16} className="text-cyan-400" />
                                <span>เปิดใหม่: <span className="text-cyan-400">{lottery.reopen_buffer_minutes || 30} นาที</span>หลังออก</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                                <Settings size={16} className="text-purple-400" />
                                <span>ประเภท: <span className="text-purple-400">{scheduleTypeLabels[lottery.schedule_type] || 'รายสัปดาห์'}</span></span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => handleEdit(lottery)}
                                className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-[#0a1628] text-yellow-400 rounded-xl text-sm font-medium hover:bg-yellow-500/10 transition-colors"
                            >
                                <Edit size={16} /> แก้ไข
                            </button>
                            <button
                                onClick={() => handleToggleActive(lottery.id, lottery.is_active)}
                                className={`px-4 py-2.5 rounded-xl transition-colors ${lottery.is_active !== false
                                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                    : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                    }`}
                            >
                                <Power size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Upcoming Rounds */}
            <div className="bg-[#0d1e36]/80 backdrop-blur rounded-2xl p-5 border border-[#1a3a5c]">
                <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                    <Clock className="text-yellow-400" size={22} />
                    งวดที่กำลังจะมาถึง
                </h3>

                {rounds.length === 0 ? (
                    <div className="text-center py-8">
                        <Calendar size={40} className="mx-auto mb-2 opacity-30 text-gray-500" />
                        <p className="text-gray-500">ไม่มีงวดที่กำลังจะมาถึง</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[600px]">
                            <thead>
                                <tr className="bg-gradient-to-r from-yellow-500/10 to-transparent border-b border-[#1a3a5c]">
                                    <th className="text-left py-3 px-4 text-yellow-400 font-bold text-sm">หวย</th>
                                    <th className="text-left py-3 px-4 text-yellow-400 font-bold text-sm">วันที่ออก</th>
                                    <th className="text-left py-3 px-4 text-yellow-400 font-bold text-sm">เวลาปิดรับ</th>
                                    <th className="text-center py-3 px-4 text-yellow-400 font-bold text-sm">สถานะ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1a3a5c]">
                                {rounds.map((round, i) => (
                                    <tr key={i} className="hover:bg-[#1a3a5c]/50 transition-colors">
                                        <td className="py-4 px-4 text-white font-medium">{round.lottery_name}</td>
                                        <td className="py-4 px-4 text-gray-400">{round.draw_date}</td>
                                        <td className="py-4 px-4 text-gray-400">{round.close_time}</td>
                                        <td className="py-4 px-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${round.status === 'open'
                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                : 'bg-red-500/20 text-red-400'
                                                }`}>
                                                {round.status === 'open' ? 'เปิด' : 'ปิด'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gradient-to-br from-[#0d1e36] to-[#0a1628] rounded-3xl w-full max-w-md p-6 border border-blue-500/30 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Edit className="text-blue-400" size={24} />
                                {editingType ? 'แก้ไขประเภทหวย' : 'เพิ่มประเภทหวย'}
                            </h3>
                            <button onClick={() => { setShowModal(false); setEditingType(null); }} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-gray-400 text-sm block mb-2">ชื่อ</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#0a1628] border-2 border-[#1a3a5c] rounded-xl text-white focus:border-blue-500 outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-gray-400 text-sm block mb-2">วันที่ออก</label>
                                <input
                                    type="text"
                                    value={formData.draw_days}
                                    onChange={(e) => setFormData({ ...formData, draw_days: e.target.value })}
                                    placeholder="เช่น ทุกวัน, จันทร์-ศุกร์, 1,16"
                                    className="w-full px-4 py-3 bg-[#0a1628] border-2 border-[#1a3a5c] rounded-xl text-white focus:border-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-gray-400 text-sm block mb-2">ประเภทตาราง</label>
                                <select
                                    value={formData.schedule_type}
                                    onChange={(e) => setFormData({ ...formData, schedule_type: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#0a1628] border-2 border-[#1a3a5c] rounded-xl text-white focus:border-blue-500 outline-none"
                                >
                                    <option value="daily">รายวัน (ทุกวัน)</option>
                                    <option value="weekly">รายสัปดาห์ (ระบุวัน จ-อา)</option>
                                    <option value="monthly">รายเดือน (ระบุวันที่ เช่น 1, 16)</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-gray-400 text-sm block mb-2">⏰ เปิดรับแทง</label>
                                    <input
                                        type="time"
                                        value={formData.open_time}
                                        onChange={(e) => setFormData({ ...formData, open_time: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#0a1628] border-2 border-emerald-500/30 rounded-xl text-emerald-400 focus:border-emerald-500 outline-none font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm block mb-2">🔒 ปิดรับแทง</label>
                                    <input
                                        type="time"
                                        value={formData.close_time}
                                        onChange={(e) => setFormData({ ...formData, close_time: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#0a1628] border-2 border-red-500/30 rounded-xl text-red-400 focus:border-red-500 outline-none font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm block mb-2">🏆 เวลาออกผล</label>
                                    <input
                                        type="time"
                                        value={formData.draw_time}
                                        onChange={(e) => setFormData({ ...formData, draw_time: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#0a1628] border-2 border-yellow-500/30 rounded-xl text-yellow-400 focus:border-yellow-500 outline-none font-mono"
                                    />
                                </div>
                            </div>

                            <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.is_active ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-[#1a3a5c] text-gray-400'}`}>
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="hidden"
                                />
                                <CheckCircle size={18} />
                                เปิดใช้งาน
                            </label>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => { setShowModal(false); setEditingType(null); }}
                                    className="flex-1 py-3 bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-gradient-to-r from-blue-400 to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30"
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
