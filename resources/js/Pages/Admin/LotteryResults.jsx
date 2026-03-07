import React, { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import { AdminLayout } from './Dashboard';
import { Plus, CheckCircle, Edit, Trash2, AlertTriangle, XCircle, Info, FileText, RefreshCw } from 'lucide-react';
import { AlertModal, useAlert } from '@/Components/AlertModal';

export default function LotteryResults({ lotteryTypes, recentResults }) {
    const [loading, setLoading] = useState(false);
    const [scraping, setScraping] = useState(false);
    const [showManualForm, setShowManualForm] = useState(false);
    const [showScrapeForm, setShowScrapeForm] = useState(false);
    const [editingResult, setEditingResult] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [showEditConfirm, setShowEditConfirm] = useState(false);
    const alert = useAlert();
    const [scrapeForm, setScrapeForm] = useState({
        code: 'all',
        count: 5,
    });
    const [manualForm, setManualForm] = useState({
        lottery_type_id: '',
        draw_date: new Date().toISOString().split('T')[0],
        first_prize: '',
        three_top: '',
        three_bottom: '',
        two_top: '',
        two_bottom: '',
    });
    const [editForm, setEditForm] = useState({
        first_prize: '',
        three_top: '',
        three_bottom: '',
        two_top: '',
        two_bottom: '',
    });

    // Group results by lottery type
    const groupedResults = useMemo(() => {
        if (!recentResults?.length) return {};
        const grouped = {};
        recentResults.forEach(result => {
            const typeName = result.lottery_type?.name || 'อื่นๆ';
            if (!grouped[typeName]) {
                grouped[typeName] = [];
            }
            grouped[typeName].push(result);
        });
        return grouped;
    }, [recentResults]);



    // ดึงผลหวยย้อนหลังจาก ManyCai
    const submitScrape = async (e) => {
        e.preventDefault();
        setScraping(true);
        try {
            const response = await fetch('/admin/lottery-results/scrape-manycai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(scrapeForm),
            });
            const data = await response.json();
            if (data.success) {
                alert.success(`ดึงข้อมูลสำเร็จ!\n${data.output || ''}`);
                router.reload({ only: ['recentResults'] });
            } else {
                alert.error(data.error || 'เกิดข้อผิดพลาด');
            }
        } catch (error) {
            alert.error('เกิดข้อผิดพลาด: ' + error.message);
        } finally {
            setScraping(false);
        }
    };

    const submitManualResult = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetch('/admin/lottery-results/manual', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(manualForm),
            });
            const data = await response.json();
            if (data.success) {
                const details = [];
                if (data.calc_stats) {
                    details.push({ label: 'Bets ทั้งหมด', value: data.calc_stats.total_bets });
                    details.push({ label: 'ถูกรางวัล', value: data.calc_stats.win_count, highlight: true });
                    details.push({ label: 'เงินรางวัลรวม', value: `฿${Math.floor(Number(data.calc_stats.total_payout || 0)).toLocaleString()}`, highlight: true });
                }
                alert.success(
                    'บันทึกผลหวยสำเร็จ! ระบบคำนวณยอดถูกรางวัลแล้ว',
                    'สำเร็จ!',
                    details.length > 0 ? details : null
                );
                setShowManualForm(false);
                setManualForm({
                    lottery_type_id: '',
                    draw_date: new Date().toISOString().split('T')[0],
                    first_prize: '',
                    three_top: '',
                    three_bottom: '',
                    two_top: '',
                    two_bottom: '',
                });
                router.reload();
            } else {
                alert.error(data.message || 'Unknown error', 'เกิดข้อผิดพลาด');
            }
        } catch (error) {
            alert.error(error.message, 'เกิดข้อผิดพลาด');
        } finally {
            setLoading(false);
        }
    };

    // Open edit modal
    const handleEdit = (result) => {
        setEditForm({
            first_prize: result.first_prize || '',
            three_top: result.three_top || '',
            three_bottom: result.three_bottom || '',
            two_top: result.two_top || '',
            two_bottom: result.two_bottom || '',
        });
        setEditingResult(result);
    };

    // Submit edit form - called after confirm
    const doSubmitEdit = async () => {
        if (!editingResult) return;

        setLoading(true);
        try {
            const response = await fetch(`/admin/lottery-results/${editingResult.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(editForm),
            });
            const data = await response.json();
            if (data.success) {
                const details = [];
                if (data.reset_stats) {
                    details.push({ label: 'Reset', value: `${data.reset_stats.reset_count} รายการ` });
                    if (data.reset_stats.refunded_count > 0) {
                        details.push({ label: 'หักคืน', value: `${data.reset_stats.refunded_count} รายการ (฿${Math.floor(Number(data.reset_stats.refunded_amount)).toLocaleString()})`, highlight: true });
                    }
                }
                if (data.calc_stats) {
                    details.push({ label: 'ถูกรางวัลใหม่', value: `${data.calc_stats.win_count} รายการ`, highlight: true });
                }
                alert.success('แก้ไขผลหวยและคำนวณใหม่สำเร็จ!', 'สำเร็จ!', details.length > 0 ? details : null);
                setEditingResult(null);
                router.reload();
            } else {
                alert.error(data.message || 'Unknown error', 'เกิดข้อผิดพลาด');
            }
        } catch (error) {
            alert.error(error.message, 'เกิดข้อผิดพลาด');
        } finally {
            setLoading(false);
        }
    };

    // Submit edit form with confirm
    const submitEditResult = async (e) => {
        e.preventDefault();
        if (!editingResult) return;
        setShowEditConfirm(true);
    };

    // Delete result - called after confirm
    const doDelete = async (result) => {
        setLoading(true);
        try {
            const response = await fetch(`/admin/lottery-results/${result.id}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                },
            });
            const data = await response.json();
            if (data.success) {
                alert.success('ลบผลหวยสำเร็จ!', 'สำเร็จ!');
                setShowDeleteConfirm(null);
                router.reload();
            } else {
                alert.error('ไม่สามารถลบได้', 'เกิดข้อผิดพลาด');
            }
        } catch (error) {
            alert.error(error.message, 'เกิดข้อผิดพลาด');
        } finally {
            setLoading(false);
        }
    };

    // Delete result with confirm
    const handleDelete = (result) => {
        setShowDeleteConfirm(result);
    };

    return (
        <AdminLayout>
            <Head title="ผลหวย" />

            <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <FileText className="text-yellow-400" size={28} />
                        ผลหวย
                    </h2>
                    <p className="text-gray-400">บันทึกผลหวย Manual และดูผลล่าสุด</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => { setShowScrapeForm(!showScrapeForm); setShowManualForm(false); }}
                        className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:from-blue-400 hover:to-blue-500 transition-all"
                    >
                        <RefreshCw size={18} /> ดึงข้อมูลย้อนหลัง
                    </button>
                    <button
                        onClick={() => { setShowManualForm(!showManualForm); setShowScrapeForm(false); }}
                        className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold rounded-xl shadow-lg shadow-yellow-500/30 hover:from-yellow-300 hover:to-yellow-400 transition-all"
                    >
                        <Plus size={20} /> บันทึกผลหวย
                    </button>
                </div>
            </div>

            {/* Scrape Form - ดึงข้อมูลย้อนหลัง */}
            {showScrapeForm && (
                <div className="bg-gradient-to-r from-[#1a3a5c] to-[#0d2540] border border-blue-500/50 rounded-xl p-6 mb-6">
                    <h3 className="text-xl font-bold text-blue-400 mb-4">🔄 ดึงข้อมูลผลหวยย้อนหลังจาก ManyCai</h3>
                    <form onSubmit={submitScrape} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-gray-400 text-sm block mb-1">ประเภทหวย</label>
                                <select
                                    value={scrapeForm.code}
                                    onChange={(e) => setScrapeForm({ ...scrapeForm, code: e.target.value })}
                                    className="w-full bg-[#0a1628] border border-[#2a4a6c] rounded-lg px-4 py-2 text-white"
                                >
                                    <option value="all">ทั้งหมด</option>
                                    <option value="BFHN">หวยฮานอยพิเศษ</option>
                                    <option value="HNVIP">หวยฮานอย VIP</option>
                                    <option value="YNHN">หวยฮานอย</option>
                                    <option value="TLZC">หวยลาวพัฒนา</option>
                                    <option value="ZCVIP">หวยลาว VIP</option>
                                    <option value="TGFC">หวยไทย</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-gray-400 text-sm block mb-1">จำนวนงวดย้อนหลัง</label>
                                <select
                                    value={scrapeForm.count}
                                    onChange={(e) => setScrapeForm({ ...scrapeForm, count: parseInt(e.target.value) })}
                                    className="w-full bg-[#0a1628] border border-[#2a4a6c] rounded-lg px-4 py-2 text-white"
                                >
                                    <option value="1">1 งวด</option>
                                    <option value="3">3 งวด</option>
                                    <option value="5">5 งวด</option>
                                    <option value="10">10 งวด</option>
                                    <option value="20">20 งวด</option>
                                </select>
                            </div>
                            <div className="flex items-end">
                                <button
                                    type="submit"
                                    disabled={scraping}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 disabled:opacity-50"
                                >
                                    {scraping ? '⏳ กำลังดึงข้อมูล...' : '🔄 ดึงข้อมูล'}
                                </button>
                            </div>
                        </div>
                        <p className="text-gray-500 text-sm">
                            ⚡ ระบบจะดึงข้อมูลจาก ManyCai และบันทึกลงฐานข้อมูลโดยอัตโนมัติ (ข้อมูลที่มีอยู่แล้วจะถูกข้าม)
                        </p>
                    </form>
                </div>
            )}

            {/* Manual Entry Form */}
            {showManualForm && (() => {
                // กำหนด fields ที่ต้องกรอกตามประเภทหวย
                const selectedType = lotteryTypes?.find(t => String(t.id) === String(manualForm.lottery_type_id));
                const slug = selectedType?.slug || '';
                const isThai = slug === 'thai';
                const isMalay = slug === 'malay';

                return (
                    <div className="bg-gradient-to-r from-[#1a3a5c] to-[#0d2540] border border-yellow-500/50 rounded-xl p-6 mb-6">
                        <h3 className="text-xl font-bold text-yellow-400 mb-4">📝 บันทึกผลหวยด้วยมือ</h3>
                        <form onSubmit={submitManualResult} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-gray-400 text-sm block mb-1">ประเภทหวย</label>
                                    <select
                                        value={manualForm.lottery_type_id}
                                        onChange={(e) => setManualForm({ ...manualForm, lottery_type_id: e.target.value, first_prize: '', three_top: '', three_bottom: '', two_top: '', two_bottom: '' })}
                                        className="w-full bg-[#0a1628] border border-[#2a4a6c] rounded-lg px-4 py-2 text-white"
                                        required
                                    >
                                        <option value="">เลือกประเภท</option>
                                        {lotteryTypes?.map(type => (
                                            <option key={type.id} value={type.id}>{type.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm block mb-1">วันที่ออกผล</label>
                                    <input
                                        type="date"
                                        value={manualForm.draw_date}
                                        onChange={(e) => setManualForm({ ...manualForm, draw_date: e.target.value })}
                                        className="w-full bg-[#0a1628] border border-[#2a4a6c] rounded-lg px-4 py-2 text-white"
                                        required
                                    />
                                </div>
                            </div>

                            {/* แสดง fields ตามประเภทหวยที่เลือก */}
                            {manualForm.lottery_type_id ? (
                                <>
                                    {/* แสดงประเภทที่ต้องกรอก */}
                                    <div className="text-xs text-gray-500 mb-1">
                                        📋 กรอกผลรางวัล: {isThai ? 'รางวัลที่ 1, 3 ตัวบน, 3 ตัวล่าง, 2 ตัวบน, 2 ตัวล่าง' : isMalay ? '4 ตัวบน, 3 ตัวบน, 2 ตัวบน, 2 ตัวล่าง' : '3 ตัวบน, 2 ตัวบน, 2 ตัวล่าง'}
                                    </div>
                                    <div className={`grid gap-3 ${isThai ? 'grid-cols-2 md:grid-cols-5' : isMalay ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'}`}>
                                        {/* รางวัลที่ 1 — เฉพาะหวยไทย */}
                                        {isThai && (
                                            <div>
                                                <label className="text-gray-400 text-xs block mb-1">รางวัลที่ 1</label>
                                                <input
                                                    type="text"
                                                    value={manualForm.first_prize}
                                                    onChange={(e) => setManualForm({ ...manualForm, first_prize: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                                                    className="w-full bg-[#0a1628] border border-yellow-500/50 rounded-lg px-4 py-2 text-yellow-400 font-mono text-center text-lg"
                                                    placeholder="123456"
                                                    maxLength="6"
                                                />
                                            </div>
                                        )}
                                        {/* 4 ตัวบน — เฉพาะมาเลย์ */}
                                        {isMalay && (
                                            <div>
                                                <label className="text-gray-400 text-xs block mb-1">4 ตัวบน</label>
                                                <input
                                                    type="text"
                                                    value={manualForm.first_prize}
                                                    onChange={(e) => setManualForm({ ...manualForm, first_prize: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                                                    className="w-full bg-[#0a1628] border border-yellow-500/50 rounded-lg px-4 py-2 text-yellow-400 font-mono text-center text-lg"
                                                    placeholder="1234"
                                                    maxLength="4"
                                                />
                                            </div>
                                        )}
                                        {/* 3 ตัวบน — ทุกประเภท */}
                                        <div>
                                            <label className="text-gray-400 text-xs block mb-1">3 ตัวบน</label>
                                            <input
                                                type="text"
                                                value={manualForm.three_top}
                                                onChange={(e) => setManualForm({ ...manualForm, three_top: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                                                className="w-full bg-[#0a1628] border border-[#2a4a6c] rounded-lg px-4 py-2 text-white font-mono text-center"
                                                placeholder="456"
                                                maxLength="3"
                                            />
                                        </div>
                                        {/* 3 ตัวล่าง — เฉพาะหวยไทย */}
                                        {isThai && (
                                            <div>
                                                <label className="text-gray-400 text-xs block mb-1">3 ตัวล่าง</label>
                                                <input
                                                    type="text"
                                                    value={manualForm.three_bottom}
                                                    onChange={(e) => setManualForm({ ...manualForm, three_bottom: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                                                    className="w-full bg-[#0a1628] border border-[#2a4a6c] rounded-lg px-4 py-2 text-white font-mono text-center"
                                                    placeholder="789"
                                                    maxLength="3"
                                                />
                                            </div>
                                        )}
                                        {/* 2 ตัวบน — ทุกประเภท */}
                                        <div>
                                            <label className="text-gray-400 text-xs block mb-1">2 ตัวบน</label>
                                            <input
                                                type="text"
                                                value={manualForm.two_top}
                                                onChange={(e) => setManualForm({ ...manualForm, two_top: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                                                className="w-full bg-[#0a1628] border border-[#2a4a6c] rounded-lg px-4 py-2 text-white font-mono text-center"
                                                placeholder="56"
                                                maxLength="2"
                                            />
                                        </div>
                                        {/* 2 ตัวล่าง — ทุกประเภท */}
                                        <div>
                                            <label className="text-gray-400 text-xs block mb-1">2 ตัวล่าง</label>
                                            <input
                                                type="text"
                                                value={manualForm.two_bottom}
                                                onChange={(e) => setManualForm({ ...manualForm, two_bottom: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                                                className="w-full bg-[#0a1628] border border-[#2a4a6c] rounded-lg px-4 py-2 text-white font-mono text-center"
                                                placeholder="78"
                                                maxLength="2"
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center text-gray-500 py-4 border border-dashed border-[#2a4a6c] rounded-lg">
                                    👆 กรุณาเลือกประเภทหวยก่อน
                                </div>
                            )}

                            <div className="text-sm text-blue-400 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                                💡 หลังบันทึก ระบบจะคำนวณยอดถูกรางวัลให้อัตโนมัติ
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={loading || !manualForm.lottery_type_id}
                                    className="flex-1 bg-yellow-500 text-black font-bold py-3 rounded-lg hover:bg-yellow-400 disabled:opacity-50"
                                >
                                    {loading ? 'กำลังบันทึก...' : 'บันทึกผลหวย'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowManualForm(false)}
                                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
                                >
                                    ยกเลิก
                                </button>
                            </div>
                        </form>
                    </div>
                );
            })()}

            {/* Results by Category */}
            <div className="space-y-6">
                {Object.keys(groupedResults).length > 0 ? (
                    Object.entries(groupedResults).map(([typeName, results]) => (
                        <div key={typeName} className="bg-[#0d1e36]/80 backdrop-blur border border-[#1a3a5c] rounded-2xl overflow-hidden">
                            <div className="bg-gradient-to-r from-yellow-500/20 to-transparent px-5 py-4 border-b border-[#1a3a5c]">
                                <h3 className="text-lg font-bold text-yellow-400 flex items-center gap-2">🎰 {typeName}</h3>
                            </div>
                            <div className="divide-y divide-[#1a3a5c]">
                                {results.slice(0, 5).map((result) => (
                                    <div key={result.id} className="p-4 hover:bg-[#1a3a5c]/30 transition-colors">
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <CheckCircle className="text-green-400" size={18} />
                                                <span className="text-gray-400 text-sm">
                                                    {new Date(result.draw_date).toLocaleDateString('th-TH', {
                                                        weekday: 'short',
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    })}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-2 text-sm">
                                                {result.first_prize && (
                                                    <div className="bg-yellow-500/20 px-3 py-1 rounded-lg">
                                                        <span className="text-gray-400">รางวัล1: </span>
                                                        <span className="text-yellow-400 font-mono font-bold">{result.first_prize}</span>
                                                    </div>
                                                )}
                                                {result.three_top && (
                                                    <div className="bg-[#1a3a5c] px-3 py-1 rounded-lg">
                                                        <span className="text-gray-400">3บน: </span>
                                                        <span className="text-white font-mono">{result.three_top}</span>
                                                    </div>
                                                )}
                                                {result.three_bottom && (
                                                    <div className="bg-[#1a3a5c] px-3 py-1 rounded-lg">
                                                        <span className="text-gray-400">3ล่าง: </span>
                                                        <span className="text-white font-mono">{result.three_bottom}</span>
                                                    </div>
                                                )}
                                                {result.two_top && (
                                                    <div className="bg-[#1a3a5c] px-3 py-1 rounded-lg">
                                                        <span className="text-gray-400">2บน: </span>
                                                        <span className="text-white font-mono">{result.two_top}</span>
                                                    </div>
                                                )}
                                                {result.two_bottom && (
                                                    <div className="bg-[#1a3a5c] px-3 py-1 rounded-lg">
                                                        <span className="text-gray-400">2ล่าง: </span>
                                                        <span className="text-white font-mono">{result.two_bottom}</span>
                                                    </div>
                                                )}
                                            </div>
                                            {/* Action Buttons */}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(result)}
                                                    className="flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 text-sm"
                                                >
                                                    <Edit size={14} /> แก้ไข
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(result)}
                                                    className="flex items-center gap-1 px-3 py-1 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 text-sm"
                                                >
                                                    <Trash2 size={14} /> ลบ
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-[#0d1e36]/80 backdrop-blur border border-[#1a3a5c] rounded-2xl p-12 text-center">
                        <FileText size={40} className="mx-auto mb-3 opacity-30 text-gray-500" />
                        <p className="text-gray-500 text-lg">ยังไม่มีผลหวย</p>
                        <p className="text-gray-600 text-sm mt-2">กดปุ่ม "บันทึกผลหวย" เพื่อเพิ่มผลรางวัล</p>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingResult && (() => {
                const editSlug = editingResult.lottery_type?.slug || '';
                const editIsThai = editSlug === 'thai';
                const editIsMalay = editSlug === 'malay';

                return (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-gradient-to-br from-[#0d1e36] to-[#0a1628] rounded-3xl w-full max-w-lg p-6 border border-yellow-500/30 shadow-2xl">
                            <div className="flex items-center gap-2 mb-4">
                                <AlertTriangle className="text-yellow-400" size={24} />
                                <h3 className="text-xl font-bold text-white">แก้ไขผลหวย</h3>
                            </div>

                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4 text-sm text-yellow-300">
                                ⚠️ การแก้ไขจะทำให้ระบบคำนวณผลใหม่ทั้งหมด
                                <br />• Bets ที่ถูกรางวัลเดิมจะถูก reset
                                <br />• ถ้าจ่ายเงินไปแล้ว จะหักคืนจากเครดิตผู้ใช้
                            </div>

                            <form onSubmit={submitEditResult} className="space-y-4">
                                <div className="text-gray-400 text-sm mb-2">
                                    หวย: <span className="text-white">{editingResult.lottery_type?.name}</span> |
                                    วันที่: <span className="text-white">{new Date(editingResult.draw_date).toLocaleDateString('th-TH')}</span>
                                </div>

                                <div className="text-xs text-gray-500 mb-1">
                                    📋 แก้ไขผลรางวัล: {editIsThai ? 'รางวัลที่ 1, 3 ตัวบน, 3 ตัวล่าง, 2 ตัวบน, 2 ตัวล่าง' : editIsMalay ? '4 ตัวบน, 3 ตัวบน, 2 ตัวบน, 2 ตัวล่าง' : '3 ตัวบน, 2 ตัวบน, 2 ตัวล่าง'}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {/* รางวัลที่ 1 — เฉพาะหวยไทย */}
                                    {editIsThai && (
                                        <div className="col-span-2">
                                            <label className="text-gray-400 text-xs block mb-1">รางวัลที่ 1</label>
                                            <input
                                                type="text"
                                                value={editForm.first_prize}
                                                onChange={(e) => setEditForm({ ...editForm, first_prize: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                                                className="w-full bg-[#0a1628] border border-yellow-500/50 rounded-lg px-4 py-2 text-yellow-400 font-mono text-center text-lg"
                                                maxLength="6"
                                            />
                                        </div>
                                    )}
                                    {/* 4 ตัวบน — เฉพาะมาเลย์ */}
                                    {editIsMalay && (
                                        <div className="col-span-2">
                                            <label className="text-gray-400 text-xs block mb-1">4 ตัวบน</label>
                                            <input
                                                type="text"
                                                value={editForm.first_prize}
                                                onChange={(e) => setEditForm({ ...editForm, first_prize: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                                                className="w-full bg-[#0a1628] border border-yellow-500/50 rounded-lg px-4 py-2 text-yellow-400 font-mono text-center text-lg"
                                                maxLength="4"
                                            />
                                        </div>
                                    )}
                                    {/* 3 ตัวบน — ทุกประเภท */}
                                    <div>
                                        <label className="text-gray-400 text-xs block mb-1">3 ตัวบน</label>
                                        <input
                                            type="text"
                                            value={editForm.three_top}
                                            onChange={(e) => setEditForm({ ...editForm, three_top: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                                            className="w-full bg-[#0a1628] border border-[#2a4a6c] rounded-lg px-4 py-2 text-white font-mono text-center"
                                            maxLength="3"
                                        />
                                    </div>
                                    {/* 3 ตัวล่าง — เฉพาะหวยไทย */}
                                    {editIsThai && (
                                        <div>
                                            <label className="text-gray-400 text-xs block mb-1">3 ตัวล่าง</label>
                                            <input
                                                type="text"
                                                value={editForm.three_bottom}
                                                onChange={(e) => setEditForm({ ...editForm, three_bottom: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                                                className="w-full bg-[#0a1628] border border-[#2a4a6c] rounded-lg px-4 py-2 text-white font-mono text-center"
                                                maxLength="3"
                                            />
                                        </div>
                                    )}
                                    {/* 2 ตัวบน — ทุกประเภท */}
                                    <div>
                                        <label className="text-gray-400 text-xs block mb-1">2 ตัวบน</label>
                                        <input
                                            type="text"
                                            value={editForm.two_top}
                                            onChange={(e) => setEditForm({ ...editForm, two_top: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                                            className="w-full bg-[#0a1628] border border-[#2a4a6c] rounded-lg px-4 py-2 text-white font-mono text-center"
                                            maxLength="2"
                                        />
                                    </div>
                                    {/* 2 ตัวล่าง — ทุกประเภท */}
                                    <div>
                                        <label className="text-gray-400 text-xs block mb-1">2 ตัวล่าง</label>
                                        <input
                                            type="text"
                                            value={editForm.two_bottom}
                                            onChange={(e) => setEditForm({ ...editForm, two_bottom: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                                            className="w-full bg-[#0a1628] border border-[#2a4a6c] rounded-lg px-4 py-2 text-white font-mono text-center"
                                            maxLength="2"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditingResult(null)}
                                        className="flex-1 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 disabled:opacity-50"
                                    >
                                        {loading ? 'กำลังบันทึก...' : 'บันทึกและคำนวณใหม่'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}

            {/* Edit Confirm Modal */}
            <AlertModal
                show={showEditConfirm}
                type="confirm"
                title="ยืนยันการแก้ไข?"
                message="การแก้ไขจะทำให้ระบบคำนวณผลใหม่&#10;&#10;• Bets ที่ถูกรางวัลเดิมจะถูก reset&#10;• ถ้าจ่ายเงินไปแล้ว จะหักคืนจากเครดิต"
                onClose={() => setShowEditConfirm(false)}
                onConfirm={() => {
                    setShowEditConfirm(false);
                    doSubmitEdit();
                }}
                confirmText="ยืนยันแก้ไข"
                cancelText="ยกเลิก"
            />

            {/* Delete Confirm Modal */}
            <AlertModal
                show={!!showDeleteConfirm}
                type="confirm"
                title="ยืนยันการลบ?"
                message="การลบจะทำให้:&#10;&#10;• Reset Bets ทั้งหมดเป็น pending&#10;• ถ้าจ่ายเงินไปแล้ว จะหักคืนจากเครดิต"
                onClose={() => setShowDeleteConfirm(null)}
                onConfirm={() => {
                    if (showDeleteConfirm) {
                        doDelete(showDeleteConfirm);
                    }
                }}
                confirmText="ยืนยันลบ"
                cancelText="ยกเลิก"
            />

            {/* Alert Component */}
            {alert.AlertComponent}
        </AdminLayout>
    );
}
