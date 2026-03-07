import React, { useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { ChevronLeft, QrCode, Copy, Check, Wallet, AlertCircle, ArrowDownCircle, Upload, Camera, Building2, CreditCard, Loader2, ShieldCheck, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import generatePayload from 'promptpay-qr';
import { useAlert } from '@/Components/AlertModal';

// Quick amount buttons
const QUICK_AMOUNTS = [100, 300, 500, 1000, 2000, 5000];

// Bank logo/color mapping
const BANK_STYLES = {
    'กสิกรไทย': { color: '#138f2d', short: 'KBANK' },
    'ไทยพาณิชย์': { color: '#4e2a82', short: 'SCB' },
    'กรุงไทย': { color: '#1ba5e0', short: 'KTB' },
    'กรุงเทพ': { color: '#1e3a8a', short: 'BBL' },
    'กรุงศรี': { color: '#fec62e', short: 'BAY' },
    'ทหารไทยธนชาต': { color: '#1279be', short: 'TTB' },
    'ออมสิน': { color: '#eb198d', short: 'GSB' },
};

export default function Deposit({ qrCodeUrl, promptPayId, bankInfo, recentDeposits, depositPromptpayEnabled = true, depositBankEnabled = true }) {
    const { auth } = usePage().props;
    const [amount, setAmount] = useState('');
    // Default tab: first enabled method
    const defaultTab = depositPromptpayEnabled ? 'promptpay' : (depositBankEnabled ? 'bank' : 'promptpay');
    const [paymentTab, setPaymentTab] = useState(defaultTab);
    const [copied, setCopied] = useState(false);
    const [copiedField, setCopiedField] = useState('');
    const [qrCodePayload, setQrCodePayload] = useState('');

    // Slip upload state
    const [slipImage, setSlipImage] = useState(null);
    const [slipPreview, setSlipPreview] = useState(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verifyError, setVerifyError] = useState('');
    const { alert, AlertComponent } = useAlert();

    // Generate QR payload
    React.useEffect(() => {
        if (promptPayId) {
            try {
                const amt = parseFloat(amount) || 0;
                const payload = generatePayload(promptPayId, { amount: amt });
                setQrCodePayload(payload);
            } catch (e) {
                console.error("QR Generation Error", e);
            }
        }
    }, [amount, promptPayId]);

    const copyToClipboard = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(''), 2000);
    };

    // Handle slip file selection
    const handleSlipSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file
        if (!file.type.startsWith('image/')) {
            setVerifyError('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setVerifyError('ขนาดไฟล์ต้องไม่เกิน 5 MB');
            return;
        }

        setVerifyError('');
        const reader = new FileReader();
        reader.onload = (ev) => {
            setSlipImage(ev.target.result); // data:image/...;base64,...
            setSlipPreview(ev.target.result);
        };
        reader.readAsDataURL(file);
    };

    const clearSlip = () => {
        setSlipImage(null);
        setSlipPreview(null);
        setVerifyError('');
    };

    // Verify slip via EasySlip
    const handleVerifySlip = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            setVerifyError('กรุณาระบุจำนวนเงินก่อน');
            return;
        }
        if (!slipImage) {
            setVerifyError('กรุณาอัพโหลดสลิป');
            return;
        }

        setIsVerifying(true);
        setVerifyError('');

        try {
            const response = await fetch('/api/deposit/verify-slip', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    slip_image: slipImage,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setVerifyError(data.error || 'เกิดข้อผิดพลาดในการตรวจสอบสลิป');
                return;
            }

            // Success!
            const depositAmount = parseFloat(amount);
            setSlipImage(null);
            setSlipPreview(null);
            setAmount('');
            alert.success('เครดิตได้เพิ่มเข้าบัญชีของคุณแล้ว', 'เติมเครดิตสำเร็จ!', [
                { label: 'จำนวนเงิน', value: `+฿${depositAmount.toLocaleString()}`, highlight: true },
            ]);
            setTimeout(() => router.reload(), 3000);

        } catch (error) {
            setVerifyError('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + error.message);
        } finally {
            setIsVerifying(false);
        }
    };


    const hasBankInfo = bankInfo?.bankName && bankInfo?.accountNumber;

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
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full pl-12 pr-4 py-4 bg-[#0a1628] border-2 border-[#1a3a5c] rounded-xl text-3xl font-bold text-white text-center focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                        />
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                        {QUICK_AMOUNTS.map((amt) => (
                            <button
                                key={amt}
                                onClick={() => setAmount(amt.toString())}
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

                {/* Payment Method Tabs — show only if both methods enabled */}
                {depositPromptpayEnabled && depositBankEnabled && hasBankInfo && (
                    <div className="flex gap-2 mb-5">
                        <button
                            onClick={() => setPaymentTab('promptpay')}
                            className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${paymentTab === 'promptpay'
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                                : 'bg-[#0d1e36] text-gray-400 border border-[#1a3a5c] hover:border-blue-500/50'
                                }`}
                        >
                            <QrCode size={18} />
                            พร้อมเพย์
                        </button>
                        <button
                            onClick={() => setPaymentTab('bank')}
                            className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${paymentTab === 'bank'
                                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30'
                                : 'bg-[#0d1e36] text-gray-400 border border-[#1a3a5c] hover:border-purple-500/50'
                                }`}
                        >
                            <Building2 size={18} />
                            โอนผ่านธนาคาร
                        </button>
                    </div>
                )}

                {/* Check if no methods enabled */}
                {!depositPromptpayEnabled && !depositBankEnabled && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 mb-5 text-center">
                        <p className="text-yellow-400 font-bold text-lg mb-1">⚠️ ระบบฝากเงินปิดปรับปรุงชั่วคราว</p>
                        <p className="text-gray-400 text-sm">กรุณาติดต่อแอดมิน</p>
                    </div>
                )}

                {/* PromptPay Tab */}
                {depositPromptpayEnabled && paymentTab === 'promptpay' && (
                    <div className="bg-[#0d1e36]/80 backdrop-blur rounded-2xl p-5 mb-5 border border-[#1a3a5c]">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <QrCode className="text-blue-400" size={20} />
                            </div>
                            <h3 className="text-white font-bold">สแกน QR พร้อมเพย์</h3>
                        </div>

                        {/* QR Code Display */}
                        <div className="bg-white rounded-2xl p-4 mb-4 shadow-lg">
                            <div className="w-52 h-52 mx-auto flex items-center justify-center">
                                {qrCodePayload ? (
                                    <QRCodeSVG
                                        value={qrCodePayload}
                                        size={200}
                                        level="L"
                                        includeMargin={true}
                                    />
                                ) : (
                                    <div className="text-center text-gray-400">
                                        <QrCode size={64} className="mx-auto mb-2 opacity-30" />
                                        <p className="text-sm">กรุณาระบุจำนวนเงิน</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* PromptPay Info */}
                        <div className="bg-[#0a1628] rounded-xl p-4 flex justify-between items-center">
                            <div>
                                <span className="text-gray-400 text-xs block">เบอร์พร้อมเพย์</span>
                                <span className="text-white font-mono font-bold text-lg">{promptPayId || '0xx-xxx-xxxx'}</span>
                            </div>
                            <button
                                onClick={() => copyToClipboard(promptPayId || '', 'promptpay')}
                                className={`p-3 rounded-xl transition-all ${copiedField === 'promptpay' ? 'bg-emerald-500 text-white' : 'bg-[#1a3a5c] text-emerald-400 hover:bg-emerald-500/20'}`}
                            >
                                {copiedField === 'promptpay' ? <Check size={20} /> : <Copy size={20} />}
                            </button>
                        </div>
                    </div>
                )}

                {/* Bank Account Tab */}
                {depositBankEnabled && paymentTab === 'bank' && hasBankInfo && (
                    <div className="bg-[#0d1e36]/80 backdrop-blur rounded-2xl p-5 mb-5 border border-[#1a3a5c]">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-purple-500/20 rounded-lg">
                                <Building2 className="text-purple-400" size={20} />
                            </div>
                            <h3 className="text-white font-bold">โอนเข้าบัญชีธนาคาร</h3>
                        </div>

                        {/* Bank Card */}
                        <div className="bg-gradient-to-br from-[#1a254a] to-[#0a1628] rounded-2xl p-5 border border-[#2a3a6c] mb-3">
                            <div className="flex items-center gap-3 mb-4">
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xs"
                                    style={{ backgroundColor: BANK_STYLES[bankInfo.bankName]?.color || '#1a3a5c' }}
                                >
                                    {BANK_STYLES[bankInfo.bankName]?.short || 'BANK'}
                                </div>
                                <div>
                                    <p className="text-white font-bold">{bankInfo.bankName}</p>
                                    <p className="text-gray-400 text-sm">บัญชีออมทรัพย์</p>
                                </div>
                            </div>

                            {/* Account Number */}
                            <div className="bg-[#0a1628]/70 rounded-xl p-4 mb-3 flex justify-between items-center">
                                <div>
                                    <span className="text-gray-400 text-xs block">เลขบัญชี</span>
                                    <span className="text-white font-mono font-bold text-xl tracking-wider">{bankInfo.accountNumber}</span>
                                </div>
                                <button
                                    onClick={() => copyToClipboard(bankInfo.accountNumber, 'account')}
                                    className={`p-3 rounded-xl transition-all ${copiedField === 'account' ? 'bg-emerald-500 text-white' : 'bg-[#1a3a5c] text-emerald-400 hover:bg-emerald-500/20'}`}
                                >
                                    {copiedField === 'account' ? <Check size={20} /> : <Copy size={20} />}
                                </button>
                            </div>

                            {/* Account Name */}
                            <div className="bg-[#0a1628]/70 rounded-xl p-4">
                                <span className="text-gray-400 text-xs block">ชื่อบัญชี</span>
                                <span className="text-white font-bold text-lg">{bankInfo.accountName}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Slip Upload Section */}
                <div className="bg-[#0d1e36]/80 backdrop-blur rounded-2xl p-5 mb-5 border border-[#1a3a5c]">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                            <ShieldCheck className="text-emerald-400" size={20} />
                        </div>
                        <div>
                            <h3 className="text-white font-bold">อัพโหลดสลิปโอนเงิน</h3>
                            <p className="text-gray-500 text-xs">ระบบจะตรวจสอบอัตโนมัติ</p>
                        </div>
                    </div>

                    {/* Slip Preview or Upload Button */}
                    {slipPreview ? (
                        <div className="relative mb-4">
                            <img
                                src={slipPreview}
                                alt="สลิปโอนเงิน"
                                className="w-full max-h-48 object-contain rounded-xl border-2 border-emerald-500/30 bg-white"
                            />
                            <button
                                onClick={clearSlip}
                                className="absolute top-2 right-2 p-2 bg-red-500/80 rounded-full text-white hover:bg-red-500 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ) : (
                        <label className="block cursor-pointer mb-4">
                            <div className="border-2 border-dashed border-[#2a3a5c] rounded-2xl p-8 text-center hover:border-emerald-500/50 transition-colors">
                                <div className="w-16 h-16 mx-auto mb-3 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                                    <Camera size={32} className="text-emerald-400" />
                                </div>
                                <p className="text-white font-medium mb-1">แตะเพื่อถ่ายรูป / เลือกรูปสลิป</p>
                                <p className="text-gray-500 text-xs">รองรับ JPG, PNG (ไม่เกิน 5 MB)</p>
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleSlipSelect}
                                className="hidden"
                            />
                        </label>
                    )}

                    {/* Error Message */}
                    {verifyError && (
                        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
                            <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-red-300 text-sm">{verifyError}</p>
                        </div>
                    )}

                    {/* Verify Button */}
                    <button
                        onClick={handleVerifySlip}
                        disabled={!slipImage || !amount || isVerifying}
                        className="w-full py-4 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 text-white font-bold rounded-xl disabled:opacity-40 shadow-lg shadow-emerald-500/30 transition-all hover:shadow-emerald-500/50 flex items-center justify-center gap-2"
                    >
                        {isVerifying ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                กำลังตรวจสอบสลิป...
                            </>
                        ) : (
                            <>
                                <ShieldCheck size={20} />
                                ตรวจสอบสลิปและเติมเครดิต
                            </>
                        )}
                    </button>

                    {/* Info Note */}
                    <div className="mt-4 flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                        <AlertCircle size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-blue-200/80 text-xs space-y-1">
                            <p>• สแกน QR หรือโอนเงินตามข้อมูลด้านบน</p>
                            <p>• ถ่ายรูปสลิปแล้วอัพโหลด ระบบจะตรวจอัตโนมัติ</p>
                            <p>• เครดิตจะเข้าบัญชีทันทีหลังตรวจสอบผ่าน</p>
                        </div>
                    </div>
                </div>

                {/* Sticky Verify Button for Mobile (when slip is uploaded) */}
                {slipImage && amount && (
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a1628] via-[#0a1628]/95 to-transparent z-40 md:hidden">
                        <button
                            onClick={handleVerifySlip}
                            disabled={isVerifying}
                            className="w-full py-4 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 text-white font-bold rounded-xl disabled:opacity-40 shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
                        >
                            {isVerifying ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    กำลังตรวจสอบสลิป...
                                </>
                            ) : (
                                <>
                                    <ShieldCheck size={20} />
                                    ตรวจสอบสลิปและเติมเครดิต
                                </>
                            )}
                        </button>
                    </div>
                )}


            </div>

            {/* Game-Style Alert Modal */}
            {AlertComponent}
        </MainLayout>
    );
}
