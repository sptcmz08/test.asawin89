import React, { useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { ChevronLeft, User, Phone, CreditCard, Plus, Trash2, Lock, LogOut, Shield, Wallet, Calendar, Building2, Check, X } from 'lucide-react';
import { useAlert } from '@/Components/AlertModal';

export default function Profile({ bankAccounts = [] }) {
    const { auth } = usePage().props;
    const user = auth?.user || {};
    const [showBankModal, setShowBankModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [bankForm, setBankForm] = useState({
        bank_name: '',
        account_number: '',
        account_name: user.name || '',
    });
    const [passwordForm, setPasswordForm] = useState({
        current_password: '',
        new_password: '',
        confirm_password: '',
    });
    const { alert, AlertComponent } = useAlert();



    const handleAddBank = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/profile/bank-accounts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(bankForm),
            });
            const data = await res.json();
            if (res.ok && (data.success || data.id)) {
                router.reload();
                setShowBankModal(false);
                setBankForm({ bank_name: '', account_number: '', account_name: user.name || '' });
            } else {
                alert.error(data.error || data.message || 'เกิดข้อผิดพลาดในการเพิ่มบัญชี');
            }
        } catch (error) {
            console.error('Add bank error:', error);
            alert.error('เกิดข้อผิดพลาดในการเพิ่มบัญชี กรุณาลองใหม่');
        }
    };

    const handleDeleteBank = (id) => {
        alert.confirm('ต้องการลบบัญชีนี้หรือไม่?', async () => {
            try {
                await fetch(`/api/profile/bank-accounts/${id}`, {
                    method: 'DELETE',
                    headers: { 'Accept': 'application/json' },
                });
                router.reload();
            } catch (error) {
                console.error('Delete bank error:', error);
                alert.error('เกิดข้อผิดพลาดในการลบบัญชี');
            }
        }, 'ลบบัญชีธนาคาร');
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passwordForm.new_password !== passwordForm.confirm_password) {
            alert.warning('รหัสผ่านใหม่ไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง', 'รหัสผ่านไม่ตรงกัน');
            return;
        }
        try {
            const res = await fetch('/api/profile/password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(passwordForm),
            });
            const data = await res.json();
            if (data.success) {
                alert.success('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว', 'สำเร็จ!');
                setShowPasswordModal(false);
                setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
            } else {
                alert.error(data.error || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
            }
        } catch (error) {
            alert.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        }
    };

    const banks = [
        { code: 'kbank', name: 'ธนาคารกสิกรไทย' },
        { code: 'scb', name: 'ธนาคารไทยพาณิชย์' },
        { code: 'ktb', name: 'ธนาคารกรุงไทย' },
        { code: 'bbl', name: 'ธนาคารกรุงเทพ' },
        { code: 'bay', name: 'ธนาคารกรุงศรี' },
        { code: 'tmb', name: 'ธนาคารทหารไทยธนชาต' },
        { code: 'gsb', name: 'ธนาคารออมสิน' },
        { code: 'baac', name: 'ธ.ก.ส.' },
    ];

    return (
        <MainLayout>
            <Head title="โปรไฟล์" />

            {/* Decorative Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 -left-32 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative max-w-lg mx-auto pb-8">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={() => router.visit('/')}
                        className="p-2 bg-[#0d1e36] rounded-xl border border-[#1a3a5c] hover:border-yellow-500/50 transition-colors"
                    >
                        <ChevronLeft size={20} className="text-gray-400" />
                    </button>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <User size={24} className="text-yellow-400" />
                        โปรไฟล์
                    </h1>
                </div>

                {/* User Profile Card */}
                <div className="bg-gradient-to-br from-yellow-500/20 via-[#0d1e36] to-[#0d1e36] rounded-3xl p-6 mb-5 border border-yellow-500/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl" />
                    <div className="relative">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-500/30">
                                <span className="text-3xl font-bold text-black">
                                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                </span>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-white mb-1">{user.name || 'ไม่มีชื่อ'}</h2>
                                <div className="flex items-center gap-2 text-gray-400">
                                    <Phone size={14} />
                                    <span>{user.phone || user.username || '-'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-emerald-400 text-sm mt-1">
                                    <Shield size={14} />
                                    <span>บัญชียืนยันแล้ว</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#0a1628]/80 rounded-2xl p-4 text-center">
                                <Wallet size={20} className="mx-auto mb-2 text-yellow-400" />
                                <p className="text-gray-400 text-xs mb-1">เครดิตคงเหลือ</p>
                                <p className="text-yellow-400 text-xl font-bold">
                                    ฿{(user.credit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="bg-[#0a1628]/80 rounded-2xl p-4 text-center">
                                <Calendar size={20} className="mx-auto mb-2 text-blue-400" />
                                <p className="text-gray-400 text-xs mb-1">สมาชิกตั้งแต่</p>
                                <p className="text-white font-bold">
                                    {user.created_at ? new Date(user.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bank Accounts */}
                <div className="bg-[#0d1e36]/80 backdrop-blur rounded-2xl p-5 mb-5 border border-[#1a3a5c]">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-yellow-500/20 rounded-lg">
                                <Building2 className="text-yellow-400" size={20} />
                            </div>
                            <h3 className="text-white font-bold">บัญชีธนาคาร</h3>
                        </div>
                        <button
                            onClick={() => setShowBankModal(true)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm font-medium hover:bg-yellow-500/30 transition-colors"
                        >
                            <Plus size={16} /> เพิ่ม
                        </button>
                    </div>

                    {bankAccounts.length === 0 ? (
                        <div className="text-center py-8 bg-[#0a1628] rounded-xl">
                            <CreditCard size={40} className="mx-auto mb-3 text-gray-600" />
                            <p className="text-gray-400 mb-3">ยังไม่มีบัญชีธนาคาร</p>
                            <button
                                onClick={() => setShowBankModal(true)}
                                className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg font-medium hover:bg-yellow-500/30 transition-colors"
                            >
                                + เพิ่มบัญชี
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {bankAccounts.map((account) => (
                                <div key={account.id} className="flex items-center justify-between bg-[#0a1628] rounded-xl p-4 border border-[#1a3a5c]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow">
                                            <CreditCard size={24} className="text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">{account.bank_name}</p>
                                            <p className="text-gray-400 text-sm font-mono">{account.account_number}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteBank(account.id)}
                                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Settings */}
                <div className="bg-[#0d1e36]/80 backdrop-blur rounded-2xl border border-[#1a3a5c] overflow-hidden">
                    <button
                        onClick={() => setShowPasswordModal(true)}
                        className="w-full flex items-center gap-4 p-4 hover:bg-[#1a3a5c]/50 transition-colors border-b border-[#1a3a5c]"
                    >
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Lock className="text-blue-400" size={20} />
                        </div>
                        <span className="text-white font-medium">เปลี่ยนรหัสผ่าน</span>
                        <ChevronLeft size={20} className="text-gray-500 ml-auto rotate-180" />
                    </button>
                    <button
                        onClick={() => router.post('/logout')}
                        className="w-full flex items-center gap-4 p-4 hover:bg-red-500/10 transition-colors"
                    >
                        <div className="p-2 bg-red-500/20 rounded-lg">
                            <LogOut className="text-red-400" size={20} />
                        </div>
                        <span className="text-red-400 font-medium">ออกจากระบบ</span>
                    </button>
                </div>
            </div>

            {/* Add Bank Modal */}
            {showBankModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gradient-to-br from-[#0d1e36] to-[#0a1628] rounded-3xl w-full max-w-md p-6 border border-yellow-500/20 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Building2 className="text-yellow-400" size={24} />
                                เพิ่มบัญชีธนาคาร
                            </h3>
                            <button onClick={() => setShowBankModal(false)} className="p-2 text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddBank} className="space-y-4">
                            <div>
                                <label className="text-gray-300 text-sm font-medium block mb-2">ธนาคาร</label>
                                <select
                                    value={bankForm.bank_name}
                                    onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#0a1628] border-2 border-[#1a3a5c] rounded-xl text-white focus:border-yellow-500 outline-none"
                                    required
                                >
                                    <option value="">เลือกธนาคาร</option>
                                    {banks.map((b) => (
                                        <option key={b.code} value={b.name}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-gray-300 text-sm font-medium block mb-2">เลขบัญชี</label>
                                <input
                                    type="text"
                                    value={bankForm.account_number}
                                    onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })}
                                    placeholder="xxx-x-xxxxx-x"
                                    className="w-full px-4 py-3 bg-[#0a1628] border-2 border-[#1a3a5c] rounded-xl text-white focus:border-yellow-500 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-gray-300 text-sm font-medium block mb-2">ชื่อบัญชี</label>
                                <input
                                    type="text"
                                    value={bankForm.account_name}
                                    onChange={(e) => setBankForm({ ...bankForm, account_name: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#0a1628] border-2 border-[#1a3a5c] rounded-xl text-white focus:border-yellow-500 outline-none"
                                    required
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowBankModal(false)}
                                    className="flex-1 py-3 bg-[#1a3a5c] text-white rounded-xl font-medium hover:bg-[#2a4a6c] transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                <button type="submit" className="flex-1 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold rounded-xl shadow-lg shadow-yellow-500/30">
                                    บันทึก
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Change Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gradient-to-br from-[#0d1e36] to-[#0a1628] rounded-3xl w-full max-w-md p-6 border border-blue-500/20 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Lock className="text-blue-400" size={24} />
                                เปลี่ยนรหัสผ่าน
                            </h3>
                            <button onClick={() => setShowPasswordModal(false)} className="p-2 text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="text-gray-300 text-sm font-medium block mb-2">รหัสผ่านปัจจุบัน</label>
                                <input
                                    type="password"
                                    value={passwordForm.current_password}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#0a1628] border-2 border-[#1a3a5c] rounded-xl text-white focus:border-blue-500 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-gray-300 text-sm font-medium block mb-2">รหัสผ่านใหม่</label>
                                <input
                                    type="password"
                                    value={passwordForm.new_password}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#0a1628] border-2 border-[#1a3a5c] rounded-xl text-white focus:border-blue-500 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-gray-300 text-sm font-medium block mb-2">ยืนยันรหัสผ่านใหม่</label>
                                <input
                                    type="password"
                                    value={passwordForm.confirm_password}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#0a1628] border-2 border-[#1a3a5c] rounded-xl text-white focus:border-blue-500 outline-none"
                                    required
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowPasswordModal(false)}
                                    className="flex-1 py-3 bg-[#1a3a5c] text-white rounded-xl font-medium hover:bg-[#2a4a6c] transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                <button type="submit" className="flex-1 py-3 bg-gradient-to-r from-blue-400 to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30">
                                    เปลี่ยนรหัสผ่าน
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Game-Style Alert Modal */}
            {AlertComponent}
        </MainLayout>
    );
}
