import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { AdminLayout } from './Dashboard';
import { Settings as SettingsIcon, QrCode, Building2, Save, Check, Loader2, CreditCard, Phone, User, Hash, Gift, Percent, Banknote, Power, MessageCircle, Plus, Trash2 } from 'lucide-react';

export default function Settings({ settings }) {
    const defaultPromos = [
        '🔥 สมัครใหม่ รับเครดิตฟรี 100 บาท',
        '💰 ฝาก 500 รับโบนัส 300 บาท',
        '👥 เชิญเพื่อน รับค่าคอมมิชชั่นทันที',
        '🎰 หวยเปิดให้แทงทุกวัน ครบทุกสำนัก',
    ];

    const parsePromos = () => {
        try {
            const raw = settings?.line_promotions;
            if (raw) return JSON.parse(raw);
        } catch { }
        return defaultPromos;
    };

    const [form, setForm] = useState({
        promptpay_id: settings?.promptpay_id || '',
        bank_name: settings?.bank_name || '',
        bank_account_number: settings?.bank_account_number || '',
        bank_account_name: settings?.bank_account_name || '',
        referral_commission_rate: settings?.referral_commission_rate || '1',
        referral_min_withdraw: settings?.referral_min_withdraw || '500',
        deposit_promptpay_enabled: settings?.deposit_promptpay_enabled ?? '1',
        deposit_bank_enabled: settings?.deposit_bank_enabled ?? '1',
        line_contact_id: settings?.line_contact_id || '@042jhjrk',
        line_backup_id: settings?.line_backup_id || '@042jhjrk',
        line_contact_message: settings?.line_contact_message || '📞 ติดต่อเราได้ที่\n\n💬 LINE: @042jhjrk\n🕐 บริการ 24 ชั่วโมง\n\nแอดมินพร้อมช่วยเหลือทุกเรื่อง! 😊',
    });
    const [promotions, setPromotions] = useState(parsePromos);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const [toggleStatus, setToggleStatus] = useState(''); // for auto-save feedback

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

    const handleChange = (key, value) => {
        setForm(prev => ({ ...prev, [key]: value }));
        setSaved(false);
    };

    // Auto-save a single toggle immediately
    const handleToggle = async (key) => {
        const newValue = form[key] === '1' ? '0' : '1';
        setForm(prev => ({ ...prev, [key]: newValue }));
        setSaved(false);

        try {
            const updatedForm = { ...form, [key]: newValue };
            const response = await fetch('/admin/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({ settings: updatedForm }),
            });

            const data = await response.json();
            if (data.success) {
                const label = key === 'deposit_promptpay_enabled' ? 'พร้อมเพย์' : 'บัญชีธนาคาร';
                setToggleStatus(`${label}: ${newValue === '1' ? 'เปิด' : 'ปิด'} แล้ว ✓`);
                setTimeout(() => setToggleStatus(''), 3000);
            } else {
                setError(data.error || 'บันทึกไม่สำเร็จ');
                // Revert on failure
                setForm(prev => ({ ...prev, [key]: form[key] }));
            }
        } catch (e) {
            setError('เกิดข้อผิดพลาด: ' + e.message);
            setForm(prev => ({ ...prev, [key]: form[key] }));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            const response = await fetch('/admin/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    settings: {
                        ...form,
                        line_promotions: JSON.stringify(promotions.filter(p => p.trim())),
                    }
                }),
            });

            const data = await response.json();
            if (data.success) {
                setSaved(true);
                setTimeout(() => {
                    setSaved(false);
                    router.reload({ only: ['settings'] });
                }, 1500);
            } else {
                setError(data.error || 'เกิดข้อผิดพลาด');
            }
        } catch (e) {
            setError('เกิดข้อผิดพลาด: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const banks = [
        'กสิกรไทย',
        'ไทยพาณิชย์',
        'กรุงไทย',
        'กรุงเทพ',
        'กรุงศรี',
        'ทหารไทยธนชาต',
        'ออมสิน',
        'ธ.ก.ส.',
        'กรุงศรีอยุธยา',
        'ซีไอเอ็มบี',
        'ยูโอบี',
        'แลนด์ แอนด์ เฮ้าส์',
        'อื่นๆ',
    ];

    return (
        <AdminLayout>
            <Head title="ตั้งค่าระบบ" />

            <div className="max-w-3xl">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <SettingsIcon size={28} className="text-yellow-400" />
                        ตั้งค่าระบบ
                    </h2>
                    <p className="text-gray-400">ตั้งค่าบัญชีรับเงินสำหรับระบบฝากเงิน</p>
                </div>

                {/* Toggle Status Toast */}
                {toggleStatus && (
                    <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-xl p-3 mb-5 text-emerald-400 text-sm font-medium text-center animate-pulse">
                        {toggleStatus}
                    </div>
                )}

                {/* PromptPay Section */}
                <div className="bg-[#0d1e36]/80 backdrop-blur rounded-2xl p-6 mb-5 border border-[#1a3a5c]">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <QrCode size={22} className="text-blue-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-white font-bold text-lg">พร้อมเพย์</h3>
                            <p className="text-gray-500 text-sm">เบอร์โทรหรือเลขบัตรประชาชนที่ผูกพร้อมเพย์</p>
                        </div>
                        <button
                            onClick={() => handleToggle('deposit_promptpay_enabled')}
                            className={`relative w-14 h-7 rounded-full transition-colors duration-200 flex-shrink-0 ${form.deposit_promptpay_enabled === '1' ? 'bg-emerald-500' : 'bg-gray-600'}`}
                        >
                            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${form.deposit_promptpay_enabled === '1' ? 'translate-x-7' : 'translate-x-0.5'}`} />
                        </button>
                        <span className={`text-xs font-bold min-w-[24px] ${form.deposit_promptpay_enabled === '1' ? 'text-emerald-400' : 'text-gray-500'}`}>
                            {form.deposit_promptpay_enabled === '1' ? 'เปิด' : 'ปิด'}
                        </span>
                    </div>

                    <div>
                        <label className="text-gray-300 text-sm font-medium flex items-center gap-2 mb-2">
                            <Phone size={14} className="text-gray-500" />
                            เบอร์พร้อมเพย์ / เลขบัตร ปชช.
                        </label>
                        <input
                            type="text"
                            value={form.promptpay_id}
                            onChange={(e) => handleChange('promptpay_id', e.target.value)}
                            placeholder="0812345678 หรือ 1234567890123"
                            className="w-full px-4 py-3 bg-[#0a1628] border border-[#1a3a5c] rounded-xl text-white text-lg font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-gray-600"
                        />
                        <p className="text-gray-600 text-xs mt-1.5">เบอร์โทร 10 หลัก หรือ เลขบัตร ปชช. 13 หลัก</p>
                    </div>
                </div>

                {/* Bank Account Section */}
                <div className="bg-[#0d1e36]/80 backdrop-blur rounded-2xl p-6 mb-5 border border-[#1a3a5c]">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                            <Building2 size={22} className="text-purple-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-white font-bold text-lg">บัญชีธนาคาร</h3>
                            <p className="text-gray-500 text-sm">สำหรับรับเงินโอนจากลูกค้า (ว่างไว้ถ้าไม่ต้องการ)</p>
                        </div>
                        <button
                            onClick={() => handleToggle('deposit_bank_enabled')}
                            className={`relative w-14 h-7 rounded-full transition-colors duration-200 flex-shrink-0 ${form.deposit_bank_enabled === '1' ? 'bg-emerald-500' : 'bg-gray-600'}`}
                        >
                            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${form.deposit_bank_enabled === '1' ? 'translate-x-7' : 'translate-x-0.5'}`} />
                        </button>
                        <span className={`text-xs font-bold min-w-[24px] ${form.deposit_bank_enabled === '1' ? 'text-emerald-400' : 'text-gray-500'}`}>
                            {form.deposit_bank_enabled === '1' ? 'เปิด' : 'ปิด'}
                        </span>
                    </div>

                    <div className="space-y-4">
                        {/* Bank Name */}
                        <div>
                            <label className="text-gray-300 text-sm font-medium flex items-center gap-2 mb-2">
                                <Building2 size={14} className="text-gray-500" />
                                ธนาคาร
                            </label>
                            <select
                                value={form.bank_name}
                                onChange={(e) => handleChange('bank_name', e.target.value)}
                                className="w-full px-4 py-3 bg-[#0a1628] border border-[#1a3a5c] rounded-xl text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                            >
                                <option value="">-- เลือกธนาคาร --</option>
                                {banks.map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                        </div>

                        {/* Account Number */}
                        <div>
                            <label className="text-gray-300 text-sm font-medium flex items-center gap-2 mb-2">
                                <Hash size={14} className="text-gray-500" />
                                เลขบัญชี
                            </label>
                            <input
                                type="text"
                                value={form.bank_account_number}
                                onChange={(e) => handleChange('bank_account_number', e.target.value)}
                                placeholder="xxx-x-xxxxx-x"
                                className="w-full px-4 py-3 bg-[#0a1628] border border-[#1a3a5c] rounded-xl text-white text-lg font-mono focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all placeholder:text-gray-600"
                            />
                        </div>

                        {/* Account Name */}
                        <div>
                            <label className="text-gray-300 text-sm font-medium flex items-center gap-2 mb-2">
                                <User size={14} className="text-gray-500" />
                                ชื่อบัญชี
                            </label>
                            <input
                                type="text"
                                value={form.bank_account_name}
                                onChange={(e) => handleChange('bank_account_name', e.target.value)}
                                placeholder="ชื่อ นามสกุล"
                                className="w-full px-4 py-3 bg-[#0a1628] border border-[#1a3a5c] rounded-xl text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all placeholder:text-gray-600"
                            />
                        </div>
                    </div>
                </div>

                {/* Referral System Section */}
                <div className="bg-[#0d1e36]/80 backdrop-blur rounded-2xl p-6 mb-5 border border-[#1a3a5c]">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                            <Gift size={22} className="text-yellow-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">ระบบแนะนำเพื่อน</h3>
                            <p className="text-gray-500 text-sm">ตั้งค่าอัตราคอมมิชชั่นสำหรับระบบเชิญเพื่อน</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Commission Rate */}
                        <div>
                            <label className="text-gray-300 text-sm font-medium flex items-center gap-2 mb-2">
                                <Percent size={14} className="text-gray-500" />
                                อัตราคอมมิชชั่น (%)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={form.referral_commission_rate}
                                onChange={(e) => handleChange('referral_commission_rate', e.target.value)}
                                placeholder="1"
                                className="w-full px-4 py-3 bg-[#0a1628] border border-[#1a3a5c] rounded-xl text-white text-lg font-mono focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all placeholder:text-gray-600"
                            />
                            <p className="text-gray-600 text-xs mt-1.5">เปอร์เซ็นต์ของยอดเดิมพันที่ผู้แนะนำจะได้รับ (ค่าเริ่มต้น: 1%)</p>
                        </div>

                        {/* Min Withdraw */}
                        <div>
                            <label className="text-gray-300 text-sm font-medium flex items-center gap-2 mb-2">
                                <Banknote size={14} className="text-gray-500" />
                                ขั้นต่ำถอนคอมฯ (บาท)
                            </label>
                            <input
                                type="number"
                                step="1"
                                min="0"
                                value={form.referral_min_withdraw}
                                onChange={(e) => handleChange('referral_min_withdraw', e.target.value)}
                                placeholder="500"
                                className="w-full px-4 py-3 bg-[#0a1628] border border-[#1a3a5c] rounded-xl text-white text-lg font-mono focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all placeholder:text-gray-600"
                            />
                            <p className="text-gray-600 text-xs mt-1.5">ยอดคอมมิชชั่นขั้นต่ำที่ผู้แนะนำจะถอนได้ (ค่าเริ่มต้น: 500 บาท)</p>
                        </div>
                    </div>
                </div>

                {/* LINE Contact Section */}
                <div className="bg-[#0d1e36]/80 backdrop-blur rounded-2xl p-6 mb-5 border border-[#1a3a5c]">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                            <MessageCircle size={22} className="text-green-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">LINE ติดต่อเรา</h3>
                            <p className="text-gray-500 text-sm">ข้อมูล LINE ที่แสดงเมื่อลูกค้ากดปุ่มติดต่อเรา</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-gray-300 text-sm font-medium flex items-center gap-2 mb-2">
                                <MessageCircle size={14} className="text-gray-500" />
                                LINE ID หลัก (ติดต่อเรา)
                            </label>
                            <input
                                type="text"
                                value={form.line_contact_id}
                                onChange={(e) => handleChange('line_contact_id', e.target.value)}
                                placeholder="@042jhjrk"
                                className="w-full px-4 py-3 bg-[#0a1628] border border-[#1a3a5c] rounded-xl text-white font-mono focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all placeholder:text-gray-600"
                            />
                            <p className="text-gray-600 text-xs mt-1.5">LINE OA ID สำหรับปุ่มติดต่อเรา เช่น @042jhjrk</p>
                        </div>

                        <div>
                            <label className="text-gray-300 text-sm font-medium flex items-center gap-2 mb-2">
                                <MessageCircle size={14} className="text-gray-500" />
                                LINE ID สำรอง (ไลน์สำรอง)
                            </label>
                            <input
                                type="text"
                                value={form.line_backup_id}
                                onChange={(e) => handleChange('line_backup_id', e.target.value)}
                                placeholder="@042jhjrk"
                                className="w-full px-4 py-3 bg-[#0a1628] border border-[#1a3a5c] rounded-xl text-white font-mono focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all placeholder:text-gray-600"
                            />
                            <p className="text-gray-600 text-xs mt-1.5">LINE ID สำหรับปุ่มไลน์สำรอง</p>
                        </div>

                        <div>
                            <label className="text-gray-300 text-sm font-medium flex items-center gap-2 mb-2">
                                <MessageCircle size={14} className="text-gray-500" />
                                ข้อความตอบกลับ "ติดต่อเรา"
                            </label>
                            <textarea
                                rows={4}
                                value={form.line_contact_message}
                                onChange={(e) => handleChange('line_contact_message', e.target.value)}
                                placeholder={`📞 ติดต่อเราได้ที่\n\n💬 LINE: @042jhjrk\n🕐 บริการ 24 ชั่วโมง`}
                                className="w-full px-4 py-3 bg-[#0a1628] border border-[#1a3a5c] rounded-xl text-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all placeholder:text-gray-600 resize-none"
                            />
                            <p className="text-gray-600 text-xs mt-1.5">ข้อความที่ส่งอัตโนมัติเมื่อลูกค้ากดปุ่มติดต่อเรา หรือพิมพ์ว่า ติดต่อ/แอดมิน</p>
                        </div>
                    </div>
                </div>

                {/* LINE Promotions Section */}
                <div className="bg-[#0d1e36]/80 backdrop-blur rounded-2xl p-6 mb-5 border border-[#1a3a5c]">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                                <Gift size={22} className="text-yellow-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">โปรโมชั่น LINE Bot</h3>
                                <p className="text-gray-500 text-sm">แก้ไขโปรโมชั่นที่แสดงเมื่อลูกค้ากด "กิจกรรม" ใน Rich Menu</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setPromotions(prev => [...prev, ''])}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-sm font-medium transition-all"
                        >
                            <Plus size={15} /> เพิ่ม
                        </button>
                    </div>

                    <div className="space-y-2.5">
                        {promotions.map((promo, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-400 text-xs flex items-center justify-center font-bold flex-shrink-0">
                                    {idx + 1}
                                </span>
                                <input
                                    type="text"
                                    value={promo}
                                    onChange={(e) => {
                                        const updated = [...promotions];
                                        updated[idx] = e.target.value;
                                        setPromotions(updated);
                                        setSaved(false);
                                    }}
                                    placeholder="ข้อความโปรโมชั่น..."
                                    className="flex-1 px-4 py-2.5 bg-[#0a1628] border border-[#1a3a5c] rounded-xl text-white text-sm focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all placeholder:text-gray-600"
                                />
                                <button
                                    onClick={() => setPromotions(prev => prev.filter((_, i) => i !== idx))}
                                    className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all flex-shrink-0"
                                    title="ลบ"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        ))}
                        {promotions.length === 0 && (
                            <p className="text-gray-600 text-sm text-center py-4">ยังไม่มีโปรโมชั่น กดปุ่ม "เพิ่ม" เพื่อเพิ่มรายการ</p>
                        )}
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-5 text-red-300 text-sm">
                        ❌ {error}
                    </div>
                )}

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg ${saved
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/30'
                        : 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 text-black shadow-yellow-500/30 hover:shadow-yellow-500/50'
                        }`}
                >
                    {saving ? (
                        <>
                            <Loader2 size={20} className="animate-spin" />
                            กำลังบันทึก...
                        </>
                    ) : saved ? (
                        <>
                            <Check size={20} />
                            บันทึกสำเร็จ!
                        </>
                    ) : (
                        <>
                            <Save size={20} />
                            บันทึกการตั้งค่า
                        </>
                    )}
                </button>
            </div>
        </AdminLayout>
    );
}
