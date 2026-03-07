import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { Share2, Link2, Copy, Check, Users, Coins, ChevronDown, ChevronUp } from 'lucide-react';

export default function Referral({ referralCode, stats, commissions, referrals }) {
    const [copied, setCopied] = useState(false);
    const [copiedMsg, setCopiedMsg] = useState(false);
    const [showReferrals, setShowReferrals] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const referralLink = `${window.location.origin}/register?ref=${referralCode}`;
    const rate = stats.commission_rate; // e.g. 1

    // ข้อความสำหรับก๊อปปี้แชร์
    const shareMessage = `🎰 แทงหวยออนไลน์ จ่ายจริง จ่ายเต็ม!\nสมัครเลย 👉 ${referralLink}\nสมัครฟรี ไม่มีค่าธรรมเนียม ฝาก-ถอน ไม่มีขั้นต่ำ`;

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleCopyMessage = () => {
        navigator.clipboard.writeText(shareMessage).then(() => {
            setCopiedMsg(true);
            setTimeout(() => setCopiedMsg(false), 2000);
        });
    };

    return (
        <MainLayout>
            <Head title="เชิญเพื่อน" />

            <div className="max-w-2xl mx-auto space-y-5">

                {/* ===== Section 1: ลิ้งค์แนะนำ และแบนเนอร์ ===== */}
                <div className="bg-[#0d1e36]/80 rounded-2xl border border-[#1a3a5c] overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-b border-yellow-500/30 px-5 py-3">
                        <h2 className="text-yellow-400 font-bold flex items-center gap-2">
                            <Share2 size={18} />
                            ลิ้งค์แนะนำ และแบนเนอร์
                        </h2>
                    </div>

                    <div className="p-5 space-y-4">
                        {/* ลิ้งค์สำหรับโปรโมท */}
                        <div>
                            <label className="text-gray-400 text-sm font-medium mb-2 block">ลิ้งค์สำหรับโปรโมท</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={referralLink}
                                    className="flex-1 bg-[#0a1628] border border-[#1a3a5c] rounded-xl px-4 py-3 text-white text-sm font-mono truncate"
                                />
                                <button
                                    onClick={handleCopy}
                                    className={`px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all flex-shrink-0 ${copied
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black hover:shadow-lg hover:shadow-yellow-500/30'
                                        }`}
                                >
                                    {copied ? <Check size={16} /> : <Copy size={16} />}
                                    {copied ? 'คัดลอกแล้ว!' : 'Copy'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ===== Section 2: ลิ้งค์ช่วยแชร์ ช่วยแนะนำ ===== */}
                <div className="bg-[#0d1e36]/80 rounded-2xl border border-[#1a3a5c] overflow-hidden">
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-[#1a3a5c]">
                        <h2 className="text-white font-bold flex items-center gap-2 text-lg">
                            <Link2 size={20} className="text-yellow-400" />
                            ลิ้งค์ช่วยแชร์ ช่วยแนะนำ
                        </h2>
                    </div>

                    <div className="p-5 space-y-5">
                        {/* Banner สีชมพู */}
                        <div className="bg-gradient-to-r from-rose-500/20 to-pink-500/20 border border-rose-500/30 rounded-2xl p-5 text-center">
                            <p className="text-yellow-400 font-bold text-xl mb-1">
                                ลิ้งค์ช่วยแชร์รับ {rate}% ฟรี!
                            </p>
                            <p className="text-rose-300 text-sm">
                                (เพียงก๊อปปี้ลิ้งค์ไปแชร์ก็ได้เงินแล้ว)
                            </p>
                            <p className="text-white font-bold text-sm mt-1">
                                ยิ่งแชร์มากยิ่งได้มาก
                            </p>
                        </div>

                        {/* คำอธิบาย */}
                        <div className="text-gray-300 text-sm leading-relaxed space-y-3">
                            <p>
                                ท่านสามารถนำลิ้งค์ด้านบนนี้หรือนำป้ายแบนเนอร์ ไปแชร์ในช่องทางต่างๆ
                                ไม่ว่าจะเป็นเว็บไซต์ส่วนตัว, Blog, Facebook หรือ Social Network อื่นๆ
                                หากมีการสมัครสมาชิกโดยคลิกผ่านลิ้งค์ของท่านเข้ามา ลูกค้าที่สมัครเข้ามาก็จะ
                                อยู่ภายใต้เครือข่ายของท่านทันที และหากลูกค้าภายใต้เครือข่ายของท่านมีการเดิมพัน
                                ทุกยอดการเดิมพัน ท่านจะได้รับส่วนแบ่งในการแนะนำ{' '}
                                <span className="text-yellow-400 font-bold">{rate}%</span>{' '}
                                ทันทีโดยไม่มีเงื่อนไข
                            </p>
                        </div>

                        {/* ตัวอย่าง */}
                        <div>
                            <h3 className="text-white font-bold text-sm mb-3">ตัวอย่างดังนี้</h3>
                            <div className="space-y-2">
                                {[
                                    { people: 1, bet: 1000 },
                                    { people: 10, bet: 1000 },
                                    { people: 100, bet: 1000 },
                                ].map((ex, i) => {
                                    const earn = ex.people * ex.bet * (rate / 100);
                                    return (
                                        <div key={i} className="bg-[#0a1628] border border-[#1a3a5c] rounded-xl px-4 py-3">
                                            <p className="text-gray-300 text-sm">
                                                ลูกค้าท่าน <span className="text-yellow-400 font-bold">{ex.people.toLocaleString()}</span> คน
                                                แทง <span className="text-white font-bold">{ex.bet.toLocaleString()}</span> บาท
                                                ท่านจะได้รับ{' '}
                                                <span className="text-emerald-400 font-bold">{earn.toLocaleString()}</span> บาท
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ข้อความโปรโมท */}
                        <div className="text-gray-300 text-sm leading-relaxed">
                            <p>
                                สามารถทำรายได้เดือน 100,000 บาทง่ายๆเลยทีเดียว เพราะทางเรามีหวยเปิดรับทายผล
                                ทุกวัน มีมากกว่าวันละ 200 รอบ เปิดรับแทงออนไลน์ตลอด 24 ชม.
                                และรายได้ทุกบาททุกสตางค์ของท่านสามารถตรวจสอบได้ทุกขั้นตอน
                                งานนี้แจกจริง จริงจ่าย{' '}
                                <span className="text-yellow-400 font-bold">
                                    ที่นี่ที่เดียวที่ให้คุณมากกว่าใคร ก๊อปปี้ลิ้งค์และข้อความด้านล่างนี้ นำไปแชร์ได้เลย
                                </span>
                            </p>
                        </div>

                        {/* ก๊อปปี้ข้อความแชร์ */}
                        <div className="bg-[#0a1628] border border-[#1a3a5c] rounded-xl p-4">
                            <p className="text-gray-400 text-xs mb-2 font-medium">ข้อความสำหรับแชร์:</p>
                            <p className="text-white text-sm whitespace-pre-line mb-3">{shareMessage}</p>
                            <button
                                onClick={handleCopyMessage}
                                className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${copiedMsg
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30'
                                    }`}
                            >
                                {copiedMsg ? <Check size={16} /> : <Copy size={16} />}
                                {copiedMsg ? 'คัดลอกแล้ว!' : 'ก๊อปปี้ข้อความ'}
                            </button>
                        </div>

                        {/* หมายเหตุ */}
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                            <p className="text-amber-300 text-sm">
                                <span className="font-bold">หมายเหตุ:</span>{' '}
                                รายได้การช่วยแชร์ช่วยแนะนำของท่านสามารถแจ้งถอนได้ทุกเวลา
                                หากมียอดรายได้มากกว่า 500 บาทขึ้นไป
                            </p>
                        </div>
                    </div>
                </div>

                {/* ===== Section 3: สถิติของฉัน ===== */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#0d1e36]/80 rounded-2xl p-4 border border-[#1a3a5c]">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                <Users size={16} className="text-blue-400" />
                            </div>
                            <span className="text-gray-400 text-xs">เพื่อนที่ชวน</span>
                        </div>
                        <div className="text-2xl font-bold text-white">{stats.total_referrals}</div>
                    </div>
                    <div className="bg-[#0d1e36]/80 rounded-2xl p-4 border border-[#1a3a5c]">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                <Coins size={16} className="text-emerald-400" />
                            </div>
                            <span className="text-gray-400 text-xs">คอมมิชชั่นรวม</span>
                        </div>
                        <div className="text-2xl font-bold text-emerald-400">฿{stats.total_commission.toLocaleString()}</div>
                    </div>
                </div>

                {/* ===== Section 4: เพื่อนที่ชวนมา ===== */}
                {referrals.length > 0 && (
                    <div className="bg-[#0d1e36]/80 rounded-2xl border border-[#1a3a5c] overflow-hidden">
                        <button
                            onClick={() => setShowReferrals(!showReferrals)}
                            className="w-full p-4 flex items-center justify-between text-left"
                        >
                            <h3 className="text-white font-bold text-sm flex items-center gap-2">
                                <Users size={16} className="text-blue-400" />
                                เพื่อนที่ชวนมา ({referrals.length})
                            </h3>
                            {showReferrals ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                        </button>
                        {showReferrals && (
                            <div className="px-4 pb-4 space-y-2">
                                {referrals.map(r => (
                                    <div key={r.id} className="flex items-center justify-between py-2 border-t border-[#1a3a5c]">
                                        <div>
                                            <div className="text-white text-sm font-medium">{r.name}</div>
                                            <div className="text-gray-500 text-xs">@{r.username}</div>
                                        </div>
                                        <div className="text-gray-400 text-xs">{r.joined_at}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ===== Section 5: ประวัติคอมมิชชั่น ===== */}
                <div className="bg-[#0d1e36]/80 rounded-2xl border border-[#1a3a5c] overflow-hidden">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full p-4 flex items-center justify-between text-left"
                    >
                        <h3 className="text-white font-bold text-sm flex items-center gap-2">
                            <Coins size={16} className="text-emerald-400" />
                            ประวัติคอมมิชชั่น ({commissions.length})
                        </h3>
                        {showHistory ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                    </button>

                    {showHistory && (
                        <div className="px-4 pb-4">
                            {commissions.length === 0 ? (
                                <div className="text-center py-6">
                                    <p className="text-gray-400 text-sm">ยังไม่มีรายการคอมมิชชั่น</p>
                                    <p className="text-gray-500 text-xs mt-1">ชวนเพื่อนมาแทงหวยเพื่อรับคอมฯ!</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {commissions.map(c => (
                                        <div key={c.id} className="flex items-center justify-between py-3 border-t border-[#1a3a5c]">
                                            <div>
                                                <div className="text-white text-sm">{c.bet_user_name} แทง</div>
                                                <div className="text-gray-500 text-xs">{c.created_at}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-emerald-400 font-bold text-sm">+฿{Number(c.commission_amount).toLocaleString()}</div>
                                                <div className="text-gray-500 text-xs">จากยอด ฿{Number(c.bet_amount).toLocaleString()}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
