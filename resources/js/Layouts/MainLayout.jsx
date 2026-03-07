import React, { useState, useEffect, useRef } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Menu, X, Home, Wallet, History, User, Settings, MessageCircle, Gift, Phone, ChevronRight, LogOut, Crown, Sparkles, Zap, BookOpen, Bell } from 'lucide-react';

export default function MainLayout({ children }) {
    const { auth, line_contact_id } = usePage().props;
    const user = auth?.user;
    const lineId = line_contact_id || '@042jhjrk';
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const notifRef = useRef(null);

    // Fetch notifications on mount
    useEffect(() => {
        if (!user) return;
        const fetchNotifs = async () => {
            try {
                const res = await fetch('/api/notifications');
                if (res.ok) {
                    const data = await res.json();
                    setNotifications(data.notifications || []);
                    setUnreadCount(data.unread_count || 0);
                }
            } catch { }
        };
        fetchNotifs();
        const interval = setInterval(fetchNotifs, 60000); // poll every 60s
        return () => clearInterval(interval);
    }, [user]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClick = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setNotifOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const markAllRead = async () => {
        try {
            await fetch('/api/notifications/mark-read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]*)/)?.[1] || ''),
                },
            });
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch { }
    };

    return (
        <div className="min-h-screen bg-[#0a1628] text-white font-sans flex flex-col">
            {/* Header */}
            <header className="bg-[#0d1e36] border-b border-[#1a3a5c] sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2.5 bg-[#1a3a5c] rounded-xl border border-[#2a4a6c]"
                    >
                        <Menu size={22} className="text-yellow-400" />
                    </button>

                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <img src="/images/logo.png" alt="LOTTO.com" className="h-[120px] object-contain" />
                    </Link>

                    {/* Right side: Bell + Credit */}
                    <div className="flex items-center gap-2">
                        {/* Notification Bell */}
                        {user && (
                            <div className="relative" ref={notifRef}>
                                <button
                                    onClick={() => setNotifOpen(!notifOpen)}
                                    className="p-2.5 bg-[#1a3a5c] rounded-xl border border-[#2a4a6c] relative"
                                >
                                    <Bell size={18} className="text-gray-300" />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white animate-pulse">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>

                                {/* Dropdown */}
                                {notifOpen && (
                                    <div className="absolute right-0 top-12 w-80 max-h-96 bg-[#0d1e36] border border-[#1a3a5c] rounded-2xl shadow-2xl overflow-hidden z-50">
                                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a3a5c]">
                                            <span className="text-sm font-bold text-white flex items-center gap-2">
                                                <Bell size={14} className="text-yellow-400" />
                                                การแจ้งเตือน
                                            </span>
                                            {unreadCount > 0 && (
                                                <button
                                                    onClick={markAllRead}
                                                    className="text-xs text-blue-400 hover:text-blue-300"
                                                >
                                                    อ่านทั้งหมด
                                                </button>
                                            )}
                                        </div>
                                        <div className="overflow-y-auto max-h-72">
                                            {notifications.length === 0 ? (
                                                <div className="px-4 py-8 text-center text-gray-500 text-sm">
                                                    ไม่มีการแจ้งเตือน
                                                </div>
                                            ) : (
                                                notifications.map(n => (
                                                    <div
                                                        key={n.id}
                                                        className={`px-4 py-3 border-b border-[#1a3a5c]/50 ${!n.is_read ? 'bg-blue-500/5' : ''}`}
                                                    >
                                                        <div className="flex items-start gap-2">
                                                            {!n.is_read && <div className="w-2 h-2 bg-blue-400 rounded-full mt-1.5 flex-shrink-0" />}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-bold text-white">{n.title}</p>
                                                                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{n.message}</p>
                                                                <p className="text-[10px] text-gray-600 mt-1">
                                                                    {new Date(n.created_at).toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Credit Display */}
                        <div className="px-4 py-2 rounded-xl flex items-center gap-2 border bg-[#1a3a5c]/80 border-[#2a4a6c]">
                            <Wallet size={16} className="text-yellow-400" />
                            <span className="font-mono font-bold text-yellow-400 text-lg">
                                {(user?.credit || 0).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/70 z-50"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed top-0 left-0 h-full w-72 bg-[#0a1a30] border-r border-[#1a3a5c] z-50 transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Sidebar Header */}
                <div className="px-4 py-3 flex justify-between items-center border-b border-[#1a3a5c]">
                    <span className="text-sm text-gray-400 font-medium">เมนูหลัก</span>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="p-2 hover:bg-white/10 rounded-lg"
                    >
                        <ChevronRight size={20} className="text-gray-400 rotate-180" />
                    </button>
                </div>

                <div className="overflow-y-auto max-h-[calc(100vh-60px)]">
                    {/* Icon Grid Menu */}
                    <div className="p-4 border-b border-[#1a3a5c]">
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { href: '/', icon: <Home size={26} />, label: 'หน้าแรก', iconColor: 'text-blue-400', glowColor: 'shadow-blue-500/20' },
                                { href: '/rules', icon: <BookOpen size={26} />, label: 'กติกา', iconColor: 'text-emerald-400', glowColor: 'shadow-emerald-500/20' },
                                { href: '/referral', icon: <Gift size={26} />, label: 'เชิญเพื่อน', iconColor: 'text-yellow-400', glowColor: 'shadow-yellow-500/20' },
                                { href: '/profile', icon: <User size={26} />, label: 'โปรไฟล์', iconColor: 'text-purple-400', glowColor: 'shadow-purple-500/20' },
                                { href: '/transactions', icon: <Wallet size={26} />, label: 'กระเป๋าเงิน', iconColor: 'text-cyan-400', glowColor: 'shadow-cyan-500/20' },
                                { href: '/bets', icon: <History size={26} />, label: 'ประวัติแทง', iconColor: 'text-orange-400', glowColor: 'shadow-orange-500/20' },
                            ].map((item) => (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className="flex flex-col items-center gap-2 group"
                                >
                                    <div className={`w-full aspect-square rounded-2xl 
                                        bg-gradient-to-b from-[#1e2d45] to-[#131f33]
                                        border border-[#2a4060]/80
                                        flex items-center justify-center 
                                        shadow-lg ${item.glowColor}
                                        group-hover:from-[#253550] group-hover:to-[#1a2940]
                                        group-hover:border-[#3a5575]
                                        group-active:from-[#131f33] group-active:to-[#0e1829]
                                        transition-all duration-150 relative overflow-hidden`}
                                        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.3)' }}
                                    >
                                        {/* Subtle top highlight */}
                                        <div className="absolute top-0 left-2 right-2 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                        <div className={`${item.iconColor} drop-shadow-lg`}>
                                            {item.icon}
                                        </div>
                                    </div>
                                    <span className="text-[11px] text-gray-400 font-medium text-center leading-tight group-hover:text-gray-200 transition-colors">
                                        {item.label}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Contact Section */}
                    <div className="p-4 border-b border-[#1a3a5c]">
                        <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-bold">ติดต่อเรา</h3>
                        <div className="space-y-2">
                            {/* LINE Contact */}
                            <a
                                href={`https://line.me/R/ti/p/${lineId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#06C755]/10 border border-[#06C755]/20 hover:bg-[#06C755]/20"
                            >
                                <div className="w-10 h-10 rounded-xl bg-[#06C755] flex items-center justify-center flex-shrink-0">
                                    <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                                        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-[#06C755] font-bold text-sm">LINE</div>
                                    <div className="text-gray-400 text-xs">{lineId}</div>
                                </div>
                            </a>

                        </div>
                    </div>

                    {/* User Section */}
                    <div className="p-4">
                        {user ? (
                            <>
                                {/* User Info */}
                                <div className="bg-[#1a3a5c]/50 rounded-2xl p-4 border border-[#2a4a6c] mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold text-lg">
                                            {user.name?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white text-sm">{user.name}</div>
                                            <div className="text-xs text-gray-400">@{user.username}</div>
                                            <div className="text-sm text-yellow-400 font-mono font-bold mt-0.5">
                                                ฿{(user.credit || 0).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Logout Button */}
                                <button
                                    onClick={() => {
                                        setSidebarOpen(false);
                                        setTimeout(() => {
                                            const form = document.createElement('form');
                                            form.method = 'POST';
                                            form.action = '/logout';
                                            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
                                            if (csrfToken) {
                                                const input = document.createElement('input');
                                                input.type = 'hidden';
                                                input.name = '_token';
                                                input.value = csrfToken;
                                                form.appendChild(input);
                                            }
                                            document.body.appendChild(form);
                                            form.submit();
                                        }, 100);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 font-medium text-sm"
                                >
                                    <LogOut size={16} />
                                    <span>ออกจากระบบ</span>
                                </button>
                            </>
                        ) : (
                            <div className="space-y-2">
                                <Link
                                    href="/login"
                                    onClick={() => setSidebarOpen(false)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white bg-blue-500 hover:bg-blue-600 font-bold text-sm"
                                >
                                    <LogOut size={16} />
                                    เข้าสู่ระบบ
                                </Link>
                                <Link
                                    href="/register"
                                    onClick={() => setSidebarOpen(false)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20 font-bold text-sm"
                                >
                                    <User size={16} />
                                    สมัครสมาชิก
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 w-full max-w-6xl mx-auto pb-24 p-4">
                {children}
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-[#0d1e36] border-t border-[#1a3a5c] z-40">
                <div className="max-w-6xl mx-auto flex justify-around items-end h-18 py-2 relative">
                    <BottomNavLink href="/deposit" icon={<Wallet size={22} />} label="ฝากเงิน" />
                    <BottomNavLink href="/withdraw" icon={<Wallet size={22} />} label="ถอนเงิน" />

                    {/* Center Home Button - Large & Prominent */}
                    <Link
                        href="/"
                        className="absolute left-1/2 -translate-x-1/2 -top-6 flex flex-col items-center"
                    >
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/30 border-4 border-[#0d1e36] ${(usePage().url === '/') ? 'bg-gradient-to-br from-yellow-400 to-amber-500' : 'bg-gradient-to-br from-blue-500 to-blue-600'
                            }`}>
                            <Home size={28} className="text-white" />
                        </div>
                        <span className={`text-[10px] font-bold mt-1 ${(usePage().url === '/') ? 'text-yellow-400' : 'text-gray-400'
                            }`}>หน้าแรก</span>
                    </Link>

                    <BottomNavLink href="/bets" icon={<History size={22} />} label="รายการเล่น" />
                    <BottomNavLink href="/profile" icon={<User size={22} />} label="โปรไฟล์" />
                </div>
            </nav>
        </div>
    );
}

function BottomNavLink({ href, icon, label }) {
    const { url } = usePage();
    const isActive = url === href || (href !== '/' && url.startsWith(href));

    return (
        <Link
            href={href}
            className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl ${isActive
                ? 'text-yellow-400 bg-yellow-500/10'
                : 'text-gray-500'
                }`}
        >
            {icon}
            <span className="text-[10px] font-medium">{label}</span>
            {isActive && <div className="w-1 h-1 bg-yellow-400 rounded-full" />}
        </Link>
    );
}
