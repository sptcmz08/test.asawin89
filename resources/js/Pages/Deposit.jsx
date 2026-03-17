import React, { useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { ChevronLeft, Wallet, AlertCircle, ArrowDownCircle, Loader2, Zap, Sparkles } from 'lucide-react';
import { useAlert } from '@/Components/AlertModal';

// Quick amount buttons
const QUICK_AMOUNTS = [100, 300, 500, 1000, 2000, 5000];

export default function Deposit({ recentDeposits }) {
    const { auth } = usePage().props;
    const [amount, setAmount] = useState('');
    const [isDepositing, setIsDepositing] = useState(false);
    const [error, setError] = useState('');
    const { alert, AlertComponent } = useAlert();

    // Handle dev deposit
    const handleDevDeposit = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            setError('กรุณาระบุจำนวนเงิน');
            return;
        }

        setIsDepositing(true);
        setError('');

        try {
            const response = await fetch('/api/deposit/dev', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setError(data.error || 'เกิดข้อผิดพลาด');
                return;
            }

            // Success!
            const depositAmount = parseFloat(amount);
            setAmount('');
            alert.success('เครดิตได้เพิ่มเข้าบัญชีของคุณแล้ว', 'เติมเครดิตสำเร็จ!', [
                { label: 'จำนวนเงิน', value: `+฿${depositAmount.toLocaleString()}`, highlight: true },
            ]);
            setTimeout(() => router.reload(), 2000);

        } catch (error) {
            setError('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + error.message);
        } finally {
            setIsDepositing(false);
        }
    };

    return (
        <MainLayout>
            <Head title="ฝากเงิน" />

            {/* Decorative Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 -left-32 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative max-w-lg mx-auto pb-8">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={() => router.visit('/')}
                        className="p-2 bg-[#0d1e36] rounded-xl border border-[#1a3a5c] hover:border-emerald-500/50 transition-colors"
                    >
                        <ChevronLeft size={20} className="text-gray-400" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-white flex items-center gap-2">
                            <ArrowDownCircle size={24} className="text-emerald-400" />
                            ฝากเงิน
                        </h1>
                    </div>
                    {/* Dev Mode Badge */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 rounded-full">
                        <Zap size={14} className="text-amber-400" />
                        <span className="text-amber-400 text-xs font-bold">DEV MODE</span>
                    </div>
                </div>

                {/* Balance Card */}
                <div className="bg-gradient-to-br from-emerald-500/20 via-[#0d1e36] to-[#0d1e36] rounded-2xl p-5 mb-5 border border-emerald-500/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
                    <div className="relative">
                        <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                            <Wallet size={16} />
                            เครดิตคงเหลือ
                        </div>
                        <div className="text-4xl font-bold text-white">
                            ฿<span className="text-emerald-400">{(auth?.user?.credit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                {/* Amount Input */}
                <div className="bg-[#0d1e36]/80 backdrop-blur rounded-2xl p-5 mb-5 border border-[#1a3a5c]">
                    <label className="text-gray-300 text-sm font-medium block mb-3">
                        💰 จำนวนเงินที่ต้องการฝาก
                    </label>
                    <div className="relative mb-4">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-xl">฿</span>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => { setAmount(e.target.value); setError(''); }}
                            placeholder="0.00"
                            className="w-full pl-12 pr-4 py-4 bg-[#0a1628] border-2 border-[#1a3a5c] rounded-xl text-3xl font-bold text-white text-center focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                        />
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                        {QUICK_AMOUNTS.map((amt) => (
                            <button
                                key={amt}
                                onClick={() => { setAmount(amt.toString()); setError(''); }}
                                className={`py-3 rounded-xl font-bold transition-all ${amount === amt.toString()
                                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                                    : 'bg-[#0a1628] text-gray-300 border border-[#1a3a5c] hover:border-emerald-500/50 hover:text-emerald-400'
                                    }`}
                            >
                                ฿{amt.toLocaleString()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-5">
                        <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-red-300 text-sm">{error}</p>
                    </div>
                )}

                {/* Deposit Button */}
                <button
                    onClick={handleDevDeposit}
                    disabled={!amount || parseFloat(amount) <= 0 || isDepositing}
                    className="w-full py-4 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 text-white font-bold text-lg rounded-xl disabled:opacity-40 shadow-lg shadow-emerald-500/30 transition-all hover:shadow-emerald-500/50 flex items-center justify-center gap-2 mb-5"
                >
                    {isDepositing ? (
                        <>
                            <Loader2 size={22} className="animate-spin" />
                            กำลังฝากเงิน...
                        </>
                    ) : (
                        <>
                            <Sparkles size={22} />
                            ฝากเงินทันที
                        </>
                    )}
                </button>

                {/* Dev Mode Info */}
                <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                    <Zap size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-amber-200/80 text-xs space-y-1">
                        <p className="font-bold text-amber-400">⚡ Dev Mode เปิดใช้งาน</p>
                        <p>• เลือกจำนวนเงินแล้วกดฝากเงินได้ทันที</p>
                        <p>• ไม่ต้องโอนเงินจริง ไม่ต้องอัพโหลดสลิป</p>
                        <p>• เครดิตจะเข้าบัญชีอัตโนมัติ</p>
                    </div>
                </div>
            </div>

            {/* Game-Style Alert Modal */}
            {AlertComponent}
        </MainLayout>
    );
}
