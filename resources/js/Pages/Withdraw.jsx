import React, { useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { ChevronLeft, Wallet, AlertTriangle, Clock, Check, ArrowUpCircle, Building2, CreditCard, Lock, CheckCircle } from 'lucide-react';
import { useAlert } from '@/Components/AlertModal';

const QUICK_AMOUNTS = [100, 300, 500, 1000, 2000, 5000];

const BANK_NAMES = {
    KBANK: 'กสิกรไทย',
    KTB: 'กรุงไทย',
    BBL: 'กรุงเทพ',
    SCB: 'ไทยพาณิชย์',
    TTB: 'ทหารไทยธนชาต',
    GSB: 'ออมสิน',
    BAY: 'กรุงศรีอยุธยา',
    BAAC: 'ธ.ก.ส.',
    PROMPTPAY: 'พร้อมเพย์',
};

export default function Withdraw({ bankAccount, pendingWithdrawals = [], recentWithdrawals = [] }) {
    const { auth } = usePage().props;
    const [amount, setAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { alert, AlertComponent } = useAlert();

    const userCredit = auth?.user?.credit || 0;

    const handleWithdraw = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            alert.warning('กรุณาระบุจำนวนเงินที่ต้องการถอน', 'ระบุจำนวนเงิน');
            return;
        }

        if (parseFloat(amount) > userCredit) {
            alert.error('ยอดเงินในบัญชีไม่เพียงพอสำหรับการถอน', 'ยอดเงินไม่เพียงพอ');
            return;
        }

        if (parseFloat(amount) < 100) {
            alert.warning('ถอนขั้นต่ำ 100 บาท', 'จำนวนเงินไม่ถึงขั้นต่ำ');
            return;
        }

        if (!bankAccount) {
            alert.error('ไม่พบบัญชีธนาคาร กรุณาติดต่อแอดมิน', 'ไม่พบบัญชี');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/withdraw', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                }),
            });

            const data = await response.json();
            if (data.success) {
                const msg = data.gateway_status === 'completed'
                    ? 'โอนเงินเข้าบัญชีเรียบร้อยแล้ว!'
                    : 'ส่งคำขอถอนเงินสำเร็จ รอดำเนินการ';
                alert.success(msg, 'ถอนเงินสำเร็จ!', [
                    { label: 'จำนวนเงิน', value: `฿${parseFloat(amount).toLocaleString()}`, highlight: true },
                    { label: 'บัญชีรับเงิน', value: bankAccount ? `${BANK_NAMES[bankAccount.bank_name] || bankAccount.bank_name}` : '-' },
                    { label: 'สถานะ', value: data.gateway_status === 'completed' ? '✅ โอนแล้ว' : '⏳ รอดำเนินการ' },
                ]);
                // Reload after a delay
                setTimeout(() => router.reload(), 2000);
            } else {
                alert.error(data.error || 'เกิดข้อผิดพลาดในการถอนเงิน');
            }
        } catch (error) {
            alert.error('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง', 'เชื่อมต่อไม่ได้');
        } finally {
            setIsSubmitting(false);
        }
    };

    const setMaxAmount = () => {
        setAmount(Math.floor(userCredit).toString());
    };

    return (
        <MainLayout>
            <Head title="ถอนเงิน" />

            {/* Decorative Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 -left-32 w-64 h-64 bg-red-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative max-w-lg mx-auto pb-8">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={() => router.visit('/')}
                        className="p-2 bg-[#0d1e36] rounded-xl border border-[#1a3a5c] hover:border-red-500/50 transition-colors"
                    >
                        <ChevronLeft size={20} className="text-gray-400" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-white flex items-center gap-2">
                            <ArrowUpCircle size={24} className="text-red-400" />
                            ถอนเงิน
                        </h1>
                    </div>
                </div>

                {/* Balance Card */}
                <div className="bg-gradient-to-br from-red-500/20 via-[#0d1e36] to-[#0d1e36] rounded-2xl p-5 mb-5 border border-red-500/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl" />
                    <div className="relative">
                        <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                            <Wallet size={16} />
                            ยอดถอนได้
                        </div>
                        <div className="text-4xl font-bold text-white">
                            ฿<span className="text-red-400">{userCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                {/* Registered Bank Account (Read-only) */}
                <div className="bg-[#0d1e36]/80 backdrop-blur rounded-2xl p-5 mb-5 border border-[#1a3a5c]">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-yellow-500/20 rounded-lg">
                                <Building2 className="text-yellow-400" size={20} />
                            </div>
                            <h3 className="text-white font-bold">บัญชีรับเงิน</h3>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500 text-xs">
                            <Lock size={12} />
                            <span>ล็อคถาวร</span>
                        </div>
                    </div>

                    {bankAccount ? (
                        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/5 border-2 border-yellow-500/30 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow">
                                    <CreditCard size={24} className="text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-white font-medium">{BANK_NAMES[bankAccount.bank_name] || bankAccount.bank_name}</p>
                                    <p className="text-yellow-400 text-sm font-mono tracking-wider">{bankAccount.account_number}</p>
                                    <p className="text-gray-400 text-xs">{bankAccount.account_name}</p>
                                </div>
                                <CheckCircle size={20} className="text-emerald-400" />
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6 bg-[#0a1628] rounded-xl">
                            <Building2 size={40} className="mx-auto mb-2 text-gray-600" />
                            <p className="text-gray-400 mb-2">ไม่พบบัญชีธนาคาร</p>
                            <p className="text-gray-500 text-sm">กรุณาติดต่อแอดมินเพื่อเพิ่มบัญชี</p>
                        </div>
                    )}
                </div>

                {/* Amount Input */}
                <div className="bg-[#0d1e36]/80 backdrop-blur rounded-2xl p-5 mb-5 border border-[#1a3a5c]">
                    <div className="flex justify-between items-center mb-3">
                        <label className="text-gray-300 text-sm font-medium">💸 จำนวนเงินที่ต้องการถอน</label>
                        <button onClick={setMaxAmount} className="text-yellow-400 text-sm font-medium hover:text-yellow-300">
                            ถอนทั้งหมด
                        </button>
                    </div>
                    <div className="relative mb-4">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-red-400 font-bold text-xl">฿</span>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            max={userCredit}
                            className="w-full pl-12 pr-4 py-4 bg-[#0a1628] border-2 border-[#1a3a5c] rounded-xl text-3xl font-bold text-white text-center focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                        />
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                        {QUICK_AMOUNTS.filter(amt => amt <= userCredit).map((amt) => (
                            <button
                                key={amt}
                                onClick={() => setAmount(amt.toString())}
                                className={`py-3 rounded-xl font-bold transition-all ${amount === amt.toString()
                                    ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/30'
                                    : 'bg-[#0a1628] text-gray-300 border border-[#1a3a5c] hover:border-red-500/50 hover:text-red-400'
                                    }`}
                            >
                                ฿{amt.toLocaleString()}
                            </button>
                        ))}
                    </div>

                    {/* Min/Max Info */}
                    <div className="mt-4 flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                        <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0" />
                        <span className="text-yellow-200/80 text-sm">ถอนขั้นต่ำ 100 บาท • สูงสุด {userCredit.toLocaleString()} บาท</span>
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    onClick={handleWithdraw}
                    disabled={!amount || parseFloat(amount) <= 0 || !bankAccount || isSubmitting}
                    className="w-full py-4 bg-gradient-to-r from-red-500 via-red-600 to-orange-500 text-white font-bold rounded-xl disabled:opacity-50 shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all mb-5"
                >
                    {isSubmitting ? '⏳ กำลังดำเนินการ...' : `ถอนเงิน ฿${amount || '0'}`}
                </button>

                {/* Pending Withdrawals */}
                {pendingWithdrawals.length > 0 && (
                    <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-2xl p-5 border border-yellow-500/30 mb-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Clock className="text-yellow-400" size={20} />
                            <h3 className="text-yellow-400 font-bold">รายการรอดำเนินการ</h3>
                        </div>
                        <div className="space-y-2">
                            {pendingWithdrawals.map((w, i) => (
                                <div key={i} className="flex justify-between items-center bg-[#0a1628] rounded-xl p-4">
                                    <div>
                                        <p className="text-white font-bold">฿{parseFloat(w.amount).toLocaleString()}</p>
                                        <p className="text-gray-500 text-xs">{new Date(w.created_at).toLocaleString('th-TH')}</p>
                                    </div>
                                    <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm rounded-full font-medium">
                                        รอดำเนินการ
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent Withdrawals */}
                {recentWithdrawals.length > 0 && (
                    <div className="bg-[#0d1e36]/80 backdrop-blur rounded-2xl p-5 border border-[#1a3a5c]">
                        <h3 className="text-gray-300 font-bold mb-3">📋 ประวัติการถอน</h3>
                        <div className="space-y-2">
                            {recentWithdrawals.map((w, i) => (
                                <div key={i} className="flex justify-between items-center bg-[#0a1628] rounded-xl p-3">
                                    <div>
                                        <p className="text-white font-medium text-sm">฿{parseFloat(w.amount).toLocaleString()}</p>
                                        <p className="text-gray-500 text-xs">{new Date(w.created_at).toLocaleString('th-TH')}</p>
                                    </div>
                                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${w.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                        w.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-red-500/20 text-red-400'
                                        }`}>
                                        {w.status === 'completed' ? 'สำเร็จ' :
                                            w.status === 'pending' ? 'รอ' : 'ปฏิเสธ'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Game-Style Alert Modal */}
            {AlertComponent}
        </MainLayout>
    );
}
