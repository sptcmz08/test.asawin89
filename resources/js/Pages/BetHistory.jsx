import React, { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { ChevronLeft, Receipt, Clock, TrendingUp, TrendingDown, X, Eye, Calendar } from 'lucide-react';

const STATUS_STYLES = {
    pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'รอผล' },
    won: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', label: 'ถูกรางวัล' },
    lost: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: 'ไม่ถูก' },
    paid: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: 'จ่ายแล้ว' },
};

const BET_TYPE_NAMES = {
    1: '2ตัวบน', 2: '2ตัวล่าง', 3: '3ตัวโต๊ด', 4: '3ตัวบน',
    5: 'วิ่งบน', 6: 'วิ่งล่าง', 9: '3ตัวล่าง', 10: '4ตัวบน',
};

// Compute real slip status from its bets
const getSlipStatus = (slip) => {
    const bets = slip.bets || [];
    if (bets.length === 0) return slip.status || 'pending';
    const hasWon = bets.some(b => b.status === 'won' || b.status === 'paid');
    const hasPending = bets.some(b => b.status === 'pending');
    if (hasWon) return 'paid';
    if (hasPending) return 'pending';
    return 'lost';
};

export default function BetHistory({ slips = [], dailySummary = [], overallSummary = {}, filters = {} }) {
    const [from, setFrom] = useState(filters.from || '');
    const [to, setTo] = useState(filters.to || '');
    const [selectedSlip, setSelectedSlip] = useState(null);

    const handleSearch = () => {
        router.get('/bets', { from, to }, { preserveState: true, preserveScroll: true });
    };

    // Flatten all slips into a sorted list (newest first)
    const allSlips = useMemo(() => {
        const arr = Array.isArray(slips) ? slips : (slips?.data || []);
        return [...arr].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }, [slips]);

    const fmt = (n) => Math.floor(n || 0).toLocaleString();

    return (
        <MainLayout>
            <Head title="รายการเล่น" />

            <div className="p-4 max-w-4xl mx-auto pb-8">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <button onClick={() => router.visit('/')} className="text-gray-400 hover:text-white">
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="text-lg font-bold text-[#d4a017]">รายการเล่น</h1>
                </div>

                {/* Date Range Picker */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <input
                        type="date"
                        value={from}
                        onChange={e => setFrom(e.target.value)}
                        className="px-3 py-2 bg-[#0d1e36] border border-[#1a3a5c] rounded-lg text-white text-sm focus:border-[#d4a017] outline-none flex-1 min-w-[130px]"
                    />
                    <span className="text-gray-500 text-sm">ถึง</span>
                    <input
                        type="date"
                        value={to}
                        onChange={e => setTo(e.target.value)}
                        className="px-3 py-2 bg-[#0d1e36] border border-[#1a3a5c] rounded-lg text-white text-sm focus:border-[#d4a017] outline-none flex-1 min-w-[130px]"
                    />
                    <button
                        onClick={handleSearch}
                        className="px-5 py-2 bg-gradient-to-r from-[#d4a017] to-[#b08600] text-black font-bold rounded-lg hover:brightness-110 transition-all text-sm"
                    >
                        ค้นหา
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="bg-[#0d1f3c] rounded-xl p-3 border border-[#1a3a5c] flex items-center gap-3">
                        <Receipt size={20} className="text-blue-400 shrink-0" />
                        <div>
                            <p className="text-gray-500 text-xs">ยอดเล่น</p>
                            <p className="text-blue-400 text-lg font-bold font-mono">฿{fmt(overallSummary.total_played)}</p>
                        </div>
                    </div>
                    <div className="bg-[#0d1f3c] rounded-xl p-3 border border-[#1a3a5c] flex items-center gap-3">
                        <Clock size={20} className="text-yellow-400 shrink-0" />
                        <div>
                            <p className="text-gray-500 text-xs">ยอดเล่นค้าง</p>
                            <p className="text-yellow-400 text-lg font-bold font-mono">฿{fmt(overallSummary.pending)}</p>
                        </div>
                    </div>
                    <div className="bg-[#0d1f3c] rounded-xl p-3 border border-[#1a3a5c] flex items-center gap-3">
                        {(overallSummary.win_loss || 0) >= 0
                            ? <TrendingDown size={20} className="text-red-400 shrink-0" />
                            : <TrendingUp size={20} className="text-emerald-400 shrink-0" />
                        }
                        <div>
                            <p className="text-gray-500 text-xs">แพ้ชนะ</p>
                            <p className={`text-lg font-bold font-mono ${(overallSummary.win_loss || 0) < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {(overallSummary.win_loss || 0) < 0 ? '+' : '-'}฿{fmt(Math.abs(overallSummary.win_loss || 0))}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bills List */}
                <div className="bg-[#0d1e36]/80 backdrop-blur rounded-2xl border border-[#1a3a5c] overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-[40px_1fr_100px_80px_60px] text-xs text-[#d4a017] font-bold p-3 border-b border-[#1a3a5c] bg-[#d4a017]/5">
                        <div className="text-center">#</div>
                        <div>ชื่อบิล</div>
                        <div className="text-right">ยอดแทง</div>
                        <div className="text-center">สถานะ</div>
                        <div className="text-center">จัดการ</div>
                    </div>

                    {/* Bill Rows */}
                    {allSlips.length === 0 ? (
                        <div className="p-10 text-center">
                            <Receipt size={40} className="mx-auto mb-3 text-gray-600" />
                            <p className="text-gray-500 text-sm">ไม่มีรายการในช่วงวันที่เลือก</p>
                            <button
                                onClick={() => router.visit('/')}
                                className="mt-3 px-6 py-2 bg-gradient-to-r from-[#d4a017] to-[#b08600] text-black font-bold rounded-lg text-sm"
                            >
                                ไปแทงหวย
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-[#1a3a5c]/50">
                            {allSlips.map((slip, index) => {
                                const slipStatus = getSlipStatus(slip);
                                const st = STATUS_STYLES[slipStatus] || STATUS_STYLES.pending;
                                const totalWin = (slip.bets || []).reduce((sum, b) => sum + (b.win_amount || 0), 0);
                                const dateStr = new Date(slip.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
                                const betCount = (slip.bets || []).length;

                                return (
                                    <div key={slip.id} className="grid grid-cols-[40px_1fr_100px_80px_60px] items-center p-3 hover:bg-[#1a3a5c]/20 transition-colors">
                                        {/* # */}
                                        <div className="text-center text-gray-500 font-mono text-sm font-bold">
                                            {index + 1}
                                        </div>

                                        {/* Bill Info */}
                                        <div className="min-w-0 pr-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-bold text-sm truncate">
                                                    {slip.slip_name || 'โพย'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-gray-500 text-xs">{slip.lottery_type?.name || '-'}</span>
                                                <span className="text-gray-600 text-xs">•</span>
                                                <span className="text-gray-500 text-xs">{dateStr}</span>
                                                <span className="text-gray-600 text-xs">•</span>
                                                <span className="text-gray-500 text-xs">{betCount} เลข</span>
                                            </div>
                                        </div>

                                        {/* Total Amount */}
                                        <div className="text-right">
                                            <p className="text-[#d4a017] font-bold font-mono text-sm">฿{fmt(slip.total_amount)}</p>
                                            {totalWin > 0 && (
                                                <p className="text-emerald-400 font-mono text-xs font-bold">+฿{fmt(totalWin)}</p>
                                            )}
                                        </div>

                                        {/* Status */}
                                        <div className="text-center">
                                            <span className={`inline-block px-2 py-1 rounded-full text-[10px] font-bold ${st.bg} ${st.text}`}>
                                                {st.label}
                                            </span>
                                        </div>

                                        {/* Action */}
                                        <div className="text-center">
                                            <button
                                                onClick={() => setSelectedSlip(slip)}
                                                className="p-1.5 rounded-lg bg-[#1a3a5c]/50 hover:bg-[#d4a017]/20 text-gray-400 hover:text-[#d4a017] transition-colors"
                                                title="ดูรายละเอียด"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Slip Detail Modal */}
            {selectedSlip && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
                    onClick={() => setSelectedSlip(null)}
                >
                    <div className="bg-gradient-to-b from-[#1a2a42] to-[#0f1a2e] w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden border border-[#2a4a6c]/50 shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="px-5 py-4 border-b border-[#2a4a6c]/50 flex items-center justify-between bg-[#0d1e36]">
                            <div>
                                <h3 className="text-white font-bold text-lg">📋 รายละเอียดบิล</h3>
                                <p className="text-gray-500 text-xs mt-0.5">
                                    {new Date(selectedSlip.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}{' '}
                                    {new Date(selectedSlip.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                            <button onClick={() => setSelectedSlip(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        {/* Bill Info */}
                        <div className="px-5 py-4 border-b border-[#1a3a5c]/50">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-[#0d1e36] rounded-xl p-3 border border-[#1a3a5c]">
                                    <p className="text-gray-500 text-xs">หวย</p>
                                    <p className="text-white font-bold text-sm mt-0.5">{selectedSlip.lottery_type?.name || '-'}</p>
                                </div>
                                <div className="bg-[#0d1e36] rounded-xl p-3 border border-[#1a3a5c]">
                                    <p className="text-gray-500 text-xs">ชื่อบิล</p>
                                    <p className="text-white font-bold text-sm mt-0.5 truncate">{selectedSlip.slip_name || 'โพย'}</p>
                                </div>
                                <div className="bg-[#0d1e36] rounded-xl p-3 border border-[#1a3a5c]">
                                    <p className="text-gray-500 text-xs">จำนวนเลข</p>
                                    <p className="text-blue-400 font-bold text-sm mt-0.5">{(selectedSlip.bets || []).length} รายการ</p>
                                </div>
                                <div className="bg-[#0d1e36] rounded-xl p-3 border border-[#1a3a5c]">
                                    <p className="text-gray-500 text-xs">สถานะ</p>
                                    <p className={`font-bold text-sm mt-0.5 ${(STATUS_STYLES[getSlipStatus(selectedSlip)] || STATUS_STYLES.pending).text}`}>
                                        {(STATUS_STYLES[getSlipStatus(selectedSlip)] || STATUS_STYLES.pending).label}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Bet Details Table */}
                        <div className="overflow-y-auto" style={{ maxHeight: '40vh' }}>
                            <table className="w-full text-sm">
                                <thead className="bg-[#0d1e36] sticky top-0">
                                    <tr className="text-[#d4a017] text-xs">
                                        <th className="py-2.5 px-4 text-left font-bold">เลข</th>
                                        <th className="py-2.5 px-2 text-left font-bold">ประเภท</th>
                                        <th className="py-2.5 px-2 text-right font-bold">ราคา</th>
                                        <th className="py-2.5 px-2 text-right font-bold">ชนะ</th>
                                        <th className="py-2.5 px-4 text-center font-bold">สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1a3a5c]/30">
                                    {[...(selectedSlip.bets || [])].sort((a, b) => {
                                        const p = { won: 0, paid: 1, pending: 2, lost: 3 };
                                        return (p[a.status] ?? 9) - (p[b.status] ?? 9);
                                    }).map(bet => {
                                        const betStatus = STATUS_STYLES[bet.status] || STATUS_STYLES.pending;
                                        return (
                                            <tr key={bet.id} className="hover:bg-[#1a3a5c]/20">
                                                <td className="py-2.5 px-4">
                                                    <span className="text-white font-bold font-mono text-base">{bet.number}</span>
                                                </td>
                                                <td className="py-2.5 px-2">
                                                    <span className="text-gray-400 text-xs">{BET_TYPE_NAMES[bet.bet_type_id] || '-'}</span>
                                                </td>
                                                <td className="py-2.5 px-2 text-right">
                                                    <span className="text-white font-mono">฿{fmt(bet.amount)}</span>
                                                </td>
                                                <td className="py-2.5 px-2 text-right">
                                                    {bet.win_amount > 0 ? (
                                                        <span className="text-emerald-400 font-bold font-mono">+฿{fmt(bet.win_amount)}</span>
                                                    ) : (
                                                        <span className="text-gray-600 font-mono">-</span>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-4 text-center">
                                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${betStatus.bg} ${betStatus.text}`}>
                                                        {betStatus.label}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Summary */}
                        <div className="px-5 py-4 border-t border-[#2a4a6c]/50 bg-[#0d1e36]">
                            <div className="flex justify-between items-center">
                                <div>
                                    <span className="text-gray-500 text-xs">ยอดแทงรวม</span>
                                    <p className="text-[#d4a017] font-bold text-xl font-mono">฿{fmt(selectedSlip.total_amount)}</p>
                                </div>
                                {(() => {
                                    const totalWin = (selectedSlip.bets || []).reduce((sum, b) => sum + (b.win_amount || 0), 0);
                                    return totalWin > 0 ? (
                                        <div className="text-right">
                                            <span className="text-gray-500 text-xs">ถูกรางวัล</span>
                                            <p className="text-emerald-400 font-bold text-xl font-mono">+฿{fmt(totalWin)}</p>
                                        </div>
                                    ) : null;
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
}
