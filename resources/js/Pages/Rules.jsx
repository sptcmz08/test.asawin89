import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

const LOTTERY_CATEGORIES = [
    {
        key: 'normal',
        name: 'หวยปกติ',
        subtitle: 'หวยรัฐบาลไทย / ลาว / ฮานอย',
        emoji: '🇹🇭',
        betTypes: [
            {
                id: 4,
                name: '3ตัวบน',
                digits: 3,
                description: 'ทายเลข 3 หลักตรงกับ 3 ตัวท้ายของรางวัลที่ 1',
                howToWin: 'เลขที่แทงต้องตรงกับ 3 ตัวท้ายของรางวัลที่ 1 เรียงลำดับถูกต้อง',
                example: 'ผลรางวัลที่ 1 = 123456 → 3ตัวบน = 456 → แทง 456 ถูกรางวัล',
                defaultPayout: 'x900',
            },
            {
                id: 3,
                name: '3ตัวโต๊ด',
                digits: 3,
                description: 'ทายเลข 3 หลัก สลับตำแหน่งได้',
                howToWin: 'เลขที่แทงมีตัวเลขเหมือนกับ 3 ตัวท้ายของรางวัลที่ 1 ไม่ต้องเรียงลำดับ',
                example: 'ผลรางวัล 3ตัวบน = 456 → แทง 654, 465, 546 ฯลฯ ก็ถูกรางวัล',
                defaultPayout: 'x150',
            },
            {
                id: 9,
                name: '3ตัวล่าง',
                digits: 3,
                description: 'ทายเลข 3 หลักตรงกับรางวัล 3 ตัวล่าง (มี 2 ชุดสำหรับหวยไทย)',
                howToWin: 'เลขที่แทงต้องตรงกับ 3 ตัวล่างชุดใดชุดหนึ่ง',
                example: 'ผล 3ตัวล่าง = 123, 789 → แทง 123 หรือ 789 ถูกรางวัล',
                defaultPayout: 'x900',
                note: '⚠️ หวยไทยมี 3ตัวล่าง 2 ชุด / หวยลาว-ฮานอยอาจไม่มี',
            },
            {
                id: 1,
                name: '2ตัวบน',
                digits: 2,
                description: 'ทายเลข 2 หลักตรงกับ 2 ตัวท้ายของรางวัลที่ 1',
                howToWin: 'เลขที่แทงต้องตรงกับ 2 ตัวท้ายของรางวัลที่ 1',
                example: 'ผลรางวัลที่ 1 = 123456 → 2ตัวบน = 56 → แทง 56 ถูกรางวัล',
                defaultPayout: 'x90',
            },
            {
                id: 2,
                name: '2ตัวล่าง',
                digits: 2,
                description: 'ทายเลข 2 หลักตรงกับ 2 ตัวล่าง',
                howToWin: 'เลขที่แทงต้องตรงกับ 2 ตัวล่าง',
                example: 'ผล 2ตัวล่าง = 34 → แทง 34 ถูกรางวัล',
                defaultPayout: 'x90',
            },
            {
                id: 5,
                name: 'วิ่งบน',
                digits: 1,
                description: 'ทายเลขตัวเดียวที่ปรากฏอยู่ใน 3 ตัวบน',
                howToWin: 'เลขที่แทง (1 ตัว) ต้องปรากฏอยู่ในเลข 3 ตัวบน',
                example: '3ตัวบน = 456 → แทง 4, 5, หรือ 6 ถูกรางวัล',
                defaultPayout: 'x2.4',
            },
            {
                id: 6,
                name: 'วิ่งล่าง',
                digits: 1,
                description: 'ทายเลขตัวเดียวที่ปรากฏอยู่ใน 2 ตัวล่าง',
                howToWin: 'เลขที่แทง (1 ตัว) ต้องปรากฏอยู่ในเลข 2 ตัวล่าง',
                example: '2ตัวล่าง = 34 → แทง 3 หรือ 4 ถูกรางวัล',
                defaultPayout: 'x3.2',
            },
        ],
    },
    {
        key: 'stock',
        name: 'หวยหุ้น',
        subtitle: 'หุ้นไทย / ฮั่งเส็ง / นิเคอิ / เกาหลี / จีน / สิงคโปร์ / ไต้หวัน / อินเดีย / รัสเซีย / เยอรมัน / อังกฤษ / อียิปต์ / ดาวโจนส์',
        emoji: '📈',
        betTypes: [
            {
                id: 4,
                name: '3ตัวบน',
                digits: 3,
                description: 'ทายเลข 3 หลักท้ายของดัชนีปิดตลาด',
                howToWin: 'เลขที่แทงต้องตรงกับ 3 หลักท้ายของดัชนีปิดตลาด',
                example: 'ดัชนีปิด = 1,234.56 → 3ตัวบน = 345 (ตัดจุดทศนิยม) → แทง 345 ถูกรางวัล',
                defaultPayout: 'x900',
            },
            {
                id: 1,
                name: '2ตัวบน',
                digits: 2,
                description: 'ทายเลข 2 หลักท้ายของดัชนีปิดตลาด',
                howToWin: 'เลขที่แทงต้องตรงกับ 2 หลักท้ายของดัชนีปิดตลาด',
                example: 'ดัชนีปิด = 1,234.56 → 2ตัวบน = 45 → แทง 45 ถูกรางวัล',
                defaultPayout: 'x90',
            },
            {
                id: 2,
                name: '2ตัวล่าง',
                digits: 2,
                description: 'ทายเลข 2 หลักตรงกับ 2 ตัวล่าง',
                howToWin: 'เลขที่แทงต้องตรงกับเลข 2 ตัวล่าง',
                example: 'ผล 2ตัวล่าง = 78 → แทง 78 ถูกรางวัล',
                defaultPayout: 'x90',
            },
            {
                id: 5,
                name: 'วิ่งบน',
                digits: 1,
                description: 'ทายเลขตัวเดียวที่ปรากฏอยู่ใน 3 ตัวบน',
                howToWin: 'เลขที่แทง (1 ตัว) ต้องปรากฏอยู่ในเลข 3 ตัวบน',
                example: '3ตัวบน = 345 → แทง 3, 4, หรือ 5 ถูกรางวัล',
                defaultPayout: 'x2.4',
            },
            {
                id: 6,
                name: 'วิ่งล่าง',
                digits: 1,
                description: 'ทายเลขตัวเดียวที่ปรากฏอยู่ใน 2 ตัวล่าง',
                howToWin: 'เลขที่แทง (1 ตัว) ต้องปรากฏอยู่ในเลข 2 ตัวล่าง',
                example: '2ตัวล่าง = 78 → แทง 7 หรือ 8 ถูกรางวัล',
                defaultPayout: 'x3.2',
            },
        ],
    },
    {
        key: 'malay',
        name: 'หวยมาเลย์',
        subtitle: 'Malaysian Lottery',
        emoji: '🇲🇾',
        betTypes: [
            {
                id: 10,
                name: '4ตัวบน',
                digits: 4,
                description: 'ทายเลข 4 หลักท้ายของรางวัลที่ 1',
                howToWin: 'เลขที่แทงต้องตรงกับ 4 หลักท้ายของรางวัลที่ 1',
                example: 'ผลรางวัลที่ 1 = 1234 → แทง 1234 ถูกรางวัล',
                defaultPayout: 'x3000',
            },
            {
                id: 4,
                name: '3ตัวบน',
                digits: 3,
                description: 'ทายเลข 3 หลักท้ายของรางวัลที่ 1',
                howToWin: 'เลขที่แทงต้องตรงกับ 3 หลักท้ายของรางวัลที่ 1',
                example: 'ผลรางวัลที่ 1 = 1234 → 3ตัวบน = 234 → แทง 234 ถูกรางวัล',
                defaultPayout: 'x900',
            },
            {
                id: 1,
                name: '2ตัวบน',
                digits: 2,
                description: 'ทายเลข 2 หลักท้ายของรางวัลที่ 1',
                howToWin: 'เลขที่แทงต้องตรงกับ 2 หลักท้ายของรางวัลที่ 1',
                example: 'ผลรางวัลที่ 1 = 1234 → 2ตัวบน = 34 → แทง 34 ถูกรางวัล',
                defaultPayout: 'x90',
            },
            {
                id: 2,
                name: '2ตัวล่าง',
                digits: 2,
                description: 'ทายเลข 2 หลักตรงกับ 2 ตัวล่าง',
                howToWin: 'เลขที่แทงต้องตรงกับ 2 ตัวล่าง',
                example: 'ผล 2ตัวล่าง = 56 → แทง 56 ถูกรางวัล',
                defaultPayout: 'x90',
            },
            {
                id: 5,
                name: 'วิ่งบน',
                digits: 1,
                description: 'ทายเลขตัวเดียวที่ปรากฏอยู่ใน 3 ตัวบน',
                howToWin: 'เลขที่แทง (1 ตัว) ต้องปรากฏอยู่ในเลข 3 ตัวบน',
                example: '3ตัวบน = 234 → แทง 2, 3, หรือ 4 ถูกรางวัล',
                defaultPayout: 'x2.4',
            },
            {
                id: 6,
                name: 'วิ่งล่าง',
                digits: 1,
                description: 'ทายเลขตัวเดียวที่ปรากฏอยู่ใน 2 ตัวล่าง',
                howToWin: 'เลขที่แทง (1 ตัว) ต้องปรากฏอยู่ในเลข 2 ตัวล่าง',
                example: '2ตัวล่าง = 56 → แทง 5 หรือ 6 ถูกรางวัล',
                defaultPayout: 'x3.2',
            },
        ],
    },
];

function BetTypeCard({ betType }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
            >
                <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold text-sm">
                        {betType.digits}
                    </span>
                    <div>
                        <div className="font-bold text-black text-base">{betType.name}</div>
                        <div className="text-gray-500 text-sm">{betType.description}</div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                        {betType.defaultPayout}
                    </span>
                    {expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>
            </button>

            {expanded && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                    <div>
                        <div className="text-xs font-bold text-gray-500 uppercase mb-1">วิธีถูกรางวัล</div>
                        <div className="text-black text-sm">{betType.howToWin}</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                        <div className="text-xs font-bold text-blue-600 uppercase mb-1">ตัวอย่าง</div>
                        <div className="text-blue-800 text-sm">{betType.example}</div>
                    </div>
                    {betType.note && (
                        <div className="bg-yellow-50 rounded-lg p-3">
                            <div className="text-yellow-800 text-sm">{betType.note}</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function Rules() {
    const [activeTab, setActiveTab] = useState('normal');
    const activeCategory = LOTTERY_CATEGORIES.find(c => c.key === activeTab);

    return (
        <MainLayout>
            <Head title="กติกาการเล่น" />

            <div className="max-w-3xl mx-auto">
                {/* Page Container - White Background */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">

                    {/* Header */}
                    <div className="bg-white border-b border-gray-200 px-6 py-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                                <BookOpen size={22} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-black">กติกาการเล่น</h1>
                                <p className="text-gray-500 text-sm">อัตราจ่ายและเงื่อนไขการถูกรางวัลแต่ละประเภท</p>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 bg-gray-50">
                        {LOTTERY_CATEGORIES.map(cat => (
                            <button
                                key={cat.key}
                                onClick={() => setActiveTab(cat.key)}
                                className={`flex-1 py-3 px-4 text-sm font-bold transition-all border-b-2 ${activeTab === cat.key
                                        ? 'text-blue-600 border-blue-600 bg-white'
                                        : 'text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                <span className="mr-1">{cat.emoji}</span>
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {/* Category Header */}
                        <div className="mb-5">
                            <h2 className="text-lg font-bold text-black">{activeCategory.emoji} {activeCategory.name}</h2>
                            <p className="text-gray-500 text-sm mt-1">{activeCategory.subtitle}</p>
                        </div>

                        {/* Bet Types List */}
                        <div className="space-y-3">
                            {activeCategory.betTypes.map(bt => (
                                <BetTypeCard key={bt.id} betType={bt} />
                            ))}
                        </div>

                        {/* General Rules */}
                        <div className="mt-8 bg-gray-50 rounded-xl p-5 border border-gray-200">
                            <h3 className="font-bold text-black text-base mb-3">📌 กฎทั่วไป</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex gap-2">
                                    <span className="text-blue-500">•</span>
                                    <span>เลขอั้น (จ่ายครึ่ง) — เลขบางตัวที่มีผู้แทงมาก อัตราจ่ายจะลดเหลือครึ่งหนึ่ง</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-red-500">•</span>
                                    <span>เลขอั้นห้ามแทง — เลขบางตัวที่เจ้ามือปิดรับ ไม่สามารถแทงได้</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-green-500">•</span>
                                    <span>อัตราจ่ายขึ้นอยู่กับการตั้งค่าของเจ้ามือ ตัวเลขที่แสดงเป็นอัตราเริ่มต้น</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-yellow-500">•</span>
                                    <span>ระบบจะปิดรับแทงก่อนเวลาออกผลตามที่กำหนดไว้ในแต่ละหวย</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-purple-500">•</span>
                                    <span>เงินรางวัลจะเข้าเครดิตอัตโนมัติหลังผลรางวัลออก</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
