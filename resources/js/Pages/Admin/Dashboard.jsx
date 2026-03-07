import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { Users, Receipt, Wallet, CreditCard, Star, Calendar, TrendingUp, DollarSign, Clock, AlertTriangle, FileText, Menu, X, Home, ChevronRight, Settings } from 'lucide-react';

// Premium Admin Layout
const AdminLayout = ({ children }) => {
    const { auth, url } = usePage().props;
    const [sidebarOpen, setSidebarOpen] = React.useState(false);
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    const navItems = [
        { href: '/admin', icon: TrendingUp, label: 'แดชบอร์ด' },
        { href: '/admin/users', icon: Users, label: 'สมาชิก' },
        { href: '/admin/bets', icon: Receipt, label: 'รายการแทง' },
        { href: '/admin/withdrawals', icon: Wallet, label: 'ถอนเงิน' },
        { href: '/admin/payments', icon: CreditCard, label: 'จ่ายรางวัล' },
        { href: '/admin/lottery-results', icon: FileText, label: 'ผลหวย' },
        { href: '/admin/lucky-numbers', icon: Star, label: 'เลขอั้น' },
        { href: '/admin/schedule', icon: Calendar, label: 'ตารางงวด' },
        { href: '/admin/payout-rates', icon: DollarSign, label: 'อัตราจ่าย' },
        { href: '/admin/bet-limits', icon: AlertTriangle, label: 'วงเงินแทง' },
        { href: '/admin/settings', icon: Settings, label: 'ตั้งค่า' },
    ];

    const isActive = (href) => {
        if (href === '/admin') return currentPath === '/admin';
        return currentPath.startsWith(href);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#020b16] via-[#0a1628] to-[#020b16]">
            {/* Header */}
            <header className="bg-gradient-to-r from-[#0d1e36] to-[#0a1628] border-b border-yellow-500/20 px-4 py-3 flex items-center justify-between sticky top-0 z-40 backdrop-blur-lg">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="lg:hidden p-2 bg-yellow-500/10 hover:bg-yellow-500/20 rounded-xl text-yellow-400 transition-colors"
                    >
                        <Menu size={24} />
                    </button>
                    <div className="flex items-center gap-2">
                        <img src="/images/logo.png" alt="LOTTO.com" className="h-[120px] object-contain" />
                        <div className="hidden sm:block">
                            <p className="text-xs text-yellow-400/70">Admin Panel</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-gray-400 text-sm hidden sm:inline">{auth?.user?.name}</span>
                    <Link
                        href="/"
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-xl text-sm font-medium transition-colors"
                    >
                        <Home size={16} />
                        <span className="hidden sm:inline">หน้าหลัก</span>
                    </Link>
                </div>
            </header>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <div className="flex">
                {/* Sidebar */}
                <aside className={`fixed lg:sticky top-0 lg:top-[65px] left-0 h-screen lg:h-[calc(100vh-65px)] w-72 bg-gradient-to-b from-[#0d1e36] to-[#0a1628] border-r border-[#1a3a5c] z-50 transform transition-transform duration-300 lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                    {/* Mobile close button */}
                    <div className="lg:hidden flex justify-between items-center p-4 border-b border-[#1a3a5c]">
                        <span className="text-yellow-400 font-bold">เมนู</span>
                        <button onClick={() => setSidebarOpen(false)} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#1a3a5c]">
                            <X size={24} />
                        </button>
                    </div>
                    <nav className="p-4 space-y-1">
                        {navItems.map((item) => {
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active
                                        ? 'bg-gradient-to-r from-yellow-500/20 to-transparent text-yellow-400 border-l-4 border-yellow-400'
                                        : 'text-gray-400 hover:bg-[#1a3a5c]/50 hover:text-white border-l-4 border-transparent'
                                        }`}
                                >
                                    <item.icon size={20} />
                                    <span className="font-medium">{item.label}</span>
                                    {active && <ChevronRight size={16} className="ml-auto" />}
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-4 lg:p-6 min-h-[calc(100vh-65px)]">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default function AdminDashboard({ stats }) {
    const defaultStats = {
        totalUsers: 0, totalBets: 0, pendingWithdrawals: 0,
        todayBets: 0, todayPayouts: 0, todayProfit: 0, todayDeposits: 0, todayWithdrawals: 0,
        todayWins: 0, todayLosses: 0, todayPending: 0,
        monthlyBets: 0, monthlyPayouts: 0, monthlyProfit: 0, monthlyDeposits: 0, monthlyWithdrawals: 0,
        lastMonthBets: 0, lastMonthProfit: 0, lastMonthDeposits: 0, lastMonthWithdrawals: 0,
        allTimeBets: 0, allTimePayouts: 0, allTimeProfit: 0, allTimeDeposits: 0, allTimeWithdrawals: 0,
        topNumbers: [], recentLogs: [],
        ...stats,
    };

    const fmt = (n) => `฿${Math.floor(Number(n || 0)).toLocaleString()}`;
    const profitClass = (n) => Number(n || 0) >= 0 ? 'text-emerald-400' : 'text-red-400';
    const profitSign = (n) => Number(n || 0) >= 0 ? '+' : '';

    const statCards = [
        { label: 'สมาชิกทั้งหมด', value: defaultStats.totalUsers, icon: Users, color: 'from-blue-400 to-blue-600', shadow: 'shadow-blue-500/30' },
        { label: 'ยอดแทงวันนี้', value: fmt(defaultStats.todayBets), icon: Receipt, color: 'from-yellow-400 to-yellow-600', shadow: 'shadow-yellow-500/30' },
        { label: 'ยอดฝากวันนี้', value: fmt(defaultStats.todayDeposits), icon: DollarSign, color: 'from-emerald-400 to-emerald-600', shadow: 'shadow-emerald-500/30' },
        { label: 'ยอดถอนวันนี้', value: fmt(defaultStats.todayWithdrawals), icon: Wallet, color: 'from-red-400 to-red-600', shadow: 'shadow-red-500/30' },
        { label: 'รอดำเนินการถอน', value: defaultStats.pendingWithdrawals, icon: Clock, color: 'from-orange-400 to-orange-600', shadow: 'shadow-orange-500/30' },
    ];

    // Financial row renderer for reuse
    const FinancialBlock = ({ title, emoji, data, compareLabel, compareData }) => (
        <div className="bg-[#0d1e36]/80 backdrop-blur rounded-2xl border border-[#1a3a5c] p-5">
            <h4 className="text-yellow-400 font-bold text-sm mb-3">{emoji} {title}</h4>

            {/* Lottery P&L */}
            <div className="mb-3">
                <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1">💰 หวย (รายรับ - จ่ายรางวัล = กำไร)</p>
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <p className="text-gray-500 text-xs">ยอดแทง (รายรับ)</p>
                        <p className="text-blue-400 text-lg font-bold font-mono">{fmt(data.bets)}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs">จ่ายรางวัล (รายจ่าย)</p>
                        <p className="text-red-400 text-lg font-bold font-mono">{fmt(data.payouts)}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs">กำไร/ขาดทุน</p>
                        <p className={`text-lg font-bold font-mono ${profitClass(data.profit)}`}>
                            {profitSign(data.profit)}{fmt(data.profit)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Deposits & Withdrawals */}
            <div className="border-t border-[#1a3a5c] pt-3">
                <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1">🏦 ฝาก-ถอน (เงินเข้า - เงินออก)</p>
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <p className="text-gray-500 text-xs">ยอดฝาก</p>
                        <p className="text-emerald-400 text-lg font-bold font-mono">{fmt(data.deposits)}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs">ยอดถอน</p>
                        <p className="text-orange-400 text-lg font-bold font-mono">{fmt(data.withdrawals)}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs">ฝาก-ถอน สุทธิ</p>
                        <p className={`text-lg font-bold font-mono ${profitClass(Number(data.deposits || 0) - Number(data.withdrawals || 0))}`}>
                            {profitSign(Number(data.deposits || 0) - Number(data.withdrawals || 0))}{fmt(Number(data.deposits || 0) - Number(data.withdrawals || 0))}
                        </p>
                    </div>
                </div>
            </div>

            {/* Extra stats for Today */}
            {data.wins !== undefined && (
                <div className="border-t border-[#1a3a5c] pt-3 mt-3">
                    <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1">📊 สถิติ</p>
                    <div className="flex items-center gap-4 text-sm">
                        <span className="text-emerald-400 font-bold">✅ ถูก {data.wins}</span>
                        <span className="text-red-400 font-bold">❌ ไม่ถูก {data.losses}</span>
                        <span className="text-yellow-400 font-bold">⏳ รอผล {data.pending}</span>
                    </div>
                </div>
            )}

            {/* Comparison */}
            {compareLabel && (
                <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-[#1a3a5c]/50">
                    {compareLabel}: กำไร {fmt(compareData.profit)} | ฝาก {fmt(compareData.deposits)} | ถอน {fmt(compareData.withdrawals)}
                </p>
            )}
        </div>
    );

    return (
        <AdminLayout>
            <Head title="Admin Dashboard" />

            {/* Scraper Alert Banner */}
            {defaultStats.scraperAlert?.consecutiveFailures >= 3 && (
                <div className="bg-gradient-to-r from-red-500/20 to-orange-500/10 border border-red-500/40 rounded-2xl p-4 mb-6 flex items-center gap-3">
                    <AlertTriangle className="text-red-400 flex-shrink-0" size={24} />
                    <div>
                        <p className="text-red-300 font-bold">⚠️ Scraper มีปัญหา!</p>
                        <p className="text-red-400/70 text-sm">
                            ล้มเหลวติดต่อกัน {defaultStats.scraperAlert.consecutiveFailures} ครั้ง
                            {defaultStats.scraperAlert.lastSuccess && ` • สำเร็จล่าสุด: ${defaultStats.scraperAlert.lastSuccess}`}
                        </p>
                    </div>
                    <Link href="/admin/lottery-results" className="ml-auto px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl text-sm font-medium transition-colors whitespace-nowrap">
                        ตรวจสอบ
                    </Link>
                </div>
            )}

            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">แดชบอร์ด</h2>
                <p className="text-gray-400">ภาพรวมระบบ</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                {statCards.map((stat, i) => (
                    <div key={i} className="bg-[#0d1e36]/80 backdrop-blur rounded-2xl p-4 border border-[#1a3a5c] hover:border-yellow-500/30 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg ${stat.shadow}`}>
                                <stat.icon className="text-white" size={24} />
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">{stat.label}</p>
                                <p className="text-xl font-bold text-white">{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* === Comprehensive Financial Summary === */}
            <div className="mb-6">
                <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                    📊 สรุปรายรับ-รายจ่าย
                </h3>

                <div className="space-y-4">
                    {/* Today */}
                    <FinancialBlock
                        title="วันนี้" emoji="📅"
                        data={{
                            bets: defaultStats.todayBets, payouts: defaultStats.todayPayouts, profit: defaultStats.todayProfit,
                            deposits: defaultStats.todayDeposits, withdrawals: defaultStats.todayWithdrawals,
                            wins: defaultStats.todayWins, losses: defaultStats.todayLosses, pending: defaultStats.todayPending,
                        }}
                    />

                    {/* This Month + All-Time side by side */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <FinancialBlock
                            title="เดือนนี้" emoji="📆"
                            data={{
                                bets: defaultStats.monthlyBets, payouts: defaultStats.monthlyPayouts, profit: defaultStats.monthlyProfit,
                                deposits: defaultStats.monthlyDeposits, withdrawals: defaultStats.monthlyWithdrawals,
                            }}
                            compareLabel="เดือนก่อน"
                            compareData={{
                                profit: defaultStats.lastMonthProfit,
                                deposits: defaultStats.lastMonthDeposits,
                                withdrawals: defaultStats.lastMonthWithdrawals,
                            }}
                        />
                        <FinancialBlock
                            title="รวมทั้งหมด" emoji="🏆"
                            data={{
                                bets: defaultStats.allTimeBets, payouts: defaultStats.allTimePayouts, profit: defaultStats.allTimeProfit,
                                deposits: defaultStats.allTimeDeposits, withdrawals: defaultStats.allTimeWithdrawals,
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Top Bet Numbers */}
                <div className="bg-[#0d1e36]/80 backdrop-blur rounded-2xl p-5 border border-[#1a3a5c]">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl">🔥</span>
                        <h3 className="text-white font-bold">เลขยอดนิยมวันนี้</h3>
                    </div>
                    {defaultStats.topNumbers && defaultStats.topNumbers.length > 0 ? (
                        <div className="space-y-2">
                            {defaultStats.topNumbers.map((item, i) => (
                                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl bg-[#0a1628] hover:bg-[#1a3a5c]/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-400'}`}>
                                            {i + 1}
                                        </span>
                                        <span className="text-yellow-400 font-mono font-bold text-lg">{item.number}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-white font-bold">฿{Math.floor(Number(item.total_amount)).toLocaleString()}</span>
                                        <span className="text-gray-500 text-sm ml-2">({item.bet_count}x)</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">ยังไม่มีรายการแทงวันนี้</div>
                    )}
                </div>

                {/* Recent Admin Logs */}
                <div className="bg-[#0d1e36]/80 backdrop-blur rounded-2xl p-5 border border-[#1a3a5c]">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl">📋</span>
                        <h3 className="text-white font-bold">การทำงานล่าสุด</h3>
                    </div>
                    {defaultStats.recentLogs && defaultStats.recentLogs.length > 0 ? (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {defaultStats.recentLogs.map((log, i) => (
                                <div key={i} className="py-2 px-3 rounded-xl bg-[#0a1628]">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400 text-sm">{log.admin?.name || 'System'}</span>
                                        <span className="text-gray-600 text-xs">
                                            {new Date(log.created_at).toLocaleString('th-TH')}
                                        </span>
                                    </div>
                                    <p className="text-white text-sm mt-1">{log.description}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">ไม่มีประวัติการทำงาน</div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pending Withdrawals */}
                <div className="bg-[#0d1e36]/80 backdrop-blur rounded-2xl p-5 border border-[#1a3a5c]">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-bold">รอดำเนินการถอน</h3>
                        <Link href="/admin/withdrawals" className="text-yellow-400 text-sm hover:underline">ดูทั้งหมด</Link>
                    </div>
                    <div className="text-center py-6">
                        {defaultStats.pendingWithdrawals > 0 ? (
                            <div className="flex items-center justify-center gap-2">
                                <AlertTriangle size={24} className="text-orange-400" />
                                <span className="text-orange-400 font-bold text-lg">{defaultStats.pendingWithdrawals} รายการรอดำเนินการ</span>
                            </div>
                        ) : (
                            <span className="text-gray-500">ไม่มีรายการรอดำเนินการ</span>
                        )}
                    </div>
                </div>

                {/* Quick Links */}
                <div className="bg-[#0d1e36]/80 backdrop-blur rounded-2xl p-5 border border-[#1a3a5c]">
                    <h3 className="text-white font-bold mb-4">ลิงก์ด่วน</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <Link href="/admin/lottery-results" className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500/20 to-blue-600/10 text-blue-400 px-4 py-3 rounded-xl hover:from-blue-500/30 transition border border-blue-500/30">
                            <FileText size={18} />
                            ดึงผลหวย
                        </Link>
                        <Link href="/admin/payments" className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 text-emerald-400 px-4 py-3 rounded-xl hover:from-emerald-500/30 transition border border-emerald-500/30">
                            <CreditCard size={18} />
                            จ่ายเงิน
                        </Link>
                        <Link href="/admin/lucky-numbers" className="flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 text-yellow-400 px-4 py-3 rounded-xl hover:from-yellow-500/30 transition border border-yellow-500/30">
                            <Star size={18} />
                            เลขอั้น
                        </Link>
                        <Link href="/admin/users" className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500/20 to-purple-600/10 text-purple-400 px-4 py-3 rounded-xl hover:from-purple-500/30 transition border border-purple-500/30">
                            <Users size={18} />
                            สมาชิก
                        </Link>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

export { AdminLayout };
