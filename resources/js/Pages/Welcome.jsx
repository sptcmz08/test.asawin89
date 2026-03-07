import React, { useState, useEffect, useCallback } from 'react';
import { Head, usePage } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import LotteryCard from '@/Components/LotteryCard';
import { RefreshCw, Trophy, TrendingUp, Award } from 'lucide-react';

// Auto-refresh hook for lottery results
const useAutoRefresh = (lotteries, intervalMinutes = 1) => {
    const [results, setResults] = useState({});
    const [lastFetch, setLastFetch] = useState(null);
    const [isFetching, setIsFetching] = useState(false);

    const fetchResults = useCallback(async () => {
        if (isFetching) return;
        setIsFetching(true);

        try {
            const response = await fetch('/api/lottery-results?t=' + Date.now());
            if (response.ok) {
                const data = await response.json();
                setResults(data.results || {});
                setLastFetch(new Date());
            }
        } catch (error) {
            console.error('Failed to fetch results:', error);
        } finally {
            setIsFetching(false);
        }
    }, [isFetching]);

    useEffect(() => {
        fetchResults();
        const interval = setInterval(() => fetchResults(), intervalMinutes * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchResults, intervalMinutes]);

    return { results, lastFetch, isFetching, refetch: fetchResults };
};

// Latest Results Component
const LatestResults = ({ results, onRefresh, isFetching }) => {
    if (!results || Object.keys(results).length === 0) return null;

    return (
        <div className="mx-4 mb-6">
            <div className="bg-[#1a2744] rounded-2xl p-4 border border-[#2a4a6c]">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-yellow-500/20 rounded-lg">
                            <Trophy className="text-yellow-400" size={20} />
                        </div>
                        <div>
                            <h3 className="text-yellow-400 font-bold text-lg">ผลรางวัลล่าสุด</h3>
                            <p className="text-[10px] text-gray-500">อัพเดทอัตโนมัติทุก 5 นาที</p>
                        </div>
                    </div>
                    <button
                        onClick={onRefresh}
                        disabled={isFetching}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={`text-gray-400 ${isFetching ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {Object.entries(results).map(([slug, result]) => (
                        <div key={slug} className={`bg-[#0d1525] rounded-xl p-3 text-center border ${result.draw_date ? 'border-[#1a3a5c]' : 'border-[#1a2a3c] opacity-60'}`}>
                            <div className="text-[10px] text-gray-500 mb-1 truncate">{result.name}</div>
                            <div className={`text-xl font-bold font-mono tracking-wider ${result.draw_date ? 'text-yellow-400' : 'text-gray-600 text-sm'}`}>
                                {result.draw_date ? (result.first_prize || '-') : 'ยังไม่มีผล'}
                            </div>
                            {result.draw_date && (
                                <div className="text-[9px] text-gray-600 mt-1">
                                    {new Date(result.draw_date).toLocaleDateString('th-TH')}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Section Header Component
const SectionHeader = ({ icon: Icon, title, count, color }) => (
    <div className="mb-4">
        <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${color}`}>
            <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                    <Icon className="text-white" size={20} />
                </div>
                <span className="text-white font-bold text-lg">{title}</span>
            </div>
            <span className="px-3 py-1 bg-black/30 rounded-full text-xs text-white/80 font-medium">
                {count} ประเภท
            </span>
        </div>
    </div>
);

export default function Welcome({ lotteries, serverTime }) {
    const { auth } = usePage().props;
    const { results, lastFetch, isFetching, refetch } = useAutoRefresh(lotteries, 5);

    // Sort order for grouping similar lotteries together
    const lotterySortOrder = [
        'thai', 'baac', 'gsb-1', 'gsb-2',
        'lao', 'lao-vip', 'lao-star', 'lao-samakki',
        'hanoi', 'hanoi-vip', 'hanoi-special', 'hanoi-adhoc', 'hanoi-redcross',
        'malay',
    ];
    const stockSortOrder = [
        'thai-stock-morning', 'thai-stock',
        'nikkei-morning', 'nikkei-afternoon',
        'china-morning', 'china-afternoon',
        'hangseng-morning', 'hangseng-afternoon',
        'taiwan', 'korea', 'singapore',
        'india', 'egypt', 'russia',
        'germany', 'uk', 'dowjones',
    ];
    const stockVipSortOrder = [
        'nikkei-morning-vip', 'nikkei-afternoon-vip',
        'china-morning-vip', 'china-afternoon-vip',
        'hangseng-morning-vip', 'hangseng-afternoon-vip',
        'taiwan-vip', 'singapore-vip',
        'india-vip', 'egypt-vip', 'russia-vip',
        'germany-vip', 'uk-vip', 'dowjones-vip',
    ];

    const sortByOrder = (items, order) => {
        return [...items].sort((a, b) => {
            const ai = order.indexOf(a.slug);
            const bi = order.indexOf(b.slug);
            return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        });
    };

    // Separate and sort lotteries by category
    const regularLotteries = sortByOrder(
        lotteries?.filter(l => l.category !== 'stock' && l.category !== 'stock-vip') || [],
        lotterySortOrder
    );
    const stockLotteries = sortByOrder(
        lotteries?.filter(l => l.category === 'stock') || [],
        stockSortOrder
    );
    const stockVipLotteries = sortByOrder(
        lotteries?.filter(l => l.category === 'stock-vip') || [],
        stockVipSortOrder
    );

    // User stats
    const stats = {
        totalBet: 0,
        pending: 0,
        withdrawable: auth?.user?.credit || 0,
    };

    return (
        <MainLayout>
            <Head title="หน้าหลัก" />

            {/* Stats */}
            <div className="p-4 pb-2">
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'เดิมพัน', value: stats.totalBet, color: 'bg-blue-700', icon: '🎲' },
                        { label: 'รอดำเนินการ', value: stats.pending, color: 'bg-cyan-700', icon: '⏳' },
                        { label: 'ยอดถอนได้', value: stats.withdrawable, color: 'bg-green-700', icon: '💰' },
                    ].map((stat, i) => (
                        <div key={i} className={`${stat.color} rounded-2xl p-4 text-center border border-white/10`}>
                            <div className="text-2xl mb-1">{stat.icon}</div>
                            <div className="text-[10px] text-white/70 mb-1">{stat.label}</div>
                            <div className="text-lg font-black text-white font-mono">
                                ฿{stat.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Latest Results */}
            <LatestResults results={results} onRefresh={refetch} isFetching={isFetching} />

            {/* ===== หวย Section ===== */}
            {regularLotteries.length > 0 && (
                <div className="p-4 pt-2">
                    <SectionHeader
                        icon={Award}
                        title="หวย"
                        count={regularLotteries.length}
                        color="bg-yellow-700"
                    />
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
                        {regularLotteries.map((l, i) => (
                            <LotteryCard
                                key={i}
                                name={l.name}
                                slug={l.slug}
                                drawTime={l.draw_time}
                                closeTime={l.close_time}
                                status={l.status}
                                scheduleDesc={l.schedule_desc}
                                description={l.description}
                                category={l.category}
                                nextDrawDay={l.next_draw_day}
                                nextDrawTime={l.next_draw_time_formatted}
                                nextOpenDay={l.next_open_day}
                                nextOpenTime={l.next_open_time}
                                latestResult={l.latest_result}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* ===== หวยหุ้น Section ===== */}
            {stockLotteries.length > 0 && (
                <div className="p-4 pt-2">
                    <SectionHeader
                        icon={TrendingUp}
                        title="หวยหุ้น"
                        count={stockLotteries.length}
                        color="bg-emerald-700"
                    />
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
                        {stockLotteries.map((l, i) => (
                            <LotteryCard
                                key={i}
                                name={l.name}
                                slug={l.slug}
                                drawTime={l.draw_time}
                                closeTime={l.close_time}
                                status={l.status}
                                scheduleDesc={l.schedule_desc}
                                description={l.description}
                                category={l.category}
                                nextDrawDay={l.next_draw_day}
                                nextDrawTime={l.next_draw_time_formatted}
                                nextOpenDay={l.next_open_day}
                                nextOpenTime={l.next_open_time}
                                latestResult={l.latest_result}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* ===== หวยหุ้น VIP Section ===== */}
            {stockVipLotteries.length > 0 && (
                <div className="p-4 pt-2">
                    <SectionHeader
                        icon={TrendingUp}
                        title="หวยหุ้น VIP"
                        count={stockVipLotteries.length}
                        color="bg-purple-700"
                    />
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
                        {stockVipLotteries.map((l, i) => (
                            <LotteryCard
                                key={i}
                                name={l.name}
                                slug={l.slug}
                                drawTime={l.draw_time}
                                closeTime={l.close_time}
                                status={l.status}
                                scheduleDesc={l.schedule_desc}
                                description={l.description}
                                category={l.category}
                                nextDrawDay={l.next_draw_day}
                                nextDrawTime={l.next_draw_time_formatted}
                                nextOpenDay={l.next_open_day}
                                nextOpenTime={l.next_open_time}
                                latestResult={l.latest_result}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Spacer */}
            <div className="h-20" />
        </MainLayout>
    );
}
