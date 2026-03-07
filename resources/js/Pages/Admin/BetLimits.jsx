import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { AdminLayout } from './Dashboard';
import { AlertTriangle, Plus, Save, Edit, Trash2, X, ToggleLeft, ToggleRight, Shield, AlertCircle } from 'lucide-react';
import { useAlert } from '@/Components/AlertModal';



export default function BetLimits({ limits = [], lotteryTypes = [], betTypeNames = {} }) {
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const { alert, AlertComponent } = useAlert();
    const [formData, setFormData] = useState({
        lottery_type_id: '',
        bet_type_id: '',
        number: '',
        max_per_bet: '',
        max_per_number: '',
        max_per_user_daily: '',
        max_total_per_draw: '',
        description: '',
    });

    const resetForm = () => {
        setFormData({
            lottery_type_id: '', bet_type_id: '', number: '',
            max_per_bet: '', max_per_number: '', max_per_user_daily: '', max_total_per_draw: '', description: '',
        });
        setShowForm(false);
        setEditingId(null);
    };

    const handleEdit = (limit) => {
        setEditingId(limit.id);
        setFormData({
            lottery_type_id: limit.lottery_type_id || '',
            bet_type_id: limit.bet_type_id || '',
            number: limit.number || '',
            max_per_bet: limit.max_per_bet || '',
            max_per_number: limit.max_per_number || '',
            max_per_user_daily: limit.max_per_user_daily || '',
            max_total_per_draw: limit.max_total_per_draw || '',
            description: limit.description || '',
        });
        setShowForm(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const url = editingId ? `/admin/bet-limits/${editingId}` : '/admin/bet-limits';
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (data.success) {
                alert.success('บันทึกวงเงินเรียบร้อย', 'บันทึกสำเร็จ!');
                setTimeout(() => router.reload(), 1500);
                resetForm();
            } else {
                alert.error(data.message || 'เกิดข้อผิดพลาด');
            }
        } catch {
            alert.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        alert.confirm('ต้องการลบวงเงินนี้หรือไม่?', async () => {
            try {
                const res = await fetch(`/admin/bet-limits/${id}`, {
                    method: 'DELETE',
                });
                const data = await res.json();
                if (!res.ok || !data.success) {
                    alert.error(data.message || 'เกิดข้อผิดพลาดในการลบ');
                    return;
                }
                alert.success('ลบวงเงินเรียบร้อย', 'ลบสำเร็จ!');
                setTimeout(() => router.reload(), 1500);
            } catch {
                alert.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
            }
        }, 'ลบวงเงิน');
    };

    const handleToggle = async (limit) => {
        try {
            const res = await fetch(`/admin/bet-limits/${limit.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...limit, is_active: !limit.is_active }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                alert.error(data.message || 'เกิดข้อผิดพลาด');
                return;
            }
            router.reload();
        } catch {
            alert.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        }
    };

    const fmt = (v) => v ? `฿${Number(v).toLocaleString()}` : '—';

    const getScopeLabel = (limit) => {
        const parts = [];
        if (limit.lottery_type?.name) parts.push(limit.lottery_type.name);
        else parts.push('ทุกหวย');
        if (limit.bet_type_id && betTypeNames[limit.bet_type_id]) parts.push(betTypeNames[limit.bet_type_id]);
        else parts.push('ทุกประเภท');
        if (limit.number) parts.push(`เลข ${limit.number}`);
        return parts.join(' → ');
    };

    const getScopeColor = (limit) => {
        if (limit.number) return 'from-red-500/20 to-[#0d1e36] border-red-500/30';
        if (limit.bet_type_id) return 'from-purple-500/20 to-[#0d1e36] border-purple-500/30';
        if (limit.lottery_type_id) return 'from-blue-500/20 to-[#0d1e36] border-blue-500/30';
        return 'from-yellow-500/20 to-[#0d1e36] border-yellow-500/30'; // Global
    };

    const getScopeBadge = (limit) => {
        if (limit.number) return { text: 'เลขเฉพาะ', color: 'bg-red-500/20 text-red-400' };
        if (limit.bet_type_id) return { text: 'ประเภท', color: 'bg-purple-500/20 text-purple-400' };
        if (limit.lottery_type_id) return { text: 'หวยเฉพาะ', color: 'bg-blue-500/20 text-blue-400' };
        return { text: 'ทั้งระบบ', color: 'bg-yellow-500/20 text-yellow-400' };
    };

    return (
        <AdminLayout>
            <Head title="วงเงินรับแทง" />

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Shield className="text-yellow-400" size={28} />
                        วงเงินรับแทง
                    </h2>
                    <p className="text-gray-400">{limits.length} กฎ</p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowForm(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold rounded-xl shadow-lg shadow-yellow-500/30 hover:from-yellow-300 hover:to-yellow-400 transition-all"
                >
                    <Plus size={18} />
                    เพิ่มวงเงิน
                </button>
            </div>

            {/* Info Alert */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-6 flex items-start gap-3">
                <AlertCircle size={20} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-200">
                    <strong>ระบบ Priority:</strong> เลขเฉพาะ → ประเภทการแทง → หวยเฉพาะ → ทั้งระบบ
                    <br />ระบบจะใช้กฎที่เฉพาะเจาะจงที่สุดก่อน ถ้าไม่มีจะ fallback ไปใช้กฎกว้างขึ้น
                </div>
            </div>

            {/* Add/Edit Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => resetForm()}>
                    <div className="bg-gradient-to-br from-[#0d1e36] to-[#0a1628] rounded-2xl border border-[#1a3a5c] p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-white font-bold text-lg">{editingId ? 'แก้ไขวงเงิน' : 'เพิ่มวงเงินใหม่'}</h3>
                            <button onClick={resetForm} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#1a3a5c]">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Scope */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-gray-400 text-xs block mb-1">หวย (ว่าง = ทุกหวย)</label>
                                    <select
                                        value={formData.lottery_type_id}
                                        onChange={(e) => setFormData(f => ({ ...f, lottery_type_id: e.target.value }))}
                                        className="w-full px-3 py-2.5 bg-[#0a1628] border border-[#1a3a5c] rounded-xl text-white text-sm focus:border-yellow-500 outline-none"
                                    >
                                        <option value="">ทุกหวย (Global)</option>
                                        {lotteryTypes.map(lt => (
                                            <option key={lt.id} value={lt.id}>{lt.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-xs block mb-1">ประเภท (ว่าง = ทุกประเภท)</label>
                                    <select
                                        value={formData.bet_type_id}
                                        onChange={(e) => setFormData(f => ({ ...f, bet_type_id: e.target.value }))}
                                        className="w-full px-3 py-2.5 bg-[#0a1628] border border-[#1a3a5c] rounded-xl text-white text-sm focus:border-yellow-500 outline-none"
                                    >
                                        <option value="">ทุกประเภท</option>
                                        {Object.entries(betTypeNames).map(([id, name]) => (
                                            <option key={id} value={id}>{name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-gray-400 text-xs block mb-1">เลขเฉพาะ (ว่าง = ทุกเลข)</label>
                                <input
                                    type="text"
                                    value={formData.number}
                                    onChange={(e) => setFormData(f => ({ ...f, number: e.target.value }))}
                                    placeholder="เช่น 888, 99, 555"
                                    className="w-full px-3 py-2.5 bg-[#0a1628] border border-[#1a3a5c] rounded-xl text-white text-sm focus:border-yellow-500 outline-none placeholder:text-gray-600"
                                />
                            </div>

                            {/* Limits */}
                            <div className="border-t border-[#1a3a5c] pt-4">
                                <p className="text-yellow-400 text-xs font-bold mb-3">⚡ วงเงิน (ว่าง = ไม่จำกัด)</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-gray-400 text-xs block mb-1">สูงสุด/ครั้ง</label>
                                        <input type="number" value={formData.max_per_bet} onChange={(e) => setFormData(f => ({ ...f, max_per_bet: e.target.value }))}
                                            placeholder="50000" className="w-full px-3 py-2.5 bg-[#0a1628] border border-[#1a3a5c] rounded-xl text-yellow-400 font-mono text-sm focus:border-yellow-500 outline-none placeholder:text-gray-700" />
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs block mb-1">สูงสุด/เลข/งวด</label>
                                        <input type="number" value={formData.max_per_number} onChange={(e) => setFormData(f => ({ ...f, max_per_number: e.target.value }))}
                                            placeholder="100000" className="w-full px-3 py-2.5 bg-[#0a1628] border border-[#1a3a5c] rounded-xl text-yellow-400 font-mono text-sm focus:border-yellow-500 outline-none placeholder:text-gray-700" />
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs block mb-1">สูงสุด/คน/วัน</label>
                                        <input type="number" value={formData.max_per_user_daily} onChange={(e) => setFormData(f => ({ ...f, max_per_user_daily: e.target.value }))}
                                            placeholder="200000" className="w-full px-3 py-2.5 bg-[#0a1628] border border-[#1a3a5c] rounded-xl text-yellow-400 font-mono text-sm focus:border-yellow-500 outline-none placeholder:text-gray-700" />
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs block mb-1">สูงสุดรวม/งวด</label>
                                        <input type="number" value={formData.max_total_per_draw} onChange={(e) => setFormData(f => ({ ...f, max_total_per_draw: e.target.value }))}
                                            placeholder="ไม่จำกัด" className="w-full px-3 py-2.5 bg-[#0a1628] border border-[#1a3a5c] rounded-xl text-yellow-400 font-mono text-sm focus:border-yellow-500 outline-none placeholder:text-gray-700" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-gray-400 text-xs block mb-1">หมายเหตุ</label>
                                <input type="text" value={formData.description} onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                                    placeholder="วงเงินเริ่มต้นทั้งระบบ" className="w-full px-3 py-2.5 bg-[#0a1628] border border-[#1a3a5c] rounded-xl text-white text-sm focus:border-yellow-500 outline-none placeholder:text-gray-600" />
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button onClick={resetForm} className="flex-1 py-3 bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors">
                                    ยกเลิก
                                </button>
                                <button onClick={handleSave} disabled={saving}
                                    className="flex-1 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold rounded-xl shadow-lg shadow-yellow-500/30 hover:from-yellow-300 hover:to-yellow-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                    <Save size={16} />
                                    {saving ? 'กำลังบันทึก...' : (editingId ? 'อัพเดท' : 'บันทึก')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Limits Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {limits.map((limit) => {
                    const badge = getScopeBadge(limit);
                    return (
                        <div
                            key={limit.id}
                            className={`bg-gradient-to-br ${getScopeColor(limit)} rounded-2xl p-5 border transition-all hover:scale-[1.01] ${!limit.is_active ? 'opacity-50' : ''}`}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${badge.color}`}>
                                        {badge.text}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => handleToggle(limit)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title={limit.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}>
                                        {limit.is_active ? <ToggleRight size={20} className="text-emerald-400" /> : <ToggleLeft size={20} className="text-gray-500" />}
                                    </button>
                                    <button onClick={() => handleEdit(limit)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-yellow-400">
                                        <Edit size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(limit.id)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-red-400">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Scope */}
                            <p className="text-white font-bold text-sm mb-3">{getScopeLabel(limit)}</p>

                            {/* Limits Grid */}
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="bg-black/20 rounded-lg px-3 py-2">
                                    <p className="text-gray-500 text-[10px] uppercase">ต่อครั้ง</p>
                                    <p className="text-yellow-400 font-bold font-mono">{fmt(limit.max_per_bet)}</p>
                                </div>
                                <div className="bg-black/20 rounded-lg px-3 py-2">
                                    <p className="text-gray-500 text-[10px] uppercase">ต่อเลข/งวด</p>
                                    <p className="text-yellow-400 font-bold font-mono">{fmt(limit.max_per_number)}</p>
                                </div>
                                <div className="bg-black/20 rounded-lg px-3 py-2">
                                    <p className="text-gray-500 text-[10px] uppercase">ต่อคน/วัน</p>
                                    <p className="text-yellow-400 font-bold font-mono">{fmt(limit.max_per_user_daily)}</p>
                                </div>
                                <div className="bg-black/20 rounded-lg px-3 py-2">
                                    <p className="text-gray-500 text-[10px] uppercase">รวม/งวด</p>
                                    <p className="text-yellow-400 font-bold font-mono">{fmt(limit.max_total_per_draw)}</p>
                                </div>
                            </div>

                            {/* Description */}
                            {limit.description && (
                                <p className="text-gray-500 text-xs mt-2 italic">📝 {limit.description}</p>
                            )}
                        </div>
                    );
                })}

                {limits.length === 0 && (
                    <div className="col-span-full text-center py-12">
                        <AlertTriangle size={48} className="text-yellow-400/30 mx-auto mb-3" />
                        <p className="text-gray-500 text-lg">ยังไม่มีวงเงินรับแทง</p>
                        <p className="text-gray-600 text-sm mt-1">กดปุ่ม "เพิ่มวงเงิน" เพื่อเริ่มกำหนดวงเงิน</p>
                    </div>
                )}
            </div>
            {AlertComponent}
        </AdminLayout>
    );
}
