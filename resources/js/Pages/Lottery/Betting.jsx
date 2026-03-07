import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { ChevronLeft, Star, Clock, Trash2 } from 'lucide-react';

export default function Betting({ slug }) {
    const isThaiGovt = slug === 'thai' || slug === 'thai-lotto';
    const [selectedNumbers, setSelectedNumbers] = useState([]);

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col h-screen overflow-hidden">
            <Head title={`แทงหวย: ${slug}`} />

            {/* Header */}
            <header className="bg-[#111] border-b border-gray-800 px-4 py-3 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-3">
                    <Link href="/" className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white">
                        <ChevronLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="font-bold text-lg leading-tight">
                            {isThaiGovt ? 'สลากกินแบ่งรัฐบาล' : slug.toUpperCase()}
                        </h1>
                        <div className="text-xs text-green-500 flex items-center gap-1">
                            <Clock size={12} /> ปิดรับ 15:30:00
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button className="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors">
                        ผลรางวัล
                    </button>
                    <div className="bg-gray-800 px-3 py-1.5 rounded-lg text-xs">
                        Credit: <span className="text-yellow-500 font-mono font-bold text-sm">0.00</span>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Betting Area (Left/Center) */}
                <div className="flex-1 overflow-y-auto bg-[#050505] p-2 md:p-4">
                    {isThaiGovt ? (
                        <TicketView />
                    ) : (
                        <GridView onSelect={(n) => setSelectedNumbers([...selectedNumbers, n])} selected={selectedNumbers} />
                    )}
                </div>

                {/* Cart/Sidebar (Right) - Visible on Desktop */}
                <aside className="w-80 bg-[#0a0a0a] border-l border-gray-800 flex flex-col hidden md:flex">
                    <div className="bg-yellow-500 text-black font-bold py-2 px-4 text-center shadow-lg uppercase tracking-wider text-sm">
                        รายการแทง
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto p-0">
                        {selectedNumbers.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2">
                                <div className="text-4xl opacity-20">📝</div>
                                <span className="text-sm">ไม่มีรายการ</span>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-800">
                                {selectedNumbers.map((n, i) => (
                                    <div key={i} className="p-3 flex justify-between items-center hover:bg-gray-900">
                                        <span className="font-mono text-lg text-yellow-500">{n}</span>
                                        <div className="text-xs text-gray-400">2 ตัวบน</div>
                                        <button className="text-red-500 hover:text-red-400"><Trash2 size={16} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer Summary */}
                    <div className="p-4 bg-[#111] border-t border-gray-800 space-y-3">
                        <div className="flex justify-between text-sm text-gray-400">
                            <span>จำนวนรายการ</span>
                            <span>{selectedNumbers.length}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold">
                            <span>รวมทั้งหมด</span>
                            <span className="text-yellow-500">0.00</span>
                        </div>
                        <button className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 text-black font-bold py-3 rounded-xl shadow-lg hover:from-yellow-500 hover:to-yellow-400 transition-all">
                            ยืนยันการแทง
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    );
}

/* --- Sub Components --- */

function TicketView() {
    return (
        <div className="flex flex-col items-center space-y-6 max-w-2xl mx-auto py-8">
            <div className="bg-white text-black p-4 rounded-lg shadow-2xl w-full max-w-lg relative overflow-hidden border border-gray-200">
                {/* Mimic Digital Ticket */}
                <div className="border-b-2 border-dashed border-gray-300 pb-4 mb-4 flex justify-between items-start">
                    <div>
                        <h3 className="text-blue-600 font-bold text-lg">THAI GOVERNMENT LOTTERY</h3>
                        <p className="text-xs text-gray-500">งวดประจำวันที่ 1 กุมภาพันธ์ 2569</p>
                    </div>
                    <div className="bg-gray-100 p-2 rounded">
                        QR
                    </div>
                </div>

                <div className="text-center py-6">
                    <div className="text-6xl font-mono font-bold tracking-[0.2em] text-gray-800">
                        ------
                    </div>
                    <p className="text-xs text-red-500 mt-2">ระบุตัวเลข 6 หลัก</p>
                </div>

                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500 opacity-5 rounded-bl-full"></div>
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button key={num} className="bg-white text-black font-bold text-2xl h-16 rounded-xl shadow-md hover:bg-gray-100 active:scale-95 transition-all">
                        {num}
                    </button>
                ))}
                <button className="bg-yellow-500 text-black font-bold text-lg h-16 rounded-xl shadow-md hover:bg-yellow-400">
                    Conf
                </button>
                <button className="bg-white text-black font-bold text-2xl h-16 rounded-xl shadow-md hover:bg-gray-100">
                    0
                </button>
                <button className="bg-red-600 text-white font-bold text-lg h-16 rounded-xl shadow-md hover:bg-red-500">
                    DEL
                </button>
            </div>
        </div>
    );
}

function GridView({ onSelect, selected }) {
    return (
        <div className="bg-[#111] rounded-2xl p-4 border border-gray-800 max-w-4xl mx-auto">
            {/* Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {['3 ตัวบน', '3 ตัวล่าง', '2 ตัวบน', '2 ตัวล่าง'].map(type => (
                    <button key={type} className="px-6 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-medium whitespace-nowrap transition-colors focus:ring-1 focus:ring-yellow-500">
                        {type}
                    </button>
                ))}
            </div>

            {/* Number Grid 00-99 */}
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {Array.from({ length: 100 }, (_, i) => {
                    const num = i.toString().padStart(2, '0');
                    return (
                        <button
                            key={num}
                            onClick={() => onSelect(num)}
                            className="aspect-square bg-[#1a1a1a] rounded-lg border border-gray-800 hover:border-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-500 font-mono text-gray-400 transition-all flex items-center justify-center text-sm sm:text-base active:scale-95"
                        >
                            {num}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
