import React, { useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { ChevronLeft, ArrowUpCircle, ArrowDownCircle, DollarSign, Gift, RotateCcw, Wallet, TrendingUp, TrendingDown, History } from 'lucide-react';

// Transaction type configs
const TYPE_CONFIG = {
    deposit: { icon: ArrowDownCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', label: 'ฝากเงิน' },
    withdraw: { icon: ArrowUpCircle, color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', label: 'ถอนเงิน' },
    bet: { icon: DollarSign, color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', label: 'แทงหวย' },
    payout: { icon: Gift, color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', label: 'รางวัล' },
    refund: { icon: RotateCcw, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30', label: 'คืนเงิน' },
    adjustment: { icon: DollarSign, color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30', label: 'ปรับยอด' },
    bonus: { icon: Gift, color: 'text-pink-400', bg: 'bg-pink-500/20', border: 'border-pink-500/30', label: 'โบนัส' },
};

export default function Transactions({ transactions = { data: [] } }) {
    const { auth } = usePage().props;
    const [filter, setFilter] = useState('all');

    const filteredTransactions = transactions.data?.filter(t => {
        if (filter !== 'all' && t.type !== filter) return false;
        return true;
    }) || [];

    // Summary
    const summary = {
        totalDeposit: transactions.data?.filter(t => t.type === 'deposit').reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0,
        totalWithdraw: transactions.data?.filter(t => t.type === 'withdraw').reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0) || 0,
        totalPayout: transactions.data?.filter(t => t.type === 'payout').reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0,
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <MainLayout>
            <Head title="ประวัติธุรกรรม" />

            {/* Decorative Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 -left-32 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative max-w-2xl mx-auto pb-8">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={() => router.visit('/')}
                        className="p-2 bg-[#0d1e36] rounded-xl border border-[#1a3a5c] hover:border-yellow-500/50 transition-colors"
                    >
                        <ChevronLeft size={20} className="text-gray-400" />
                    </button>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <History size={24} className="text-blue-400" />
                        ประวัติธุรกรรม
                    </h1>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="bg-gradient-to-br from-emerald-500/20 to-[#0d1e36] rounded-2xl p-4 border border-emerald-500/30">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingDown size={18} className="text-emerald-400" />
                            <span className="text-gray-400 text-xs">ฝากเงิน</span>
                        </div>
                        <p className="text-emerald-400 text-xl font-bold">+฿{summary.totalDeposit.toLocaleString()}</p>
                    </div>
                    <div className="bg-gradient-to-br from-red-500/20 to-[#0d1e36] rounded-2xl p-4 border border-red-500/30">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp size={18} className="text-red-400" />
                            <span className="text-gray-400 text-xs">ถอนเงิน</span>
                        </div>
                        <p className="text-red-400 text-xl font-bold">-฿{summary.totalWithdraw.toLocaleString()}</p>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-500/20 to-[#0d1e36] rounded-2xl p-4 border border-yellow-500/30">
                        <div className="flex items-center gap-2 mb-2">
                            <Gift size={18} className="text-yellow-400" />
                            <span className="text-gray-400 text-xs">รางวัล</span>
                        </div>
                        <p className="text-yellow-400 text-xl font-bold">+฿{summary.totalPayout.toLocaleString()}</p>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
                    {[
                        { key: 'all', label: 'ทั้งหมด' },
                        { key: 'deposit', label: 'ฝาก' },
                        { key: 'withdraw', label: 'ถอน' },
                        { key: 'bet', label: 'แทง' },
                        { key: 'payout', label: 'รางวัล' },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setFilter(tab.key)}
                            className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${filter === tab.key
                                    ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black shadow-lg shadow-yellow-500/30'
                                    : 'bg-[#0d1e36] text-gray-400 border border-[#1a3a5c] hover:border-yellow-500/50'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Transaction List */}
                <div className="space-y-3">
                    {filteredTransactions.length === 0 ? (
                        <div className="bg-[#0d1e36]/80 backdrop-blur rounded-2xl p-12 text-center border border-[#1a3a5c]">
                            <Wallet className="mx-auto mb-4 text-gray-600" size={48} />
                            <p className="text-gray-500 font-medium">ยังไม่มีธุรกรรม</p>
                            <p className="text-gray-600 text-sm mt-1">รายการจะแสดงที่นี่เมื่อมีธุรกรรม</p>
                        </div>
                    ) : (
                        filteredTransactions.map((tx) => {
                            const config = TYPE_CONFIG[tx.type] || TYPE_CONFIG.adjustment;
                            const Icon = config.icon;
                            const isPositive = parseFloat(tx.amount) > 0;

                            return (
                                <div key={tx.id} className={`bg-[#0d1e36]/80 backdrop-blur rounded-2xl p-4 border ${config.border} hover:scale-[1.01] transition-transform`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl ${config.bg} flex items-center justify-center`}>
                                            <Icon size={24} className={config.color} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-bold">{config.label}</p>
                                            <p className="text-gray-500 text-sm truncate">{tx.description || '-'}</p>
                                            <p className="text-gray-600 text-xs mt-1">{formatDate(tx.created_at)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-lg font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {isPositive ? '+' : ''}฿{parseFloat(tx.amount).toLocaleString()}
                                            </p>
                                            {tx.balance_after && (
                                                <p className="text-gray-500 text-xs">
                                                    คงเหลือ ฿{parseFloat(tx.balance_after).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Pagination */}
                {transactions.last_page > 1 && (
                    <div className="flex justify-center gap-2 mt-6">
                        {Array.from({ length: Math.min(transactions.last_page, 5) }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => router.visit(`/transactions?page=${page}`)}
                                className={`w-10 h-10 rounded-xl font-bold transition-all ${transactions.current_page === page
                                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black shadow-lg shadow-yellow-500/30'
                                        : 'bg-[#0d1e36] text-gray-400 border border-[#1a3a5c] hover:border-yellow-500/50'
                                    }`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
