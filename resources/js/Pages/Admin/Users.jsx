import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { AdminLayout } from './Dashboard';
import { Search, DollarSign, MinusCircle, Ban, Check, Users as UsersIcon, Wallet, X, KeyRound, Copy, CheckCircle, Shuffle, Eye, EyeOff, ChevronLeft, ChevronRight, Gift } from 'lucide-react';
import { useAlert } from '@/Components/AlertModal';

export default function AdminUsers({ users = { data: [] }, filters = {} }) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [creditModal, setCreditModal] = useState(null);
    const [creditAmount, setCreditAmount] = useState('');
    const [deductModal, setDeductModal] = useState(null);
    const [deductAmount, setDeductAmount] = useState('');
    const [deductNote, setDeductNote] = useState('');
    const [bonusModal, setBonusModal] = useState(null);
    const [bonusAmount, setBonusAmount] = useState('');
    const [bonusNote, setBonusNote] = useState('');
    const [passwordResult, setPasswordResult] = useState(null);
    const [resetModal, setResetModal] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [copied, setCopied] = useState(false);
    const { alert, AlertComponent } = useAlert();

    // Server-side search with debounce
    const searchTimerRef = React.useRef(null);
    const handleSearch = (value) => {
        setSearchTerm(value);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => {
            router.get(window.location.pathname, { search: value || undefined }, { preserveState: true, preserveScroll: true });
        }, 400);
    };

    const filteredUsers = users.data || [];


    const handleAddCredit = async (userId) => {
        if (!creditAmount || parseFloat(creditAmount) <= 0) return;

        try {
            const response = await fetch(`/admin/users/${userId}/credit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ amount: parseFloat(creditAmount) }),
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                alert.error(data.message || 'เกิดข้อผิดพลาดในการเพิ่มเครดิต');
                return;
            }
            alert.success(`เพิ่มเครดิต ฿${parseFloat(creditAmount).toLocaleString()} สำเร็จ`, 'เพิ่มเครดิตสำเร็จ!');
            setTimeout(() => router.reload(), 1500);
            setCreditModal(null);
            setCreditAmount('');
        } catch (error) {
            alert.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        }
    };

    const handleAddBonusCredit = async (userId) => {
        if (!bonusAmount || parseFloat(bonusAmount) <= 0) return;

        try {
            const response = await fetch(`/admin/users/${userId}/bonus-credit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-XSRF-TOKEN': decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]*)/)?.[1] || ''),
                },
                body: JSON.stringify({ amount: parseFloat(bonusAmount), note: bonusNote.trim() }),
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                alert.error(data.message || 'เกิดข้อผิดพลาดในการเพิ่มโบนัสเครดิต');
                return;
            }
            alert.success(`เพิ่มโบนัสเครดิต ฿${parseFloat(bonusAmount).toLocaleString()} สำเร็จ`, '✅ เพิ่มโบนัสเรียบร้อย');
            setTimeout(() => router.reload(), 1500);
            setBonusModal(null);
            setBonusAmount('');
            setBonusNote('');
        } catch (error) {
            alert.error('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + (error.message || error));
        }
    };

    const handleDeductCredit = async (userId) => {
        if (!deductAmount || parseFloat(deductAmount) <= 0) return;
        if (!deductNote.trim()) {
            alert.error('กรุณาระบุหมายเหตุ');
            return;
        }

        try {
            const response = await fetch(`/admin/users/${userId}/deduct-credit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-XSRF-TOKEN': decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]*)/)?.[1] || ''),
                },
                body: JSON.stringify({ amount: parseFloat(deductAmount), note: deductNote.trim() }),
            });

            if (!response.ok) {
                let msg = `Server Error: ${response.status}`;
                try { const err = await response.json(); msg = err.message || msg; } catch { }
                alert.error(msg);
                return;
            }

            const data = await response.json();
            if (!data.success) {
                alert.error(data.message || '\u0e40\u0e01\u0e34\u0e14\u0e02\u0e49\u0e2d\u0e1c\u0e34\u0e14\u0e1e\u0e25\u0e32\u0e14\u0e43\u0e19\u0e01\u0e32\u0e23\u0e1b\u0e23\u0e31\u0e1a\u0e25\u0e14\u0e40\u0e04\u0e23\u0e14\u0e34\u0e15');
                return;
            }
            alert.success(`\u0e1b\u0e23\u0e31\u0e1a\u0e25\u0e14\u0e40\u0e04\u0e23\u0e14\u0e34\u0e15 \u0e3f${parseFloat(deductAmount).toLocaleString()} \u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08`, '\u0e1b\u0e23\u0e31\u0e1a\u0e25\u0e14\u0e40\u0e04\u0e23\u0e14\u0e34\u0e15\u0e41\u0e25\u0e49\u0e27');
            setTimeout(() => router.reload(), 1500);
            setDeductModal(null);
            setDeductAmount('');
            setDeductNote('');
        } catch (error) {
            alert.error('\u0e40\u0e01\u0e34\u0e14\u0e02\u0e49\u0e2d\u0e1c\u0e34\u0e14\u0e1e\u0e25\u0e32\u0e14\u0e43\u0e19\u0e01\u0e32\u0e23\u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21\u0e15\u0e48\u0e2d: ' + (error.message || error));
        }
    };

    const handleToggleBan = async (userId, currentStatus) => {
        alert.confirm(currentStatus ? '\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e23\u0e30\u0e07\u0e31\u0e1a\u0e1c\u0e39\u0e49\u0e43\u0e0a\u0e49\u0e19\u0e35\u0e49?' : '\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23\u0e23\u0e30\u0e07\u0e31\u0e1a\u0e1c\u0e39\u0e49\u0e43\u0e0a\u0e49\u0e19\u0e35\u0e49?', async () => {
            try {
                const response = await fetch(`/admin/users/${userId}/toggle-ban`, {
                    method: 'POST',
                });
                const data = await response.json();
                if (!response.ok || !data.success) {
                    alert.error(data.message || '\u0e40\u0e01\u0e34\u0e14\u0e02\u0e49\u0e2d\u0e1c\u0e34\u0e14\u0e1e\u0e25\u0e32\u0e14');
                    return;
                }
                alert.success(currentStatus ? '\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e01\u0e32\u0e23\u0e23\u0e30\u0e07\u0e31\u0e1a\u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22' : '\u0e23\u0e30\u0e07\u0e31\u0e1a\u0e1c\u0e39\u0e49\u0e43\u0e0a\u0e49\u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22', '\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23\u0e41\u0e25\u0e49\u0e27');
                setTimeout(() => router.reload(), 1500);
            } catch (error) {
                alert.error('\u0e40\u0e01\u0e34\u0e14\u0e02\u0e49\u0e2d\u0e1c\u0e34\u0e14\u0e1e\u0e25\u0e32\u0e14\u0e43\u0e19\u0e01\u0e32\u0e23\u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21\u0e15\u0e48\u0e2d');
            }
        }, currentStatus ? '\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e23\u0e30\u0e07\u0e31\u0e1a' : '\u0e23\u0e30\u0e07\u0e31\u0e1a\u0e1c\u0e39\u0e49\u0e43\u0e0a\u0e49');
    };

    const generateRandomPassword = () => {
        const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
        const pw = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        setNewPassword(pw);
        setShowPassword(true);
    };

    const handleResetPassword = async () => {
        if (!resetModal || !newPassword || newPassword.length < 4) {
            alert.error('กรุณาระบุรหัสผ่านอย่างน้อย 4 ตัวอักษร');
            return;
        }
        try {
            const response = await fetch(`/admin/users/${resetModal.id}/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ password: newPassword }),
            });

            // ถ้าไม่ใช่ 2xx → ลองอ่าน error
            if (!response.ok) {
                let msg = `Server Error: ${response.status}`;
                try { const err = await response.json(); msg = err.message || msg; } catch { }
                alert.error(msg);
                return;
            }

            const data = await response.json();
            if (!data.success) {
                alert.error(data.message || 'เกิดข้อผิดพลาด');
                return;
            }
            setResetModal(null);
            setPasswordResult({ name: resetModal.name, password: data.new_password });
            setNewPassword('');
            setCopied(false);
        } catch (error) {
            alert.error('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + (error.message || error));
        }
    };

    const openResetModal = (user) => {
        setResetModal(user);
        setNewPassword('');
        setShowPassword(false);
    };

    const copyPassword = () => {
        if (passwordResult?.password) {
            navigator.clipboard.writeText(passwordResult.password);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Summary stats
    const totalCredit = filteredUsers.reduce((sum, u) => sum + Number(u.credit || 0), 0);
    const bannedCount = filteredUsers.filter(u => u.is_banned).length;

    // Pagination
    const currentPage = users.current_page || 1;
    const lastPage = users.last_page || 1;
    const total = users.total || filteredUsers.length;
    const from = users.from || 1;
    const to = users.to || filteredUsers.length;

    const goToPage = (page) => {
        router.get(window.location.pathname, { page, search: searchTerm || undefined }, { preserveState: true, preserveScroll: true });
    };

    return (
        <AdminLayout>
            <Head title="จัดการสมาชิก" />

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <UsersIcon className="text-blue-400" size={28} />
                        จัดการสมาชิก
                    </h2>
                    <p className="text-gray-400">{total} สมาชิก</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="bg-gradient-to-br from-blue-500/20 to-[#0d1e36] rounded-2xl p-4 border border-blue-500/30">
                    <div className="flex items-center gap-2 mb-1">
                        <UsersIcon size={18} className="text-blue-400" />
                        <span className="text-gray-400 text-sm">สมาชิกทั้งหมด</span>
                    </div>
                    <p className="text-blue-400 text-2xl font-bold">{total}</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-500/20 to-[#0d1e36] rounded-2xl p-4 border border-yellow-500/30">
                    <div className="flex items-center gap-2 mb-1">
                        <Wallet size={18} className="text-yellow-400" />
                        <span className="text-gray-400 text-sm">เครดิตรวม</span>
                    </div>
                    <p className="text-yellow-400 text-2xl font-bold">฿{Math.floor(Number(totalCredit)).toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-red-500/20 to-[#0d1e36] rounded-2xl p-4 border border-red-500/30">
                    <div className="flex items-center gap-2 mb-1">
                        <Ban size={18} className="text-red-400" />
                        <span className="text-gray-400 text-sm">ถูกระงับ</span>
                    </div>
                    <p className="text-red-400 text-2xl font-bold">{bannedCount}</p>
                </div>
            </div>

            {/* Search */}
            <div className="mb-4">
                <div className="relative max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="ค้นหาชื่อ, เบอร์โทร, username..."
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                        autoComplete="off"
                        className="w-full pl-11 pr-4 py-3 bg-[#0d1e36] border border-[#1a3a5c] rounded-xl text-white focus:border-yellow-500 outline-none"
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-[#0d1e36]/80 backdrop-blur rounded-2xl border border-[#1a3a5c] overflow-x-auto">
                <table className="w-full min-w-[700px]">
                    <thead>
                        <tr className="bg-gradient-to-r from-yellow-500/10 to-transparent border-b border-[#1a3a5c]">
                            <th className="px-4 py-3 text-left text-yellow-400 font-bold text-sm">ID</th>
                            <th className="px-4 py-3 text-left text-yellow-400 font-bold text-sm">ชื่อ</th>
                            <th className="px-4 py-3 text-left text-yellow-400 font-bold text-sm">Username</th>
                            <th className="px-4 py-3 text-left text-yellow-400 font-bold text-sm">เบอร์โทร</th>
                            <th className="px-4 py-3 text-right text-yellow-400 font-bold text-sm">เครดิต</th>
                            <th className="px-4 py-3 text-right text-purple-400 font-bold text-sm">โบนัส</th>
                            <th className="px-4 py-3 text-center text-yellow-400 font-bold text-sm">สถานะ</th>
                            <th className="px-4 py-3 text-center text-yellow-400 font-bold text-sm">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1a3a5c]">
                        {filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="px-4 py-12 text-center text-gray-500">
                                    <UsersIcon size={40} className="mx-auto mb-2 opacity-50" />
                                    ไม่พบสมาชิก
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-[#1a3a5c]/50 transition-colors">
                                    <td className="px-4 py-4 text-gray-400">{user.id}</td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                                {user.name?.charAt(0)?.toUpperCase() || '?'}
                                            </div>
                                            <span className="text-white font-medium">{user.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-gray-400 font-mono">{user.username}</td>
                                    <td className="px-4 py-4 text-gray-400">{user.phone}</td>
                                    <td className="px-4 py-4 text-right text-yellow-400 font-mono font-bold">
                                        ฿{Math.floor(Number(user.credit || 0)).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-4 text-right font-mono font-bold text-purple-400">
                                        ฿{Math.floor(Number(user.bonus_credit || 0)).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        {user.is_banned ? (
                                            <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold">ระงับ</span>
                                        ) : (
                                            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold">ปกติ</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => setCreditModal(user)}
                                                className="p-2 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors"
                                                title="เพิ่มเครดิต"
                                            >
                                                <DollarSign size={18} />
                                            </button>
                                            <button
                                                onClick={() => { setBonusModal(user); setBonusAmount(''); setBonusNote(''); }}
                                                className="p-2 text-purple-400 hover:bg-purple-500/20 rounded-lg transition-colors"
                                                title="เพิ่มโบนัสเครดิต"
                                            >
                                                <Gift size={18} />
                                            </button>
                                            <button
                                                onClick={() => setDeductModal(user)}
                                                className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                                title="ปรับลดเครดิต"
                                            >
                                                <MinusCircle size={18} />
                                            </button>
                                            <button
                                                onClick={() => openResetModal(user)}
                                                className="p-2 text-orange-400 hover:bg-orange-500/20 rounded-lg transition-colors"
                                                title="รีเซ็ตรหัสผ่าน"
                                            >
                                                <KeyRound size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleToggleBan(user.id, user.is_banned)}
                                                className={`p-2 rounded-lg transition-colors ${user.is_banned ? 'text-emerald-400 hover:bg-emerald-500/20' : 'text-red-400 hover:bg-red-500/20'}`}
                                                title={user.is_banned ? 'ยกเลิกระงับ' : 'ระงับ'}
                                            >
                                                {user.is_banned ? <Check size={18} /> : <Ban size={18} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {lastPage > 1 && (
                <div className="flex items-center justify-between mt-4 px-2">
                    <p className="text-gray-400 text-sm">
                        แสดง {from}-{to} จาก {total} สมาชิก
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage <= 1}
                            className="flex items-center gap-1 px-4 py-2 bg-[#0d1e36] border border-[#1a3a5c] rounded-xl text-white text-sm hover:border-yellow-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={16} />
                            ก่อนหน้า
                        </button>
                        <span className="px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-xl text-yellow-400 text-sm font-bold">
                            {currentPage} / {lastPage}
                        </span>
                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage >= lastPage}
                            className="flex items-center gap-1 px-4 py-2 bg-[#0d1e36] border border-[#1a3a5c] rounded-xl text-white text-sm hover:border-yellow-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            ถัดไป
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Credit Modal */}
            {creditModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gradient-to-br from-[#0d1e36] to-[#0a1628] rounded-3xl w-full max-w-sm p-6 border border-emerald-500/30 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <DollarSign className="text-emerald-400" size={24} />
                                เพิ่มเครดิต
                            </h3>
                            <button onClick={() => { setCreditModal(null); setCreditAmount(''); }} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="bg-[#0a1628] rounded-xl p-4 mb-4">
                            <p className="text-gray-400 text-sm">สมาชิก</p>
                            <p className="text-white font-bold">{creditModal.name}</p>
                            <p className="text-yellow-400 text-sm">เครดิตปัจจุบัน: ฿{Math.floor(Number(creditModal.credit || 0)).toLocaleString()}</p>
                        </div>
                        <div className="mb-4">
                            <label className="text-gray-400 text-sm block mb-2">จำนวนเงิน</label>
                            <input
                                type="number"
                                value={creditAmount}
                                onChange={(e) => setCreditAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full px-4 py-3 bg-[#0a1628] border-2 border-[#1a3a5c] rounded-xl text-white text-center text-xl font-bold focus:border-emerald-500 outline-none"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setCreditModal(null); setCreditAmount(''); }}
                                className="flex-1 py-3 bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={() => handleAddCredit(creditModal.id)}
                                className="flex-1 py-3 bg-gradient-to-r from-emerald-400 to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30"
                            >
                                เพิ่มเครดิต
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Deduct Credit Modal */}
            {deductModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gradient-to-br from-[#0d1e36] to-[#0a1628] rounded-3xl w-full max-w-sm p-6 border border-red-500/30 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <MinusCircle className="text-red-400" size={24} />
                                ปรับลดเครดิต
                            </h3>
                            <button onClick={() => { setDeductModal(null); setDeductAmount(''); setDeductNote(''); }} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="bg-[#0a1628] rounded-xl p-4 mb-4">
                            <p className="text-gray-400 text-sm">สมาชิก</p>
                            <p className="text-white font-bold">{deductModal.name}</p>
                            <p className="text-yellow-400 text-sm">เครดิตปัจจุบัน: ฿{Math.floor(Number(deductModal.credit || 0)).toLocaleString()}</p>
                        </div>
                        <div className="mb-4">
                            <label className="text-gray-400 text-sm block mb-2">จำนวนเงินที่ต้องการลด</label>
                            <input
                                type="number"
                                value={deductAmount}
                                onChange={(e) => setDeductAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full px-4 py-3 bg-[#0a1628] border-2 border-[#1a3a5c] rounded-xl text-white text-center text-xl font-bold focus:border-red-500 outline-none"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="text-red-400 text-sm block mb-2">หมายเหตุ (จำเป็น) <span className="text-gray-500">— จะแสดงให้ User เห็นในประวัติ</span></label>
                            <textarea
                                value={deductNote}
                                onChange={(e) => setDeductNote(e.target.value)}
                                placeholder="เช่น แก้ไขยอดเครดิตผิดพลาด, ปรับลดตามเงื่อนไข..."
                                rows={3}
                                className="w-full px-4 py-3 bg-[#0a1628] border-2 border-[#1a3a5c] rounded-xl text-white focus:border-red-500 outline-none resize-none text-sm"
                            />
                        </div>
                        {deductAmount && parseFloat(deductAmount) > Number(deductModal.credit || 0) && (
                            <p className="text-red-400 text-xs mb-3">⚠️ จำนวนเกินเครดิตคงเหลือ</p>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setDeductModal(null); setDeductAmount(''); setDeductNote(''); }}
                                className="flex-1 py-3 bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={() => handleDeductCredit(deductModal.id)}
                                disabled={!deductAmount || parseFloat(deductAmount) <= 0 || !deductNote.trim() || parseFloat(deductAmount) > Number(deductModal.credit || 0)}
                                className="flex-1 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                ปรับลดเครดิต
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Reset Password Input Modal */}
            {resetModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gradient-to-br from-[#0d1e36] to-[#0a1628] rounded-3xl w-full max-w-sm p-6 border border-orange-500/30 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <KeyRound className="text-orange-400" size={24} />
                                รีเซ็ตรหัสผ่าน
                            </h3>
                            <button onClick={() => { setResetModal(null); setNewPassword(''); }} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="bg-[#0a1628] rounded-xl p-4 mb-4">
                            <p className="text-gray-400 text-sm">สมาชิก</p>
                            <p className="text-white font-bold">{resetModal.name}</p>
                            <p className="text-gray-500 text-sm font-mono">{resetModal.username}</p>
                        </div>
                        <div className="mb-4">
                            <label className="text-gray-400 text-sm block mb-2">รหัสผ่านใหม่</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="กรอกรหัสผ่านใหม่..."
                                        autoComplete="new-password"
                                        className="w-full px-4 py-3 pr-10 bg-[#0a1628] border-2 border-[#1a3a5c] rounded-xl text-white font-mono text-lg focus:border-orange-500 outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <button
                                    onClick={generateRandomPassword}
                                    className="px-4 py-3 bg-orange-500/20 border-2 border-orange-500/30 rounded-xl text-orange-400 hover:bg-orange-500/30 transition-colors"
                                    title="สุ่มรหัสผ่าน"
                                >
                                    <Shuffle size={20} />
                                </button>
                            </div>
                            {newPassword && newPassword.length < 4 && (
                                <p className="text-red-400 text-xs mt-1">ต้องมีอย่างน้อย 4 ตัวอักษร</p>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setResetModal(null); setNewPassword(''); }}
                                className="flex-1 py-3 bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleResetPassword}
                                disabled={!newPassword || newPassword.length < 4}
                                className="flex-1 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                บันทึก
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Password Result Modal */}
            {passwordResult && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gradient-to-br from-[#0d1e36] to-[#0a1628] rounded-3xl w-full max-w-sm p-6 border border-orange-500/30 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <KeyRound className="text-orange-400" size={24} />
                                รหัสผ่านใหม่
                            </h3>
                            <button onClick={() => setPasswordResult(null)} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="bg-[#0a1628] rounded-xl p-4 mb-4">
                            <p className="text-gray-400 text-sm">สมาชิก</p>
                            <p className="text-white font-bold">{passwordResult.name}</p>
                        </div>
                        <div className="bg-[#0a1628] rounded-xl p-4 mb-4">
                            <p className="text-gray-400 text-sm mb-2">รหัสผ่านใหม่</p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 text-center text-2xl font-mono font-bold text-orange-400 tracking-widest">
                                    {passwordResult.password}
                                </code>
                                <button
                                    onClick={copyPassword}
                                    className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                                    title="คัดลอก"
                                >
                                    {copied ? <CheckCircle size={20} className="text-emerald-400" /> : <Copy size={20} />}
                                </button>
                            </div>
                        </div>
                        <p className="text-yellow-400/70 text-xs text-center mb-4">⚠️ โปรดแจ้งรหัสผ่านนี้ให้สมาชิก</p>
                        <button
                            onClick={() => setPasswordResult(null)}
                            className="w-full py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30"
                        >
                            ปิด
                        </button>
                    </div>
                </div>
            )}
            {AlertComponent}

            {/* Bonus Credit Modal */}
            {bonusModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gradient-to-br from-[#0d1e36] to-[#0a1628] rounded-3xl w-full max-w-sm p-6 border border-purple-500/30 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Gift className="text-purple-400" size={24} />
                                เพิ่มโบนัสเครดิต
                            </h3>
                            <button onClick={() => setBonusModal(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="bg-[#0a1628] rounded-xl p-4 mb-4">
                            <p className="text-gray-400 text-sm">สมาชิก</p>
                            <p className="text-white font-bold">{bonusModal.name}</p>
                            <p className="text-purple-300 text-sm mt-1">โบนัสปัจจุบัน: ฿{Math.floor(Number(bonusModal.bonus_credit || 0)).toLocaleString()}</p>
                        </div>
                        <div className="mb-4">
                            <label className="text-gray-400 text-sm block mb-2">จำนวนโบนัส (บาท)</label>
                            <input
                                type="number"
                                min="1"
                                value={bonusAmount}
                                onChange={(e) => setBonusAmount(e.target.value)}
                                className="w-full bg-[#0a1628] border border-purple-500/50 rounded-xl px-4 py-3 text-white text-xl font-bold text-center focus:outline-none focus:border-purple-400"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="text-gray-400 text-sm block mb-2">หมายเหตุ (ไม่บังคับ)</label>
                            <input
                                type="text"
                                value={bonusNote}
                                onChange={(e) => setBonusNote(e.target.value)}
                                className="w-full bg-[#0a1628] border border-[#1a3a5c] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-400"
                                placeholder="โปรโมชั่น..."
                            />
                        </div>
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3 mb-4 text-purple-300 text-xs">
                            ⚡ โบนัสใช้แทงได้ ถอนไม่ได้ | ถ้าถูกรางวัล เงินจะเข้า credit จริง
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setBonusModal(null)} className="flex-1 py-3 bg-[#0f2340] border border-[#1a3a5c] text-gray-300 font-bold rounded-xl hover:bg-[#162d52] transition-all">ยกเลิก</button>
                            <button
                                onClick={() => handleAddBonusCredit(bonusModal.id)}
                                disabled={!bonusAmount || parseFloat(bonusAmount) <= 0}
                                className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 disabled:opacity-40 transition-all"
                            >
                                เพิ่มโบนัส
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
