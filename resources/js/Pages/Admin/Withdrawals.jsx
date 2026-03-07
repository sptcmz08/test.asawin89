import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { AdminLayout } from './Dashboard';
import { Wallet, Check, X, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useAlert } from '@/Components/AlertModal';

const STATUS_STYLES = {
    pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'รอดำเนินการ', icon: Clock },
    approved: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: 'อนุมัติแล้ว', icon: CheckCircle },
    completed: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'เสร็จสิ้น', icon: CheckCircle },
    rejected: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: 'ปฏิเสธ', icon: XCircle },
};

export default function AdminWithdrawals({ withdrawals = { data: [] } }) {
    const [filter, setFilter] = useState('pending');
    const { alert, AlertComponent } = useAlert();

    const filteredWithdrawals = withdrawals.data?.filter(w =>
        filter === 'all' || w.status === filter
    ) || [];

    // Summary
    const pendingCount = withdrawals.data?.filter(w => w.status === 'pending').length || 0;
    const pendingAmount = withdrawals.data?.filter(w => w.status === 'pending').reduce((sum, w) => sum + (w.amount || 0), 0) || 0;
    const approvedToday = withdrawals.data?.filter(w => w.status === 'approved' && new Date(w.updated_at).toDateString() === new Date().toDateString()).length || 0;

    const handleApprove = async (id) => {
        alert.confirm('ต้องการอนุมัติการถอนเงินนี้?', async () => {
            try {
                const response = await fetch(`/admin/withdrawals/${id}/approve`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                });

                let data;
                try {
                    data = await response.json();
                } catch (parseError) {
                    alert.error('ไม่สามารถอ่านผลลัพธ์จากเซิร์ฟเวอร์ได้');
                    return;
                }

                if (!response.ok || !data.success) {
                    alert.error(data.message || 'เกิดข้อผิดพลาดในการอนุมัติ');
                    return;
                }
                alert.success('อนุมัติการถอนเงินเรียบร้อย', 'อนุมัติสำเร็จ!');
                setTimeout(() => router.reload(), 1500);
            } catch (error) {
                alert.error('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + error.message, 'เชื่อมต่อไม่ได้');
            }
        }, 'อนุมัติการถอนเงิน');
    };

    const handleReject = async (id) => {
        const reason = prompt('เหตุผลที่ปฏิเสธ:');
        if (!reason) return;

        try {
            const response = await fetch(`/admin/withdrawals/${id}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ reason }),
            });

            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                alert.error('ไม่สามารถอ่านผลลัพธ์จากเซิร์ฟเวอร์ได้');
                return;
            }

            if (!response.ok || !data.success) {
                alert.error(data.message || 'เกิดข้อผิดพลาดในการปฏิเสธ');
                return;
            }
            alert.success('ปฏิเสธการถอนเงินเรียบร้อย', 'ดำเนินการแล้ว');
            setTimeout(() => router.reload(), 1500);
        } catch (error) {
            alert.error('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + error.message, 'เชื่อมต่อไม่ได้');
        }
    };

    return (
        <AdminLayout>
            <Head title="จัดการถอนเงิน" />

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Wallet className="text-red-400" size={28} />
                        จัดการถอนเงิน
                    </h2>
                    <p className="text-gray-400">{filteredWithdrawals.length} รายการ</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="bg-gradient-to-br from-yellow-500/20 to-[#0d1e36] rounded-2xl p-4 border border-yellow-500/30">
                    <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle size={18} className="text-yellow-400" />
                        <span className="text-gray-400 text-sm">รอดำเนินการ</span>
                    </div>
                    <p className="text-yellow-400 text-2xl font-bold">{pendingCount}</p>
                </div>
                <div className="bg-gradient-to-br from-red-500/20 to-[#0d1e36] rounded-2xl p-4 border border-red-500/30">
                    <div className="flex items-center gap-2 mb-1">
                        <Wallet size={18} className="text-red-400" />
                        <span className="text-gray-400 text-sm">ยอดรอถอน</span>
                    </div>
                    <p className="text-red-400 text-2xl font-bold">฿{Math.floor(Number(pendingAmount)).toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/20 to-[#0d1e36] rounded-2xl p-4 border border-emerald-500/30">
                    <div className="flex items-center gap-2 mb-1">
                        <CheckCircle size={18} className="text-emerald-400" />
                        <span className="text-gray-400 text-sm">อนุมัติวันนี้</span>
                    </div>
                    <p className="text-emerald-400 text-2xl font-bold">{approvedToday}</p>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                {[
                    { key: 'pending', label: 'รอดำเนินการ', count: pendingCount },
                    { key: 'approved', label: 'อนุมัติแล้ว' },
                    { key: 'completed', label: 'เสร็จสิ้น' },
                    { key: 'rejected', label: 'ปฏิเสธ' },
                    { key: 'all', label: 'ทั้งหมด' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={`px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-2 ${filter === tab.key
                            ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black shadow-lg shadow-yellow-500/30'
                            : 'bg-[#0d1e36] text-gray-400 border border-[#1a3a5c] hover:border-yellow-500/50'
                            }`}
                    >
                        {tab.label}
                        {tab.count > 0 && (
                            <span className={`px-1.5 py-0.5 rounded text-xs ${filter === tab.key ? 'bg-black/20' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Withdrawals Table */}
            <div className="bg-[#0d1e36]/80 backdrop-blur rounded-2xl border border-[#1a3a5c] overflow-x-auto">
                <table className="w-full min-w-[700px]">
                    <thead>
                        <tr className="bg-gradient-to-r from-yellow-500/10 to-transparent border-b border-[#1a3a5c]">
                            <th className="px-4 py-3 text-left text-yellow-400 font-bold text-sm">ID</th>
                            <th className="px-4 py-3 text-left text-yellow-400 font-bold text-sm">สมาชิก</th>
                            <th className="px-4 py-3 text-left text-yellow-400 font-bold text-sm">ธนาคาร</th>
                            <th className="px-4 py-3 text-right text-yellow-400 font-bold text-sm">จำนวน</th>
                            <th className="px-4 py-3 text-center text-yellow-400 font-bold text-sm">วันที่</th>
                            <th className="px-4 py-3 text-center text-yellow-400 font-bold text-sm">สถานะ</th>
                            <th className="px-4 py-3 text-center text-yellow-400 font-bold text-sm">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1a3a5c]">
                        {filteredWithdrawals.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-4 py-12 text-center text-gray-500">
                                    <Wallet size={40} className="mx-auto mb-2 opacity-50" />
                                    ไม่มีรายการ
                                </td>
                            </tr>
                        ) : (
                            filteredWithdrawals.map((w) => {
                                const status = STATUS_STYLES[w.status] || STATUS_STYLES.pending;
                                return (
                                    <tr key={w.id} className="hover:bg-[#1a3a5c]/50 transition-colors">
                                        <td className="px-4 py-4 text-gray-400">{w.id}</td>
                                        <td className="px-4 py-4">
                                            <div className="text-white font-medium">{w.user?.name}</div>
                                            <div className="text-gray-500 text-xs">{w.user?.phone}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="text-gray-300">{w.bank_account?.bank_name || '-'}</div>
                                            <div className="text-gray-500 text-xs font-mono">{w.bank_account?.account_number || '-'}</div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <span className="text-red-400 font-mono font-bold text-lg">
                                                ฿{Math.floor(Number(w.amount || 0)).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-center text-gray-400 text-sm">
                                            {new Date(w.created_at).toLocaleDateString('th-TH')}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.bg} ${status.text}`}>
                                                {status.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            {w.status === 'pending' && (
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleApprove(w.id)}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors font-medium text-sm"
                                                    >
                                                        <Check size={16} /> อนุมัติ
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(w.id)}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors font-medium text-sm"
                                                    >
                                                        <X size={16} /> ปฏิเสธ
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
            {AlertComponent}
        </AdminLayout>
    );
}
