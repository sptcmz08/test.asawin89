import React, { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import { AdminLayout } from './Dashboard';
import { Search, Receipt, DollarSign, CreditCard, Eye, X, ChevronRight } from 'lucide-react';

const STATUS_STYLES = {
    pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'รอผล' },
    won: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'ถูกรางวัล' },
    lost: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'ไม่ถูก' },
    paid: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'จ่ายแล้ว' },
    partial: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'บางส่วน' },
};

const BET_TYPE_NAMES = {
    1: '2ตัวบน', 2: '2ตัวล่าง', 3: '3ตัวโต๊ด', 4: '3ตัวบน',
    5: 'วิ่งบน', 6: 'วิ่งล่าง', 9: '3ตัวล่าง',
};

export default function AdminBets({ slips = [], overallSummary = {}, lotteryTypes = [], filters = {} }) {
    const [from, setFrom] = useState(filters.from || '');
    const [to, setTo] = useState(filters.to || '');
    const [selectedType, setSelectedType] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [detailSlip, setDetailSlip] = useState(null);

    const handleSearch = () => {
        router.get('/admin/bets', { from, to }, { preserveState: true, preserveScroll: true });
    };

    const fmt = (n) => Math.floor(n || 0).toLocaleString();

    // Get lottery types that have slips
    const typesWithCounts = useMemo(() => {
        const allSlips = Array.isArray(slips) ? slips : [];
        const countMap = {};
        allSlips.forEach(s => {
            const id = s.lottery_type_id;
            if (!countMap[id]) countMap[id] = { count: 0, total: 0 };
            countMap[id].count++;
            countMap[id].total += parseFloat(s.total_amount || 0);
        });
        return lotteryTypes.map(lt => ({
            ...lt,
            slipCount: countMap[lt.id]?.count || 0,
            slipTotal: countMap[lt.id]?.total || 0,
        }));
    }, [slips, lotteryTypes]);

    // Filter slips for selected type
    const filteredSlips = useMemo(() => {
        if (!selectedType) return [];
        const allSlips = Array.isArray(slips) ? slips : [];
        const statusPriority = { won: 0, paid: 1, pending: 2, lost: 3 };
        return allSlips.filter(s => {
            if (s.lottery_type_id !== selectedType) return false;
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                return s.user?.name?.toLowerCase().includes(term) ||
                    s.slip_name?.toLowerCase().includes(term);
            }
            return true;
        }).sort((a, b) => {
            const aStatus = getSlipStatus(a);
            const bStatus = getSlipStatus(b);
            return (statusPriority[aStatus] ?? 9) - (statusPriority[bStatus] ?? 9);
        });
    }, [slips, selectedType, searchTerm]);

    const selectedTypeName = lotteryTypes.find(lt => lt.id === selectedType)?.name || '';

    return (
        <AdminLayout>
            <Head title="รายการแทง" />

            {/* Header */}
            <h2 className="text-2xl font-bold text-[#d4a017] mb-4 flex items-center gap-2">
                <Receipt size={28} />
                รายการแทง
            </h2>

            {/* Date Range Picker */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
                <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                    className="px-3 py-2 bg-[#0d1e36] border border-[#1a3a5c] rounded-lg text-white text-sm focus:border-[#d4a017] outline-none" />
                <span className="text-gray-400 text-sm">ถึง</span>
                <input type="date" value={to} onChange={e => setTo(e.target.value)}
                    className="px-3 py-2 bg-[#0d1e36] border border-[#1a3a5c] rounded-lg text-white text-sm focus:border-[#d4a017] outline-none" />
                <button onClick={handleSearch}
                    className="px-5 py-2 bg-gradient-to-r from-[#d4a017] to-[#b08600] text-black font-bold rounded-lg hover:brightness-110 transition-all text-sm">
                    ค้นหา
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-[#0d1e36] rounded-xl p-4 border border-[#1a3a5c]">
                    <div className="flex items-center gap-2 mb-1">
                        <Receipt size={18} className="text-blue-400" />
                        <span className="text-gray-400 text-sm">ยอดแทงรวม</span>
                    </div>
                    <p className="text-blue-400 text-2xl font-bold font-mono">฿{fmt(overallSummary.total_bet)}</p>
                </div>
                <div className="bg-[#0d1e36] rounded-xl p-4 border border-[#1a3a5c]">
                    <div className="flex items-center gap-2 mb-1">
                        <CreditCard size={18} className="text-red-400" />
                        <span className="text-gray-400 text-sm">ยอดต้องจ่าย</span>
                    </div>
                    <p className="text-red-400 text-2xl font-bold font-mono">฿{fmt(overallSummary.total_to_pay)}</p>
                </div>
                <div className="bg-[#0d1e36] rounded-xl p-4 border border-[#1a3a5c]">
                    <div className="flex items-center gap-2 mb-1">
                        <DollarSign size={18} className="text-emerald-400" />
                        <span className="text-gray-400 text-sm">จ่ายแล้ว</span>
                    </div>
                    <p className="text-emerald-400 text-2xl font-bold font-mono">฿{fmt(overallSummary.total_paid)}</p>
                </div>
            </div>

            {/* Lottery Type Icons Grid */}
            <div className="mb-6">
                <h3 className="text-gray-400 text-sm font-bold mb-3">เลือกประเภทหวย</h3>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {typesWithCounts.map(lt => (
                        <button
                            key={lt.id}
                            onClick={() => { setSelectedType(selectedType === lt.id ? null : lt.id); setSearchTerm(''); }}
                            className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200
                                ${selectedType === lt.id
                                    ? 'bg-[#d4a017]/20 border-[#d4a017] shadow-lg shadow-[#d4a017]/10'
                                    : 'bg-[#0d1e36] border-[#1a3a5c] hover:border-[#d4a017]/50 hover:bg-[#0d1e36]/80'
                                }`}
                        >
                            {lt.img_url ? (
                                <img src={lt.img_url} alt={lt.name} className="w-10 h-10 rounded-lg object-cover" />
                            ) : (
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#d4a017]/30 to-[#b08600]/30 flex items-center justify-center text-[#d4a017] text-lg font-bold">
                                    {lt.name?.charAt(0)}
                                </div>
                            )}
                            <span className={`text-xs font-medium text-center leading-tight ${selectedType === lt.id ? 'text-[#d4a017]' : 'text-gray-300'}`}>
                                {lt.name?.replace('หวย', '')}
                            </span>
                            {lt.slipCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                                    {lt.slipCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Slip Table for Selected Type */}
            {selectedType && (
                <div className="bg-[#0d1e36]/80 backdrop-blur rounded-2xl border border-[#1a3a5c] overflow-hidden">
                    {/* Table Header */}
                    <div className="px-4 py-3 border-b border-[#1a3a5c] flex items-center justify-between">
                        <h3 className="text-[#d4a017] font-bold flex items-center gap-2">
                            <ChevronRight size={18} />
                            {selectedTypeName}
                            <span className="text-gray-500 text-sm font-normal">({filteredSlips.length} โพย)</span>
                        </h3>
                        <div className="relative max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input type="text"
                                placeholder="ค้นหาสมาชิก, ชื่อโพย..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-[#081424] border border-[#1a3a5c] rounded-lg text-white text-sm focus:border-[#d4a017] outline-none"
                            />
                        </div>
                    </div>

                    <table className="w-full">
                        <thead>
                            <tr className="bg-gradient-to-r from-[#d4a017]/10 to-transparent border-b border-[#1a3a5c]">
                                <th className="px-4 py-3 text-left text-[#d4a017] font-bold text-sm">สมาชิก</th>
                                <th className="px-4 py-3 text-left text-[#d4a017] font-bold text-sm">ชื่อโพย</th>
                                <th className="px-4 py-3 text-center text-[#d4a017] font-bold text-sm">งวด</th>
                                <th className="px-4 py-3 text-right text-[#d4a017] font-bold text-sm">ราคารวม</th>
                                <th className="px-4 py-3 text-center text-[#d4a017] font-bold text-sm">สถานะ</th>
                                <th className="px-4 py-3 text-center text-[#d4a017] font-bold text-sm">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1a3a5c]">
                            {filteredSlips.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-4 py-12 text-center text-gray-500">
                                        <Receipt size={40} className="mx-auto mb-2 opacity-50" />
                                        ไม่มีรายการโพย
                                    </td>
                                </tr>
                            ) : filteredSlips.map(slip => {
                                const slipStatus = getSlipStatus(slip);
                                const style = STATUS_STYLES[slipStatus] || STATUS_STYLES.pending;
                                return (
                                    <tr key={slip.id} className="hover:bg-[#1a3a5c]/30 transition-colors">
                                        <td className="px-4 py-3 text-white text-sm font-medium">{slip.user?.name || '-'}</td>
                                        <td className="px-4 py-3 text-gray-300 text-sm">{slip.slip_name || '-'}</td>
                                        <td className="px-4 py-3 text-center text-cyan-400 text-sm font-mono">
                                            {slip.draw_date ? new Date(slip.draw_date).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-yellow-400 font-bold font-mono">
                                            ฿{fmt(slip.total_amount)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {slipStatus === 'paid' ? (
                                                <div className="flex items-center justify-center gap-1">
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">ถูกรางวัล</span>
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400">จ่ายแล้ว</span>
                                                </div>
                                            ) : (
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${style.bg} ${style.text}`}>
                                                    {style.label}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => setDetailSlip(slip)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#d4a017]/20 text-[#d4a017] rounded-lg text-xs font-bold hover:bg-[#d4a017]/30 transition-all"
                                            >
                                                <Eye size={14} /> ดูรายละเอียด
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Detail Popup Modal */}
            {detailSlip && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setDetailSlip(null)}>
                    <div className="bg-[#0a1929] border border-[#1a3a5c] rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl"
                        onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="px-5 py-4 border-b border-[#1a3a5c] flex items-center justify-between bg-gradient-to-r from-[#d4a017]/10 to-transparent">
                            <div>
                                <h3 className="text-[#d4a017] font-bold text-lg">{detailSlip.slip_name || 'รายละเอียดโพย'}</h3>
                                <div className="text-gray-400 text-xs mt-0.5">
                                    สมาชิก: {detailSlip.user?.name} • ราคารวม: ฿{fmt(detailSlip.total_amount)}
                                </div>
                            </div>
                            <button onClick={() => setDetailSlip(null)}
                                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all">
                                <X size={22} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="overflow-y-auto max-h-[60vh]">
                            <table className="w-full">
                                <thead className="sticky top-0 bg-[#0a1929]">
                                    <tr className="text-gray-500 text-xs border-b border-[#1a3a5c]">
                                        <th className="px-5 py-2.5 text-center">เลข</th>
                                        <th className="px-5 py-2.5 text-left">ประเภท</th>
                                        <th className="px-5 py-2.5 text-right">จำนวน</th>
                                        <th className="px-5 py-2.5 text-right">อัตราจ่าย</th>
                                        <th className="px-5 py-2.5 text-right">ชนะ</th>
                                        <th className="px-5 py-2.5 text-center">สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1a3a5c]/50">
                                    {(detailSlip.bets || []).length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-5 py-8 text-center text-gray-600 text-sm">ไม่มีรายการ</td>
                                        </tr>
                                    ) : [...(detailSlip.bets || [])].sort((a, b) => {
                                        const p = { won: 0, paid: 1, pending: 2, lost: 3 };
                                        return (p[a.status] ?? 9) - (p[b.status] ?? 9);
                                    }).map(bet => {
                                        const status = STATUS_STYLES[bet.status] || STATUS_STYLES.pending;
                                        return (
                                            <tr key={bet.id} className="hover:bg-[#1a3a5c]/20">
                                                <td className="px-5 py-3 text-center">
                                                    <span className="text-[#d4a017] font-bold font-mono text-xl">{bet.number}</span>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className="text-gray-300 text-sm bg-[#1a3a5c] px-2 py-0.5 rounded">
                                                        {BET_TYPE_NAMES[bet.bet_type_id] || bet.bet_type || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-right text-yellow-400 font-mono font-bold">
                                                    ฿{fmt(bet.amount)}
                                                </td>
                                                <td className="px-5 py-3 text-right text-gray-400 font-mono text-sm">
                                                    x{parseFloat(bet.payout_rate || 0)}
                                                </td>
                                                <td className="px-5 py-3 text-right font-mono">
                                                    {bet.win_amount > 0
                                                        ? <span className="text-emerald-400 font-bold">฿{fmt(bet.win_amount)}</span>
                                                        : <span className="text-gray-600">-</span>
                                                    }
                                                </td>
                                                <td className="px-5 py-3 text-center">
                                                    {bet.status === 'paid' ? (
                                                        <div className="flex items-center justify-center gap-1">
                                                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">ถูกรางวัล</span>
                                                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400">จ่ายแล้ว</span>
                                                        </div>
                                                    ) : (
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${status.bg} ${status.text}`}>
                                                            {status.label}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* Slip Summary Footer */}
                            {(detailSlip.bets || []).length > 0 && (
                                <div className="px-5 py-3 border-t border-[#1a3a5c] bg-[#081424] flex items-center justify-between">
                                    <span className="text-gray-400 text-sm">{detailSlip.bets.length} รายการ</span>
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="text-gray-400">รวมแทง: <span className="text-yellow-400 font-bold font-mono">฿{fmt(detailSlip.total_amount)}</span></span>
                                        <span className="text-gray-400">รวมชนะ: <span className="text-emerald-400 font-bold font-mono">
                                            ฿{fmt(detailSlip.bets.reduce((s, b) => s + parseFloat(b.win_amount || 0), 0))}
                                        </span></span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

function getSlipStatus(slip) {
    if (!slip.bets || slip.bets.length === 0) return slip.status || 'pending';
    const statuses = slip.bets.map(b => b.status);
    if (statuses.every(s => s === 'pending')) return 'pending';
    if (statuses.every(s => s === 'lost')) return 'lost';
    // If any bet is paid → slip is paid (ถูกรางวัล + จ่ายแล้ว)
    if (statuses.some(s => s === 'paid')) return 'paid';
    // If any bet is won (not yet paid) → slip is won
    if (statuses.some(s => s === 'won')) return 'won';
    if (statuses.some(s => s === 'pending')) return 'pending';
    return 'lost';
}
