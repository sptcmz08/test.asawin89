import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { User, Lock, ArrowRight, Sparkles } from 'lucide-react';

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        username: '',
        password: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/login');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#020b16] via-[#0d1e36] to-[#020b16] flex items-center justify-center p-4 relative overflow-hidden">
            <Head title="เข้าสู่ระบบ" />

            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-yellow-600/10 rounded-full blur-3xl animate-pulse delay-1000" />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />
            </div>

            <div className="w-full max-w-md relative">
                {/* Logo Section */}
                <div className="text-center mb-8">
                    <img src="/images/logo.png" alt="LOTTO.com" className="h-20 mx-auto mb-4 object-contain" />
                    <p className="text-gray-400 text-sm mt-1">เว็บหวยออนไลน์ จ่ายจริง จ่ายเต็ม</p>
                </div>

                {/* Login Card */}
                <div className="bg-[#0d1e36]/80 backdrop-blur-xl rounded-3xl border border-yellow-500/20 shadow-2xl shadow-black/50 p-8 relative overflow-hidden">
                    {/* Card glow effect */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-60" />
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl" />

                    <h2 className="text-2xl font-bold text-white text-center mb-6">
                        เข้าสู่ระบบ
                    </h2>

                    <form onSubmit={submit} className="space-y-5">
                        {/* Username Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                <User size={14} className="inline mr-2" />
                                ชื่อผู้ใช้งาน
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    className={`w-full bg-[#0a1628] border-2 rounded-xl px-4 py-3.5 text-white focus:ring-2 outline-none transition-all placeholder-gray-500 ${errors.username
                                        ? 'border-red-500 focus:ring-red-500/30'
                                        : 'border-[#1a3a5c] focus:ring-yellow-500/30 focus:border-yellow-500'
                                        }`}
                                    placeholder="กรอกชื่อผู้ใช้งาน"
                                    value={data.username}
                                    onChange={e => setData('username', e.target.value)}
                                />
                            </div>
                            {errors.username && (
                                <div className="text-red-400 text-xs mt-2 flex items-center gap-1">
                                    <span>⚠️</span> {errors.username}
                                </div>
                            )}
                        </div>

                        {/* Password Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                <Lock size={14} className="inline mr-2" />
                                รหัสผ่าน
                            </label>
                            <div className="relative">
                                <input
                                    type="password"
                                    className={`w-full bg-[#0a1628] border-2 rounded-xl px-4 py-3.5 text-white focus:ring-2 outline-none transition-all placeholder-gray-500 ${errors.password
                                        ? 'border-red-500 focus:ring-red-500/30'
                                        : 'border-[#1a3a5c] focus:ring-yellow-500/30 focus:border-yellow-500'
                                        }`}
                                    placeholder="กรอกรหัสผ่าน"
                                    value={data.password}
                                    onChange={e => setData('password', e.target.value)}
                                />
                            </div>
                            {errors.password && (
                                <div className="text-red-400 text-xs mt-2 flex items-center gap-1">
                                    <span>⚠️</span> {errors.password}
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            disabled={processing}
                            className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 hover:from-yellow-300 hover:via-yellow-400 hover:to-yellow-500 text-black font-bold py-4 rounded-xl shadow-lg shadow-yellow-500/30 transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 group"
                        >
                            {processing ? (
                                <span className="animate-spin">⏳</span>
                            ) : (
                                <>
                                    เข้าสู่ระบบ
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Links */}
                    <div className="mt-6 pt-6 border-t border-[#1a3a5c]">
                        <div className="flex justify-between items-center text-sm">
                            <Link href="/" className="text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                                ← กลับหน้าหลัก
                            </Link>
                            <a href="#" className="text-yellow-400/80 hover:text-yellow-300 transition-colors">
                                ลืมรหัสผ่าน?
                            </a>
                        </div>
                    </div>
                </div>

                {/* Register Link */}
                <div className="text-center mt-6">
                    <p className="text-gray-400 text-sm">
                        ยังไม่มีบัญชี?{' '}
                        <Link href="/register" className="text-yellow-400 hover:text-yellow-300 font-semibold transition-colors">
                            สมัครสมาชิก
                        </Link>
                    </p>
                </div>

                {/* Trust badges */}
                <div className="flex justify-center gap-4 mt-6 text-gray-500 text-xs">
                    <span className="flex items-center gap-1">🔒 ปลอดภัย 100%</span>
                    <span className="flex items-center gap-1">💰 จ่ายจริง</span>
                    <span className="flex items-center gap-1">⚡ ถอนไว</span>
                </div>
            </div>
        </div>
    );
}
