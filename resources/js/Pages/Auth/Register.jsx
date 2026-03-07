import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { User, Lock, Phone, UserPlus, ArrowRight, Sparkles, CheckCircle, Building2, CreditCard, BadgeCheck } from 'lucide-react';

const THAI_BANKS = [
    { code: 'KBANK', name: 'ธนาคารกสิกรไทย', color: '#138f2d' },
    { code: 'KTB', name: 'ธนาคารกรุงไทย', color: '#1ba5e1' },
    { code: 'BBL', name: 'ธนาคารกรุงเทพ', color: '#1e22aa' },
    { code: 'SCB', name: 'ธนาคารไทยพาณิชย์', color: '#4e2e7f' },
    { code: 'TTB', name: 'ธนาคารทหารไทยธนชาต', color: '#0050f0' },
    { code: 'GSB', name: 'ธนาคารออมสิน', color: '#eb198d' },
    { code: 'BAY', name: 'ธนาคารกรุงศรีอยุธยา', color: '#fec43b' },
    { code: 'BAAC', name: 'ธ.ก.ส.', color: '#4b9b1d' },
    { code: 'PROMPTPAY', name: 'พร้อมเพย์', color: '#003b71' },
];

export default function Register({ referral_code }) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        username: '',
        phone: '',
        password: '',
        password_confirmation: '',
        bank_name: '',
        bank_account_number: '',
        bank_account_name: '',
        referral_code: referral_code || '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/register');
    };

    const inputClass = (field) =>
        `w-full bg-[#0a1628] border-2 rounded-xl px-4 py-3 text-white focus:ring-2 outline-none transition-all placeholder-gray-500 ${errors[field]
            ? 'border-red-500 focus:ring-red-500/30'
            : 'border-[#1a3a5c] focus:ring-emerald-500/30 focus:border-emerald-500'
        }`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#020b16] via-[#0d1e36] to-[#020b16] flex items-center justify-center p-4 relative overflow-hidden">
            <Head title="สมัครสมาชิก" />

            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl animate-pulse delay-1000" />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
            </div>

            <div className="w-full max-w-md relative">
                {/* Logo Section */}
                <div className="text-center mb-6">
                    <img src="/images/logo.png" alt="LOTTO.com" className="h-16 mx-auto mb-3 object-contain" />
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                        สมัครสมาชิก
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">สมัครง่าย รับโบนัสทันที</p>
                </div>

                {/* Register Card */}
                <div className="bg-[#0d1e36]/80 backdrop-blur-xl rounded-3xl border border-emerald-500/20 shadow-2xl shadow-black/50 p-6 relative overflow-hidden">
                    {/* Card glow effect */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-60" />
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />

                    {/* Referral Banner */}
                    {referral_code && (
                        <div className="relative mb-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-xl">🎁</span>
                            </div>
                            <div>
                                <div className="text-yellow-400 font-bold text-sm">สมัครผ่านลิงก์แนะนำ</div>
                                <div className="text-gray-400 text-xs">คุณได้รับการเชิญจากเพื่อน</div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={submit} className="space-y-4 relative">
                        {/* Name Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                <User size={12} className="inline mr-1.5" />
                                ชื่อ - นามสกุล
                            </label>
                            <input
                                type="text"
                                className={inputClass('name')}
                                placeholder="กรอกชื่อ-นามสกุลจริง"
                                value={data.name}
                                onChange={e => setData('name', e.target.value)}
                            />
                            {errors.name && <div className="text-red-400 text-xs mt-1">⚠️ {errors.name}</div>}
                        </div>

                        {/* Phone Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                <Phone size={12} className="inline mr-1.5" />
                                เบอร์โทรศัพท์
                            </label>
                            <input
                                type="tel"
                                className={inputClass('phone')}
                                placeholder="0812345678"
                                value={data.phone}
                                onChange={e => setData('phone', e.target.value)}
                            />
                            {errors.phone && <div className="text-red-400 text-xs mt-1">⚠️ {errors.phone}</div>}
                        </div>

                        {/* Username Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                <User size={12} className="inline mr-1.5" />
                                ชื่อผู้ใช้งาน
                            </label>
                            <input
                                type="text"
                                className={inputClass('username')}
                                placeholder="ตั้งชื่อผู้ใช้งาน (ภาษาอังกฤษ)"
                                value={data.username}
                                onChange={e => setData('username', e.target.value)}
                            />
                            {errors.username && <div className="text-red-400 text-xs mt-1">⚠️ {errors.username}</div>}
                        </div>

                        {/* Password Fields */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    <Lock size={12} className="inline mr-1.5" />
                                    รหัสผ่าน
                                </label>
                                <input
                                    type="password"
                                    className={`${inputClass('password')} text-sm`}
                                    placeholder="รหัสผ่าน"
                                    value={data.password}
                                    onChange={e => setData('password', e.target.value)}
                                />
                                {errors.password && <div className="text-red-400 text-xs mt-1">⚠️ {errors.password}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    <Lock size={12} className="inline mr-1.5" />
                                    ยืนยัน
                                </label>
                                <input
                                    type="password"
                                    className={`${inputClass('password_confirmation')} text-sm`}
                                    placeholder="ยืนยันรหัสผ่าน"
                                    value={data.password_confirmation}
                                    onChange={e => setData('password_confirmation', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Bank Account Section */}
                        <div className="border-t border-[#1a3a5c] pt-4 mt-2">
                            <div className="flex items-center gap-2 mb-3">
                                <Building2 size={16} className="text-yellow-400" />
                                <span className="text-sm font-medium text-yellow-400">ข้อมูลบัญชีธนาคาร (สำหรับถอนเงิน)</span>
                            </div>
                            <p className="text-gray-500 text-xs mb-3">⚠️ ข้อมูลบัญชีจะไม่สามารถเปลี่ยนแปลงได้หลังสมัคร</p>

                            {/* Bank Dropdown */}
                            <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    <Building2 size={12} className="inline mr-1.5" />
                                    ธนาคาร
                                </label>
                                <select
                                    className={inputClass('bank_name')}
                                    value={data.bank_name}
                                    onChange={e => setData('bank_name', e.target.value)}
                                >
                                    <option value="">เลือกธนาคาร</option>
                                    {THAI_BANKS.map(bank => (
                                        <option key={bank.code} value={bank.code}>
                                            {bank.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.bank_name && <div className="text-red-400 text-xs mt-1">⚠️ {errors.bank_name}</div>}
                            </div>

                            {/* Account Number */}
                            <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    <CreditCard size={12} className="inline mr-1.5" />
                                    เลขบัญชี
                                </label>
                                <input
                                    type="text"
                                    className={`${inputClass('bank_account_number')} font-mono tracking-wider`}
                                    placeholder="xxx-x-xxxxx-x"
                                    value={data.bank_account_number}
                                    onChange={e => setData('bank_account_number', e.target.value.replace(/[^0-9-]/g, ''))}
                                    maxLength={20}
                                />
                                {errors.bank_account_number && <div className="text-red-400 text-xs mt-1">⚠️ {errors.bank_account_number}</div>}
                            </div>

                            {/* Account Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    <BadgeCheck size={12} className="inline mr-1.5" />
                                    ชื่อบัญชี
                                </label>
                                <input
                                    type="text"
                                    className={inputClass('bank_account_name')}
                                    placeholder="ชื่อ-นามสกุล เจ้าของบัญชี"
                                    value={data.bank_account_name}
                                    onChange={e => setData('bank_account_name', e.target.value)}
                                />
                                {errors.bank_account_name && <div className="text-red-400 text-xs mt-1">⚠️ {errors.bank_account_name}</div>}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            disabled={processing}
                            className="w-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 hover:from-emerald-300 hover:via-emerald-400 hover:to-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/30 transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 group mt-2"
                        >
                            {processing ? (
                                <span className="animate-spin">⏳</span>
                            ) : (
                                <>
                                    สมัครสมาชิก
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Login Link */}
                    <div className="mt-5 pt-4 border-t border-[#1a3a5c] text-center">
                        <p className="text-gray-400 text-sm">
                            มีบัญชีอยู่แล้ว?{' '}
                            <Link href="/login" className="text-yellow-400 hover:text-yellow-300 font-semibold transition-colors">
                                เข้าสู่ระบบ
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Benefits */}
                <div className="mt-6 space-y-2">
                    <div className="flex items-center justify-center gap-2 text-gray-400 text-xs">
                        <CheckCircle size={14} className="text-emerald-400" />
                        <span>สมัครฟรี ไม่มีค่าธรรมเนียม</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-gray-400 text-xs">
                        <CheckCircle size={14} className="text-emerald-400" />
                        <span>ฝาก-ถอน ไม่มีขั้นต่ำ</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-gray-400 text-xs">
                        <CheckCircle size={14} className="text-emerald-400" />
                        <span>จ่ายจริง จ่ายเต็ม ไม่หักค่าธรรมเนียม</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
