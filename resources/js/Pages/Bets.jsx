import React from 'react';
import { Head, router } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { ChevronLeft, Ticket, TrendingUp, TrendingDown, Clock, DollarSign, Trophy } from 'lucide-react';

export default function Bets({ bets = { data: [] }, summary = {} }) {
    return (
        <MainLayout>
            <Head title="รายการเล่น" />

            {/* Decorative Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 -left-32 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative max-w-4xl mx-auto pb-8">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={() => router.visit('/')}
                        className="p-2 bg-[#0d1e36] rounded-xl border border-[#1a3a5c] hover:border-yellow-500/50 transition-colors"
                    >
                        <ChevronLeft size={20} className="text-gray-400" />
                    </button>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <Ticket size={24} className="text-yellow-400" />
                        รายการเล่น
                    </h1>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <div className="bg-gradient-to-br from-blue-500/20 to-[#0d1e36] rounded-2xl p-4 border border-blue-500/30">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign size={18} className="text-blue-400" />
                            <span className="text-gray-400 text-xs">ยอดเล่น</span>
                        </div>
                        <p className="text-blue-400 text-xl font-bold font-mono">
                            ฿{(summary.totalBet || 0).toLocaleString()}
                        </p>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-500/20 to-[#0d1e36] rounded-2xl p-4 border border-yellow-500/30">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock size={18} className="text-yellow-400" />
                            <span className="text-gray-400 text-xs">ยอดเล่นค้าง</span>
                        </div>
                        <p className="text-yellow-400 text-xl font-bold font-mono">
                            ฿{(summary.pendingBet || 0).toLocaleString()}
                        </p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500/20 to-[#0d1e36] rounded-2xl p-4 border border-emerald-500/30">
                        <div className="flex items-center gap-2 mb-2">
                            <Trophy size={18} className="text-emerald-400" />
                            <span className="text-gray-400 text-xs">ชนะ</span>
                        </div>
                        <p className="text-emerald-400 text-xl font-bold font-mono">
                            +฿{(summary.totalWin || 0).toLocaleString()}
                        </p>
                    </div>
                    <div className="bg-gradient-to-br from-red-500/20 to-[#0d1e36] rounded-2xl p-4 border border-red-500/30">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingDown size={18} className="text-red-400" />
                            <span className="text-gray-400 text-xs">แพ้</span>
                        </div>
                        <p className="text-red-400 text-xl font-bold font-mono">
                            -฿{(summary.totalLoss || 0).toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Bets Table */}
                <div className="bg-[#0d1e36]/80 backdrop-blur rounded-2xl border border-[#1a3a5c] overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-5 text-xs text-yellow-400 font-bold p-4 border-b border-[#1a3a5c] bg-yellow-500/5">
                        <div>วันที่</div>
                        <div className="text-right">ยอดเล่น</div>
                        <div className="text-right">เล่นค้าง</div>
                        <div className="text-right">แพ้ชนะ</div>
                        <div className="text-right">สถานะ</div>
                    </div>

                    {/* Table Body */}
                    {bets.data?.length > 0 ? (
                        <div className="divide-y divide-[#1a3a5c]">
                            {bets.data.map((bet, i) => (
                                <div key={i} className="grid grid-cols-5 text-sm p-4 hover:bg-[#1a3a5c]/50 transition-colors">
                                    <div className="text-gray-300">
                                        {new Date(bet.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                    </div>
                                    <div className="text-right text-white font-mono">฿{(bet.amount || 0).toLocaleString()}</div>
                                    <div className="text-right text-yellow-400 font-mono">฿{(bet.pending || 0).toLocaleString()}</div>
                                    <div className={`text-right font-mono font-bold ${(bet.winLoss || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {(bet.winLoss || 0) >= 0 ? '+' : ''}฿{(bet.winLoss || 0).toLocaleString()}
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${bet.status === 'won' ? 'bg-emerald-500/20 text-emerald-400' :
                                            bet.status === 'lost' ? 'bg-red-500/20 text-red-400' :
                                                'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                            {bet.status === 'won' ? 'ชนะ' : bet.status === 'lost' ? 'แพ้' : 'รอ'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-12 text-center">
                            <Ticket size={48} className="mx-auto mb-4 text-gray-600" />
                            <p className="text-gray-500 font-medium">ไม่มีรายการเล่น</p>
                            <p className="text-gray-600 text-sm mt-1">เริ่มแทงหวยเพื่อดูรายการที่นี่</p>
                            <button
                                onClick={() => router.visit('/')}
                                className="mt-4 px-6 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold rounded-xl"
                            >
                                แทงหวยเลย
                            </button>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {bets.last_page > 1 && (
                    <div className="flex justify-center gap-2 mt-6">
                        {Array.from({ length: Math.min(bets.last_page, 5) }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => router.visit(`/bets?page=${page}`)}
                                className={`w-10 h-10 rounded-xl font-bold transition-all ${bets.current_page === page
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
