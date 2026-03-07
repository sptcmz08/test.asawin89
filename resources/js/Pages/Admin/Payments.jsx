import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { AdminLayout } from './Dashboard';
import { CreditCard, DollarSign, Clock, CheckCircle, TrendingUp, Loader2, CheckCheck } from 'lucide-react';

export default function AdminPayments({ winningBets = { data: [] }, summary = {} }) {
    const [filter, setFilter] = useState('pending');
    const [payingId, setPayingId] = useState(null);
    const [payingAll, setPayingAll] = useState(false);

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

    const filteredBets = winningBets.data?.filter(b => {
        if (filter === 'all') return true;
        if (filter === 'pending') return b.status === 'won';
        if (filter === 'paid') return b.status === 'paid';
        return true;
    }) || [];

    const handlePaySingle = async (betId) => {
        if (!confirm('ยืนยันจ่ายเงินรางวัลรายการนี้?')) return;

        setPayingId(betId);
        try {
            const response = await fetch(`/admin/payments/${betId}/pay`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
            });
            const data = await response.json();
            if (data.success) {
                router.reload();
            } else {
                alert(data.error || data.message || 'เกิดข้อผิดพลาด');
            }
        } catch (e) {
            alert('เกิดข้อผิดพลาด: ' + e.message);
        } finally {
            setPayingId(null);
        }
    };

    const handlePayAll = async () => {
        const pendingCount = summary.pendingCount || 0;
        if (pendingCount === 0) {
            alert('ไม่มีรายการรอจ่าย');
            return;
        }
        if (!confirm(`ยืนยันจ่ายเงินรางวัลทั้งหมด ${pendingCount} รายการ?`)) return;

        setPayingAll(true);
        try {
            const response = await fetch('/admin/payments/pay-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
            });
            const data = await response.json();
            if (data.success) {
                router.reload();
            } else {
                alert(data.error || data.message || 'เกิดข้อผิดพลาด');
            }
        } catch (e) {
            alert('เกิดข้อผิดพลาด: ' + e.message);
        } finally {
            setPayingAll(false);
        }
    };

    return (
        <AdminLayout>
            <Head title="จ่ายรางวัล" />

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <CreditCard className="text-emerald-400" size={28} />
                        จ่ายรางวัล
                    </h2>
                    <p className="text-gray-400">{winningBets.data?.length || 0} รายการ</p>
                </div>
                {(summary.pendingCount || 0) > 0 && (
                    <button
                        onClick={handlePayAll}
                        disabled={payingAll}
                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all disabled:opacity-50"
                    >
                        {payingAll ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                กำลังจ่าย...
                            </>
                        ) : (
                            <>
                                <CheckCheck size={18} />
                                จ่ายทั้งหมด ({summary.pendingCount})
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="bg-gradient-to-br from-yellow-500/20 to-[#0d1e36] rounded-2xl p-5 border border-yellow-500/30">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock size={18} className="text-yellow-400" />
                        <span className="text-gray-400 text-sm">รอจ่าย</span>
                    </div>
                    <p className="text-yellow-400 text-2xl font-bold">
                        ฿{Math.floor(Number(summary.pendingAmount || 0)).toLocaleString()}
                    </p>
                    <p className="text-gray-500 text-xs">{summary.pendingCount || 0} รายการ</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/20 to-[#0d1e36] rounded-2xl p-5 border border-emerald-500/30">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle size={18} className="text-emerald-400" />
                        <span className="text-gray-400 text-sm">จ่ายแล้ววันนี้</span>
                    </div>
                    <p className="text-emerald-400 text-2xl font-bold">
                        ฿{Math.floor(Number(summary.paidTodayAmount || 0)).toLocaleString()}
                    </p>
                </div>
                <div className="bg-gradient-to-br from-blue-500/20 to-[#0d1e36] rounded-2xl p-5 border border-blue-500/30">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={18} className="text-blue-400" />
                        <span className="text-gray-400 text-sm">จ่ายแล้วทั้งหมด</span>
                    </div>
                    <p className="text-blue-400 text-2xl font-bold">
                        ฿{Math.floor(Number(summary.totalPaid || 0)).toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-4">
                {[
                    { key: 'pending', label: 'รอจ่าย', count: summary.pendingCount || 0 },
                    { key: 'paid', label: 'จ่ายแล้ว' },
                    { key: 'all', label: 'ทั้งหมด' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${filter === tab.key
                            ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black shadow-lg shadow-yellow-500/30'
                            : 'bg-[#0d1e36] text-gray-400 border border-[#1a3a5c] hover:border-yellow-500/50'
                            }`}
                    >
                        {tab.label}
                        {tab.count > 0 && (
                            <span className={`px-1.5 py-0.5 rounded text-xs ${filter === tab.key ? 'bg-black/20' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Payments Table */}
            <div className="bg-[#0d1e36]/80 backdrop-blur rounded-2xl border border-[#1a3a5c] overflow-x-auto">
                <table className="w-full min-w-[700px]">
                    <thead>
                        <tr className="bg-gradient-to-r from-yellow-500/10 to-transparent border-b border-[#1a3a5c]">
                            <th className="px-4 py-3 text-left text-yellow-400 font-bold text-sm">สมาชิก</th>
                            <th className="px-4 py-3 text-left text-yellow-400 font-bold text-sm">หวย</th>
                            <th className="px-4 py-3 text-center text-yellow-400 font-bold text-sm">เลข</th>
                            <th className="px-4 py-3 text-right text-yellow-400 font-bold text-sm">แทง</th>
                            <th className="px-4 py-3 text-right text-yellow-400 font-bold text-sm">จ่าย</th>
                            <th className="px-4 py-3 text-center text-yellow-400 font-bold text-sm">สถานะ</th>
                            <th className="px-4 py-3 text-center text-yellow-400 font-bold text-sm">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1a3a5c]">
                        {filteredBets.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-4 py-12 text-center text-gray-500">
                                    <CreditCard size={40} className="mx-auto mb-2 opacity-50" />
                                    ไม่มีรายการ
                                </td>
                            </tr>
                        ) : (
                            filteredBets.map((bet) => (
                                <tr key={bet.id} className="hover:bg-[#1a3a5c]/50 transition-colors">
                                    <td className="px-4 py-4">
                                        <span className="text-white font-medium">{bet.user?.name || '-'}</span>
                                    </td>
                                    <td className="px-4 py-4 text-gray-400">{bet.lottery_type?.name || '-'}</td>
                                    <td className="px-4 py-4 text-center">
                                        <span className="text-yellow-400 font-bold font-mono text-lg bg-yellow-500/10 px-3 py-1 rounded-lg">
                                            {bet.number}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-right text-gray-400 font-mono">
                                        ฿{Math.floor(Number(bet.amount || 0)).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <span className="text-emerald-400 font-mono font-bold text-lg">
                                            ฿{Math.floor(Number(bet.win_amount || 0)).toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        {bet.status === 'won' ? (
                                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400">
                                                รอจ่าย
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">
                                                จ่ายแล้ว ✓
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        {bet.status === 'won' ? (
                                            <button
                                                onClick={() => handlePaySingle(bet.id)}
                                                disabled={payingId === bet.id || payingAll}
                                                className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 mx-auto shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all disabled:opacity-50"
                                            >
                                                {payingId === bet.id ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : (
                                                    <CheckCircle size={14} />
                                                )}
                                                อนุมัติ
                                            </button>
                                        ) : (
                                            <span className="text-gray-600 text-sm">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
}
