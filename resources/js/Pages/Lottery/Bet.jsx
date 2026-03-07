import React, { useState, useEffect, useMemo } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { ChevronLeft, Plus, Trash2, Shuffle, Hash, Check, Clock, List, RefreshCw, X, Calendar, Search, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

// Dynamic bet types — ทุกหวยใช้ประเภทเดียวกันหมด
const getBetTypes = (lottery, rates = {}) => {
    const r = (id, fallback) => rates[id] ?? fallback;

    return {
        3: [
            { id: 4, name: '3ตัวตรง', payout: r(4, 900), type: 'up' },
            { id: 3, name: '3ตัวโต๊ด', payout: r(3, 150), type: 'tod' },
        ],
        2: [
            { id: 1, name: '2ตัวบน', payout: r(1, 90), type: 'up' },
            { id: 2, name: '2ตัวล่าง', payout: r(2, 90), type: 'down' },
        ],
        1: [
            { id: 5, name: 'วิ่งบน', payout: r(5, 2.4), type: 'up' },
            { id: 6, name: 'วิ่งล่าง', payout: r(6, 3.2), type: 'down' },
        ],
    };
};


// Generate number grid
const generateNumbers = (digits, rangeStart = 0) => {
    const count = 100;
    const numbers = [];
    const maxNum = digits === 1 ? 10 : digits === 2 ? 100 : digits === 3 ? 1000 : 10000;
    for (let i = rangeStart; i < rangeStart + count && i < maxNum; i++) {
        numbers.push(i.toString().padStart(digits, '0'));
    }
    return numbers;
};

// Generate reversed/permuted numbers
const reverseNumber = (num) => {
    if (num.length === 1) return [num];
    if (num.length === 2) {
        // 2 ตัว: กลับแค่ 1 คู่ เช่น 12 → [12, 21]
        const reversed = num.split('').reverse().join('');
        if (reversed !== num) return [num, reversed];
        return [num];
    }
    // 3+ ตัว: สร้างทุก permutation ที่ไม่ซ้ำ เช่น 123 → [123, 132, 213, 231, 312, 321]
    const permute = (arr) => {
        if (arr.length <= 1) return [arr];
        const result = [];
        for (let i = 0; i < arr.length; i++) {
            const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
            for (const perm of permute(rest)) {
                result.push([arr[i], ...perm]);
            }
        }
        return result;
    };
    const perms = permute(num.split(''));
    const unique = [...new Set(perms.map(p => p.join('')))];
    return unique;
};


export default function Bet({ lottery, specialNumbers = [], forbiddenNumbers = [], payoutRates = {} }) {
    const { auth } = usePage().props;

    // Dynamic bet types based on lottery (uses DB payout rates)
    const BET_TYPES = useMemo(() => getBetTypes(lottery, payoutRates), [lottery, payoutRates]);
    const availableCategories = useMemo(() => Object.keys(BET_TYPES).map(Number).sort((a, b) => b - a), [BET_TYPES]);
    const defaultCategory = availableCategories[0] || 3;

    // LocalStorage cache key scoped by lottery
    const cacheKey = `bets_${lottery?.slug || 'default'}`;
    const loadCache = () => {
        try {
            const cached = localStorage.getItem(cacheKey);
            return cached ? JSON.parse(cached) : null;
        } catch { return null; }
    };
    const cached = useMemo(() => loadCache(), []);

    const [mode, setMode] = useState('panel'); // panel, keypad
    const [category, setCategory] = useState(defaultCategory);
    const [selectedType, setSelectedType] = useState(BET_TYPES[defaultCategory]?.[0]);
    const [selectedTypes, setSelectedTypes] = useState(BET_TYPES[defaultCategory] || []);
    const toggleType = (type) => {
        setSelectedTypes(prev => {
            const exists = prev.find(t => t.id === type.id);
            if (exists) {
                // Don't allow deselecting all — must keep at least 1
                if (prev.length <= 1) return prev;
                return prev.filter(t => t.id !== type.id);
            }
            return [...prev, type];
        });
    };
    // Resolve which types are active for adding bets
    const getActiveTypes = () => (category === 3 || category === 2) ? selectedTypes : [selectedType];
    const [rangeStart, setRangeStart] = useState(0);
    const [selectedBets, setSelectedBets] = useState(cached?.bets || []);
    const [keypadDigits, setKeypadDigits] = useState([]);
    const [reverseEnabled, setReverseEnabled] = useState(false);
    const [showPriceModal, setShowPriceModal] = useState(false);
    const [globalPrice, setGlobalPrice] = useState(cached?.price || 1);
    const [slipName, setSlipName] = useState(cached?.slipName || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [submittedTotal, setSubmittedTotal] = useState(0);
    const [errorModal, setErrorModal] = useState({ show: false, title: '', message: '' });
    const [showRulesModal, setShowRulesModal] = useState(false);
    const [showDigitModal, setShowDigitModal] = useState(false);
    const [digitModalType, setDigitModalType] = useState(''); // 'front', 'back', '19door'

    // Timer & Result states
    const [timeLeft, setTimeLeft] = useState('');
    const [showResultModal, setShowResultModal] = useState(false);
    const [checkDate, setCheckDate] = useState(''); // Empty initially to fetch latest
    const [checkResult, setCheckResult] = useState(null);
    const [isLoadingResult, setIsLoadingResult] = useState(false);
    const [allResults, setAllResults] = useState([]);
    const [isLoadingAllResults, setIsLoadingAllResults] = useState(false);
    const [availableDates, setAvailableDates] = useState([]);
    const [creditType, setCreditType] = useState('real'); // 'real' | 'bonus'

    // Update selected type when category changes
    useEffect(() => {
        if (BET_TYPES[category]) {
            setSelectedType(BET_TYPES[category][0]);
            // For 3-digit and 2-digit: default select ALL types
            if (category === 3 || category === 2) {
                setSelectedTypes([...BET_TYPES[category]]);
            }
        }
        setRangeStart(0);
        setKeypadDigits([]);
    }, [category, BET_TYPES]);

    // Save to localStorage when bets/price/slipName change
    useEffect(() => {
        if (selectedBets.length > 0) {
            localStorage.setItem(cacheKey, JSON.stringify({ bets: selectedBets, price: globalPrice, slipName }));
        } else {
            localStorage.removeItem(cacheKey);
        }
    }, [selectedBets, globalPrice, slipName]);

    // Timer Logic
    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const closeTime = new Date(lottery?.close_time).getTime();
            const distance = closeTime - now;

            if (distance < 0) {
                return "ปิดรับแทง";
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            return `${days} วัน ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [lottery?.close_time]);

    // Check Reward
    const handleCheckReward = async () => {
        setIsLoadingResult(true);
        try {
            const dateParam = checkDate ? `&date=${checkDate}` : '';
            const res = await fetch(`/api/lottery-results/check?slug=${lottery.slug}${dateParam}`);
            const data = await res.json();

            // Set result (single object for all lottery types)
            setCheckResult(data.result);

            // If we fetched latest (no date param) and got a result, update the date picker
            if (!checkDate && data.result) {
                setCheckDate(data.result.draw_date);
            }
        } catch (error) {
            console.error(error);
            setCheckResult(null);
        } finally {
            setIsLoadingResult(false);
        }
    };

    // Initial fetch when opening modal or changing date
    useEffect(() => {
        if (showResultModal) {
            if (lottery?.slug === 'thai') {
                // Thai lottery: fetch available dates for dropdown
                fetch(`/api/lottery-results/available-dates?slug=${lottery.slug}`)
                    .then(res => res.json())
                    .then(data => {
                        setAvailableDates(data.dates || []);
                        if (!checkDate && data.dates && data.dates.length > 0) {
                            setCheckDate(data.dates[0]);
                        }
                    })
                    .catch(console.error);
            } else {
                // Non-Thai: fetch all history at once
                setIsLoadingAllResults(true);
                fetch(`/api/lottery-results/history?slug=${lottery.slug}&limit=20`)
                    .then(res => res.json())
                    .then(data => {
                        setAllResults(data.results || []);
                    })
                    .catch(console.error)
                    .finally(() => setIsLoadingAllResults(false));
            }
        }
    }, [showResultModal]);

    // Fetch result when date changes (Thai only)
    useEffect(() => {
        if (showResultModal && checkDate && lottery?.slug === 'thai') {
            handleCheckReward();
        }
    }, [checkDate]);


    // Generate numbers for current range
    const numbers = useMemo(() => generateNumbers(category, rangeStart), [category, rangeStart]);

    // Add bet to list
    const addBet = (number) => {
        const activeTypes = getActiveTypes();

        // Check if forbidden for any active type
        const isForbidden = activeTypes.every(type =>
            forbiddenNumbers.some(fn =>
                fn.number === number && (fn.bet_type_id === null || fn.bet_type_id === type.id)
            )
        );
        if (isForbidden) {
            setErrorModal({
                show: true,
                title: '⛔ เลขอั้น - ห้ามแทง',
                message: `เลข ${number} เป็นเลขอั้นห้ามแทงในงวดนี้\n\nกรุณาเลือกเลขอื่น`
            });
            return;
        }

        // Check if special (จ่ายลด) for any active type
        const isSpecialNumber = specialNumbers.some(sn =>
            sn.number === number && (sn.bet_type_id === null || activeTypes.some(t => sn.bet_type_id === t.id))
        );
        if (isSpecialNumber) {
            const specialEntry = specialNumbers.find(sn =>
                sn.number === number && activeTypes.some(t => sn.bet_type_id === t.id)
            ) || specialNumbers.find(sn =>
                sn.number === number && sn.bet_type_id === null
            );
            const pct = specialEntry?.payout_rate || 50;
            setErrorModal({
                show: true,
                title: '⚠️ เลขอั้น - จ่ายลด',
                message: `เลข ${number} เป็นเลขอั้นจ่าย ${pct}% ของราคาปกติ\n\nหากต้องการแทง กดปิดแล้วเลือกใหม่อีกครั้ง`
            });
        }

        const numbersToAdd = (reverseEnabled && category > 1) ? reverseNumber(number) : [number];
        const newBets = [...selectedBets];
        const originalNumber = number; // The number user actually clicked

        numbersToAdd.forEach(num => {
            activeTypes.forEach(type => {
                // Skip forbidden for this specific type
                const typeForbidden = forbiddenNumbers.some(fn =>
                    fn.number === num && (fn.bet_type_id === null || fn.bet_type_id === type.id)
                );
                if (typeForbidden) return;

                // Check if already exists
                const exists = newBets.find(b => b.number === num && b.typeId === type.id);
                if (!exists) {
                    // Determine payout for this number
                    const numIsSpecial = specialNumbers.some(sn =>
                        sn.number === num && (sn.bet_type_id === null || sn.bet_type_id === type.id)
                    );
                    let payout = type.payout;
                    if (numIsSpecial) {
                        const entry = specialNumbers.find(sn =>
                            sn.number === num && sn.bet_type_id === type.id
                        ) || specialNumbers.find(sn =>
                            sn.number === num && sn.bet_type_id === null
                        );
                        const pct = entry?.payout_rate || 50;
                        payout = Math.floor(type.payout * (pct / 100));
                    }
                    newBets.push({
                        number: num,
                        typeId: type.id,
                        typeName: type.name,
                        payout: payout,
                        amount: globalPrice,
                        isSpecial: numIsSpecial,
                        isReversed: num !== originalNumber && reverseEnabled,
                    });
                }
            });
        });

        setSelectedBets(newBets);
    };

    // Remove bet
    const removeBet = (index) => {
        setSelectedBets(prev => prev.filter((_, i) => i !== index));
    };

    // Clear all bets
    const clearAll = () => {
        setSelectedBets([]);
    };

    // Calculate total
    const total = selectedBets.reduce((sum, bet) => sum + bet.amount, 0);

    // Submit bets
    const submitBets = async () => {
        if (selectedBets.length === 0 || isSubmitting) return;
        setIsSubmitting(true);

        try {
            const { data } = await window.axios.post('/api/bets', {
                lottery_slug: lottery?.slug || 'thai',
                slip_name: slipName || `โพย ${new Date().toLocaleDateString('th-TH')}`,
                credit_type: creditType,
                bets: selectedBets.map(b => ({
                    type_id: b.typeId,
                    number: b.number,
                    amount: parseFloat(b.amount) || 1,
                })),
            });

            if (data.success) {
                setSubmittedTotal(total);
                setShowSuccess(true);
                setShowPriceModal(false);
                setSelectedBets([]); // Clear bets after success
                setSlipName('');
                localStorage.removeItem(cacheKey); // Clear cache after success
            } else {
                // Handle validation errors
                if (data.errors) {
                    const errorMessages = Object.values(data.errors).flat().join('\n');
                    setErrorModal({ show: true, title: 'ข้อมูลไม่ถูกต้อง', message: errorMessages });
                } else if (data.error?.includes('เครดิต')) {
                    setErrorModal({ show: true, title: '💰 เครดิตไม่เพียงพอ', message: `ยอดเครดิตคงเหลือไม่เพียงพอสำหรับการแทง\n\nกรุณาเติมเงินก่อนทำรายการ` });
                } else {
                    setErrorModal({ show: true, title: '❌ เกิดข้อผิดพลาด', message: data.error || data.message || 'ไม่สามารถทำรายการได้' });
                }
            }
        } catch (error) {
            console.error('Submit error:', error);
            const errData = error.response?.data;
            if (errData?.errors) {
                const errorMessages = Object.values(errData.errors).flat().join('\n');
                setErrorModal({ show: true, title: 'ข้อมูลไม่ถูกต้อง', message: errorMessages });
            } else if (errData?.error?.includes('เครดิต')) {
                setErrorModal({ show: true, title: '💰 เครดิตไม่เพียงพอ', message: `ยอดเครดิตคงเหลือไม่เพียงพอสำหรับการแทง\n\nกรุณาเติมเงินก่อนทำรายการ` });
            } else if (error.response?.status === 419) {
                setErrorModal({ show: true, title: '❌ Session หมดอายุ', message: 'กรุณารีเฟรชหน้าเว็บแล้วลองใหม่อีกครั้ง' });
            } else {
                setErrorModal({ show: true, title: '❌ เกิดข้อผิดพลาด', message: errData?.error || errData?.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Keypad Handlers
    const handleKeypadDigit = (digit) => {
        if (keypadDigits.length < category) {
            setKeypadDigits([...keypadDigits, digit]);
        }
    };
    const handleKeypadClear = () => setKeypadDigits([]);
    const handleKeypadDelete = () => setKeypadDigits(prev => prev.slice(0, -1));
    const handleKeypadAdd = () => {
        if (keypadDigits.length === category) {
            addBet(keypadDigits.join(''));
            setKeypadDigits([]);
        }
    };
    // Helper function to add multiple bets at once
    const addMultipleBets = (numbers) => {
        const activeTypes = getActiveTypes();
        setSelectedBets(prev => {
            const newBets = [...prev];
            numbers.forEach(num => {
                activeTypes.forEach(type => {
                    // Check forbidden by bet_type
                    const isForbidden = forbiddenNumbers.some(fn =>
                        fn.number === num && (fn.bet_type_id === null || fn.bet_type_id === type.id)
                    );
                    if (isForbidden) return;
                    const exists = newBets.find(b => b.number === num && b.typeId === type.id);
                    if (!exists) {
                        const isSpecial = specialNumbers.some(sn =>
                            sn.number === num && (sn.bet_type_id === null || sn.bet_type_id === type.id)
                        );
                        let payout = type.payout;
                        if (isSpecial) {
                            const entry = specialNumbers.find(sn =>
                                sn.number === num && sn.bet_type_id === type.id
                            ) || specialNumbers.find(sn =>
                                sn.number === num && sn.bet_type_id === null
                            );
                            const pct = entry?.payout_rate || 50;
                            payout = Math.floor(type.payout * (pct / 100));
                        }
                        newBets.push({
                            number: num,
                            typeId: type.id,
                            typeName: type.name,
                            payout: payout,
                            amount: globalPrice,
                            isSpecial,
                        });
                    }
                });
            });
            return newBets;
        });
    };

    const generateRandom = () => {
        const count = 5;
        const digits = category; // 3 or 2
        const max = category === 3 ? 999 : 99;
        const numbers = [];
        for (let i = 0; i < count; i++) {
            const num = Math.floor(Math.random() * (max + 1)).toString().padStart(digits, '0');
            numbers.push(num);
        }
        addMultipleBets(numbers);
    };
    const generateTong = () => {
        // เฉพาะ 3 ตัว
        if (category !== 3) return;
        const tongNumbers = ['000', '111', '222', '333', '444', '555', '666', '777', '888', '999'];
        addMultipleBets(tongNumbers);
    };
    const generateDouble = () => {
        // เลขเบิ้ล สำหรับ 2 ตัว (00, 11, 22, ...)
        if (category !== 2) return;
        const doubleNumbers = ['00', '11', '22', '33', '44', '55', '66', '77', '88', '99'];
        addMultipleBets(doubleNumbers);
    };
    const generateEven = () => {
        // เลขคู่ สำหรับ 2 ตัว (00, 02, 04, ... 98)
        if (category !== 2) return;
        const numbers = [];
        for (let i = 0; i <= 99; i += 2) {
            numbers.push(i.toString().padStart(2, '0'));
        }
        addMultipleBets(numbers);
    };
    const generateOdd = () => {
        // เลขคี่ สำหรับ 2 ตัว (01, 03, 05, ... 99)
        if (category !== 2) return;
        const numbers = [];
        for (let i = 1; i <= 99; i += 2) {
            numbers.push(i.toString().padStart(2, '0'));
        }
        addMultipleBets(numbers);
    };
    // === 2-digit quick-pick generators ===
    const openDigitModal = (type) => {
        setDigitModalType(type);
        setShowDigitModal(true);
    };
    const handleDigitSelect = (digit) => {
        if (category !== 2) return;
        const d = digit.toString();
        let numbers = [];
        if (digitModalType === 'front') {
            // รูดหน้า: lock หลักสิบ
            for (let i = 0; i <= 9; i++) numbers.push(d + i.toString());
        } else if (digitModalType === 'back') {
            // รูดหลัง: lock หลักหน่วย
            for (let i = 0; i <= 9; i++) numbers.push(i.toString() + d);
        } else if (digitModalType === '19door') {
            // 19ประตู: รูดหน้า + รูดหลัง ตัดซ้ำ
            const set = new Set();
            for (let i = 0; i <= 9; i++) set.add(d + i.toString());
            for (let i = 0; i <= 9; i++) set.add(i.toString() + d);
            numbers = [...set].sort();
        }
        addMultipleBets(numbers.map(n => n.padStart(2, '0')));
        setShowDigitModal(false);
    };
    const generateLowTwo = () => {
        if (category !== 2) return;
        const numbers = [];
        for (let i = 0; i <= 49; i++) numbers.push(i.toString().padStart(2, '0'));
        addMultipleBets(numbers);
    };
    const generateHighTwo = () => {
        if (category !== 2) return;
        const numbers = [];
        for (let i = 50; i <= 99; i++) numbers.push(i.toString().padStart(2, '0'));
        addMultipleBets(numbers);
    };
    const generateBothEven = () => {
        // สองตัวคู่ / เลขคู่คู่: ทั้ง 2 หลักเป็นคู่
        if (category !== 2) return;
        const numbers = [];
        for (let i = 0; i <= 99; i++) {
            const tens = Math.floor(i / 10), units = i % 10;
            if (tens % 2 === 0 && units % 2 === 0) numbers.push(i.toString().padStart(2, '0'));
        }
        addMultipleBets(numbers);
    };
    const generateBothOdd = () => {
        // สองตัวคี่ / เลขคี่คี่: ทั้ง 2 หลักเป็นคี่
        if (category !== 2) return;
        const numbers = [];
        for (let i = 0; i <= 99; i++) {
            const tens = Math.floor(i / 10), units = i % 10;
            if (tens % 2 === 1 && units % 2 === 1) numbers.push(i.toString().padStart(2, '0'));
        }
        addMultipleBets(numbers);
    };
    const generateSiblings = () => {
        // พี่น้อง: หลักสิบ < หลักหน่วย
        if (category !== 2) return;
        const numbers = [];
        for (let i = 0; i <= 99; i++) {
            const tens = Math.floor(i / 10), units = i % 10;
            if (tens < units) numbers.push(i.toString().padStart(2, '0'));
        }
        addMultipleBets(numbers);
    };
    const generateReverseSiblings = () => {
        // น้องพี่: หลักสิบ > หลักหน่วย
        if (category !== 2) return;
        const numbers = [];
        for (let i = 0; i <= 99; i++) {
            const tens = Math.floor(i / 10), units = i % 10;
            if (tens > units) numbers.push(i.toString().padStart(2, '0'));
        }
        addMultipleBets(numbers);
    };
    const generateEvenOdd = () => {
        // เลขคู่คี่: หลักสิบคู่ + หลักหน่วยคี่
        if (category !== 2) return;
        const numbers = [];
        for (let i = 0; i <= 99; i++) {
            const tens = Math.floor(i / 10), units = i % 10;
            if (tens % 2 === 0 && units % 2 === 1) numbers.push(i.toString().padStart(2, '0'));
        }
        addMultipleBets(numbers);
    };
    const generateAll00to99 = () => {
        if (category !== 2) return;
        const numbers = [];
        for (let i = 0; i <= 99; i++) numbers.push(i.toString().padStart(2, '0'));
        addMultipleBets(numbers);
    };
    const applyGlobalPrice = () => {
        setSelectedBets(prev => prev.map(bet => ({ ...bet, amount: globalPrice })));
    };


    // Country flag mapping
    const flagMap = {
        'thai': '🇹🇭', 'gsb-1': '🇹🇭', 'gsb-2': '🇹🇭', 'baac': '🇹🇭',
        'lao': '🇱🇦', 'lao-hd': '🇱🇦', 'lao-star': '🇱🇦', 'lao-red': '🇱🇦', 'lao-samakkhi': '🇱🇦', 'lao-pattana': '🇱🇦', 'lao-asean': '🇱🇦',
        'hanoi': '🇻🇳', 'hanoi-vip': '🇻🇳', 'hanoi-special': '🇻🇳',
        'malay': '🇲🇾',
        'nikkei': '🇯🇵', 'hang-seng': '🇭🇰', 'china': '🇨🇳', 'taiwan': '🇹🇼', 'korea': '🇰🇷',
        'india': '🇮🇳', 'singapore': '🇸🇬', 'thai-stock': '🇹🇭',
        'russia': '🇷🇺', 'uk': '🇬🇧', 'germany': '🇩🇪', 'dowjones': '🇺🇸',
    };
    const flag = flagMap[lottery?.slug] || '🎰';

    return (
        <MainLayout>
            <Head title={`แทง${lottery?.name || 'หวย'}`} />

            <div className="flex flex-row h-full min-h-[calc(100vh-140px)] bg-[#0a1628] text-white">

                {/* Left Sidebar — always visible */}
                <div className="w-[140px] sm:w-48 lg:w-56 xl:w-64 bg-[#0d1b30] shadow-2xl flex flex-col flex-shrink-0 border-r border-[#1a2d4a]">
                    {/* Sidebar Buttons */}
                    <div className="p-1.5 flex flex-col gap-1 lg:p-3 lg:space-y-1.5 lg:gap-0">
                        <button
                            onClick={() => router.visit('/')}
                            className="flex-shrink-0 lg:flex-none py-2 px-2.5 lg:py-2.5 lg:px-3 bg-[#0f2340] rounded-lg text-white text-xs lg:text-sm font-medium hover:bg-[#162d52] flex items-center justify-center gap-1 lg:gap-1.5 border border-[#1a3a5c] transition-all"
                        >
                            <ChevronLeft size={13} className="lg:w-[15px] lg:h-[15px]" /> <span className="hidden sm:inline">ย้อนกลับ</span>
                        </button>
                        <button
                            onClick={() => setShowRulesModal(true)}
                            className="flex-shrink-0 lg:flex-none py-2 px-2.5 lg:py-2.5 lg:px-3 bg-[#0f2340] rounded-lg text-emerald-400 text-xs lg:text-sm font-medium hover:bg-[#162d52] flex items-center justify-center gap-1 lg:gap-1.5 border border-[#1a3a5c] transition-all"
                        >
                            <BookOpen size={13} className="lg:w-[15px] lg:h-[15px]" /> <span className="hidden sm:inline">กติกา</span>
                        </button>
                        <button
                            onClick={() => setShowResultModal(true)}
                            className="flex-shrink-0 lg:flex-none py-2 px-2.5 lg:py-2.5 lg:px-3 bg-[#0f2340] rounded-lg text-[#4fc3f7] text-xs lg:text-sm font-medium hover:bg-[#162d52] flex items-center justify-center gap-1 lg:gap-1.5 border border-[#1a3a5c] transition-all"
                        >
                            <Calendar size={13} className="lg:w-[15px] lg:h-[15px]" /> <span className="hidden sm:inline">ผลรางวัล</span>
                        </button>
                        <button
                            onClick={() => setShowPriceModal(true)}
                            disabled={selectedBets.length === 0}
                            className="flex-shrink-0 lg:flex-none py-2 px-2.5 lg:py-2.5 lg:px-3 bg-gradient-to-r from-[#d4a017] to-[#c49000] rounded-lg text-black font-bold text-xs lg:text-sm flex items-center justify-center gap-1 lg:gap-1.5 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 disabled:opacity-40 transition-all"
                        >
                            <List size={13} className="lg:w-[15px] lg:h-[15px]" /> ใส่ราคา {selectedBets.length > 0 && `(${selectedBets.length})`}
                        </button>
                    </div>

                    {/* Bet List Header */}
                    <div className="flex px-2 lg:px-3 py-1.5 lg:py-2.5 bg-[#081424] justify-between items-center mx-1 lg:mx-2 my-1 rounded-lg border border-[#1a2d4a]">
                        <span className="text-[#d4a017] font-bold text-[10px] lg:text-sm">📋 ({selectedBets.length})</span>
                        <button onClick={clearAll} className="text-gray-500 text-xs hover:text-red-400 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-500/10 transition-all">
                            <Trash2 size={11} /> ล้าง
                        </button>
                    </div>

                    {/* Bet List */}
                    <div className="flex-1 overflow-y-auto p-1 lg:p-2 space-y-1 min-h-0">
                        {selectedBets.length === 0 ? (
                            <div className="text-center py-4 lg:py-8 text-gray-600 text-[10px] lg:text-xs">
                                เลือกเลขจากแผงขวา
                            </div>
                        ) : (
                            selectedBets.map((bet, i) => (
                                <div key={i} className="flex justify-between items-center bg-[#0f2340] p-1.5 lg:p-2.5 rounded-lg border-l-2 lg:border-l-3 border-l-[#d4a017] border border-[#1a3a5c] hover:bg-[#132a4a] transition-all">
                                    <div className="flex items-center gap-1 lg:gap-2 min-w-0">
                                        <span className="text-white font-bold text-xs lg:text-base">{bet.number}</span>
                                        <span className="text-[#d4a017] text-[8px] lg:text-[10px] truncate">{bet.typeName}</span>
                                    </div>
                                    <button onClick={() => removeBet(i)} className="text-gray-600 hover:text-red-400 p-0.5 flex-shrink-0">
                                        <Trash2 size={11} className="lg:w-[13px] lg:h-[13px]" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Total Footer */}
                    {selectedBets.length > 0 && (
                        <div className="px-2 lg:px-3 py-1.5 lg:py-2 bg-[#081424] border-t border-[#1a2d4a] text-center">
                            <span className="text-gray-400 text-[10px] lg:text-xs">{selectedBets.length} รายการ</span>
                            <button
                                onClick={() => setShowPriceModal(true)}
                                className="mt-1 w-full px-2 py-1.5 bg-gradient-to-r from-[#d4a017] to-[#c49000] text-black font-bold text-[10px] lg:text-xs rounded-lg shadow-lg shadow-amber-500/20 lg:hidden"
                            >
                                ใส่ราคา →
                            </button>
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col bg-[#0e1e35] overflow-hidden">

                    {/* Top Header Bar — Combined compact */}
                    <div className="bg-gradient-to-r from-[#0d1b30] to-[#0f2340] px-2.5 py-2 flex justify-between items-center border-b border-[#1a2d4a]">
                        <div className="flex items-center gap-1.5">
                            <Clock size={13} className="text-[#4fc3f7]" />
                            <span className="text-white text-xs sm:text-sm font-mono">{timeLeft}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-white font-bold text-xs sm:text-sm">{lottery?.name}</span>
                            <span className="text-gray-500 text-[9px] sm:text-[10px]">งวดประจำวันที่ : {new Date(lottery?.draw_time).toLocaleDateString('th-TH')}</span>
                        </div>
                    </div>

                    {/* Lottery Name Bar with Flag */}
                    <div className="bg-[#0a1628] px-2.5 py-1.5 flex items-center gap-1.5 border-b border-[#1a2d4a]">
                        <span className="text-lg">{flag}</span>
                        <span className="text-white font-bold text-xs sm:text-sm">{lottery?.name}</span>
                        <button
                            onClick={() => setShowResultModal(true)}
                            className="ml-auto px-2 py-1 bg-[#1b6b3a] text-green-200 text-[10px] sm:text-xs rounded font-medium hover:bg-[#1f7d44] transition-all flex items-center gap-1"
                        >
                            🏆 <span className="hidden sm:inline">ผลการออกรางวัลล่าสุด</span><span className="sm:hidden">ผลรางวัล</span>
                        </button>
                    </div>

                    {/* Mode Tabs (2 tabs) */}
                    <div className="grid grid-cols-2 bg-[#0d1b30] border-b border-[#1a2d4a]">
                        <button
                            onClick={() => setMode('panel')}
                            className={`py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all ${mode === 'panel' ? 'text-[#d4a017] border-[#d4a017] bg-[#0a1628]' : 'text-gray-500 border-transparent hover:bg-[#0f2340] hover:text-gray-300'}`}
                        >
                            เลือกจากแผง
                        </button>
                        <button
                            onClick={() => setMode('keypad')}
                            className={`py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all ${mode === 'keypad' ? 'text-[#d4a017] border-[#d4a017] bg-[#0a1628]' : 'text-gray-500 border-transparent hover:bg-[#0f2340] hover:text-gray-300'}`}
                        >
                            กดเลขเอง
                        </button>
                    </div>

                    {/* Credit Type Toggle (shows only if user has bonus credit) */}
                    {(auth?.user?.bonus_credit > 0) && (
                        <div className="flex gap-1 px-2 py-1.5 bg-[#050e1a] border-b border-[#1a2d4a]">
                            <button
                                onClick={() => setCreditType('real')}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${creditType === 'real'
                                    ? 'bg-emerald-600/30 border-emerald-500/60 text-emerald-300'
                                    : 'bg-[#0f2340] border-[#1a3a5c] text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                ฿ เครดิตจริง
                            </button>
                            <button
                                onClick={() => setCreditType('bonus')}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${creditType === 'bonus'
                                    ? 'bg-purple-600/30 border-purple-500/60 text-purple-300'
                                    : 'bg-[#0f2340] border-[#1a3a5c] text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                ✨ โบนัส
                            </button>
                        </div>
                    )}

                    {/* Category Tabs (③ สามตัว / ② สองตัว / ① เลขวิ่ง) */}
                    <div className="flex gap-1.5 p-2 sm:p-2.5 bg-[#0a1628] border-b border-[#1a2d4a]">
                        {availableCategories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCategory(cat)}
                                className={`flex-1 flex items-center justify-center gap-1 py-2 sm:py-2.5 rounded-full border text-xs sm:text-sm font-bold transition-all ${category === cat
                                    ? 'bg-[#d4a017] text-black border-[#d4a017] shadow-lg shadow-amber-500/20'
                                    : 'bg-[#0f2340] text-gray-400 border-[#1a3a5c] hover:border-[#2a4a6c] hover:text-gray-200'
                                    }`}
                            >
                                <span className={`w-4 h-4 sm:w-5 sm:h-5 inline-flex items-center justify-center rounded-full text-[9px] sm:text-[10px] font-black ${category === cat ? 'bg-red-600 text-white' : 'bg-[#1a3a5c] text-gray-300'
                                    }`}>
                                    {cat}
                                </span>
                                {cat === 4 ? 'สี่ตัว' : cat === 3 ? 'สามตัว' : cat === 2 ? 'สองตัว' : 'เลขวิ่ง'}
                            </button>
                        ))}
                    </div>

                    {/* Sub-type Buttons */}
                    <div className="flex gap-1 sm:gap-2 p-2 sm:p-2.5 bg-[#0a1628] border-b border-[#1a2d4a] overflow-x-auto">

                        {/* Bet Type Buttons — multi-select for 3-digit and 2-digit, single-select for others */}
                        {BET_TYPES[category].map(type => {
                            const isActive = (category === 3 || category === 2)
                                ? selectedTypes.some(t => t.id === type.id)
                                : selectedType.id === type.id;
                            return (
                                <button
                                    key={type.id}
                                    onClick={() => (category === 3 || category === 2) ? toggleType(type) : setSelectedType(type)}
                                    className={`flex-1 min-w-0 py-1.5 sm:py-2 px-1.5 sm:px-2 rounded-lg flex flex-col items-center justify-center transition-all text-[10px] sm:text-xs font-bold ${isActive
                                        ? 'bg-gradient-to-b from-[#d4a017] to-[#b08600] text-black shadow-lg shadow-amber-500/30'
                                        : 'bg-[#0f2340] text-gray-300 border border-[#d4a017]/40 hover:bg-[#162d52] hover:border-[#d4a017]/70'
                                        }`}
                                >
                                    <span className="truncate w-full text-center">
                                        {(category === 3 || category === 2) && <span className="mr-0.5">{isActive ? '☑' : '☐'}</span>}
                                        {type.name}
                                    </span>
                                    <span className={`text-[8px] sm:text-[9px] mt-0.5 ${isActive ? 'text-black/60' : 'text-[#d4a017]'}`}>
                                        จ่าย {type.payout.toFixed(0)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Options Bar */}
                    {mode === 'panel' && (
                        <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-[#0a1628] border-b border-[#1a2d4a] overflow-x-auto">
                            {category !== 1 && (
                                <label className="flex items-center gap-1 sm:gap-1.5 cursor-pointer select-none flex-shrink-0" onClick={() => setReverseEnabled(!reverseEnabled)}>
                                    <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded border flex items-center justify-center transition-all ${reverseEnabled ? 'bg-[#d4a017] border-[#d4a017]' : 'bg-transparent border-gray-600'}`}>
                                        {reverseEnabled && <Check size={8} className="text-black sm:w-[10px] sm:h-[10px]" />}
                                    </div>
                                    <span className="text-gray-400 text-[10px] sm:text-xs whitespace-nowrap">กลับตัวเลข</span>
                                </label>
                            )}

                            {category !== 1 && (
                                <button onClick={generateRandom} className="px-2 sm:px-3 py-1 sm:py-1.5 bg-[#0f2340] border border-[#1a3a5c] rounded text-gray-300 text-[10px] sm:text-xs hover:bg-[#162d52] hover:text-white transition-all whitespace-nowrap flex-shrink-0">
                                    สุ่ม 5 เลข
                                </button>
                            )}

                            {category === 3 && (
                                <button onClick={generateTong} className="px-2 sm:px-3 py-1 sm:py-1.5 bg-[#0f2340] border border-[#1a3a5c] rounded text-gray-300 text-[10px] sm:text-xs hover:bg-[#162d52] hover:text-white transition-all whitespace-nowrap flex-shrink-0">
                                    เลขตอง
                                </button>
                            )}

                            {category === 2 && (
                                <>
                                    <button onClick={generateDouble} className="px-2 sm:px-3 py-1 sm:py-1.5 bg-[#0f2340] border border-[#1a3a5c] rounded text-gray-300 text-[10px] sm:text-xs hover:bg-[#162d52] hover:text-white transition-all whitespace-nowrap flex-shrink-0">
                                        เลขเบิ้ล
                                    </button>
                                    <button onClick={generateEven} className="px-2 sm:px-3 py-1 sm:py-1.5 bg-[#0f2340] border border-[#1a3a5c] rounded text-gray-300 text-[10px] sm:text-xs hover:bg-[#162d52] hover:text-white transition-all whitespace-nowrap flex-shrink-0">
                                        เลขคู่
                                    </button>
                                    <button onClick={generateOdd} className="px-2 sm:px-3 py-1 sm:py-1.5 bg-[#0f2340] border border-[#1a3a5c] rounded text-gray-300 text-[10px] sm:text-xs hover:bg-[#162d52] hover:text-white transition-all whitespace-nowrap flex-shrink-0">
                                        เลขคี่
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* 2-Digit Quick-Pick Section */}
                    {category === 2 && mode === 'panel' && (
                        <div className="bg-[#0a1628] border-b border-[#1a2d4a] px-2 sm:px-3 py-2">
                            <p className="text-center text-gray-300 text-xs sm:text-sm font-bold mb-2">ตัวเลือกเพิ่มเติม 2 ตัว</p>
                            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                                <button onClick={() => openDigitModal('front')} className="py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 transition-all shadow-md">
                                    รูดหน้า
                                </button>
                                <button onClick={() => openDigitModal('back')} className="py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 transition-all shadow-md">
                                    รูดหลัง
                                </button>
                                <button onClick={() => openDigitModal('19door')} className="py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-300 hover:to-orange-400 transition-all shadow-md">
                                    19ประตู
                                </button>
                                <button onClick={generateDouble} className="py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-red-400 to-red-500 hover:from-red-300 hover:to-red-400 transition-all shadow-md">
                                    เลขเบิ้ล
                                </button>
                                <button onClick={generateLowTwo} className="py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 transition-all shadow-md">
                                    สองตัวต่ำ
                                </button>
                                <button onClick={generateHighTwo} className="py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 transition-all shadow-md">
                                    สองตัวสูง
                                </button>
                                <button onClick={generateBothEven} className="py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 transition-all shadow-md">
                                    สองตัวคู่
                                </button>
                                <button onClick={generateBothOdd} className="py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 transition-all shadow-md">
                                    สองตัวคี่
                                </button>
                                <button onClick={generateSiblings} className="py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 transition-all shadow-md">
                                    พี่น้อง
                                </button>
                                <button onClick={generateReverseSiblings} className="py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 transition-all shadow-md">
                                    น้องพี่
                                </button>
                                <button onClick={generateBothOdd} className="py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-400 hover:to-gray-500 transition-all shadow-md">
                                    เลขคี่คี่
                                </button>
                                <button onClick={generateBothEven} className="py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 transition-all shadow-md">
                                    เลขคู่คู่
                                </button>
                                <button onClick={generateEvenOdd} className="py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-400 hover:to-gray-500 transition-all shadow-md">
                                    เลขคู่คี่
                                </button>
                                <button onClick={generateAll00to99} className="py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 transition-all shadow-md">
                                    เลข 00-99
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Range Selector Tabs (for 3 or 4 digits) */}
                    {(category === 3 || category === 4) && mode === 'panel' && (
                        <div className="flex gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-1.5 sm:py-2 bg-[#081424] border-b border-[#1a2d4a] overflow-x-auto scrollbar-hide">
                            {(category === 4
                                ? [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900]
                                : [0, 100, 200, 300, 400, 500, 600, 700, 800, 900]
                            ).map(range => (
                                <button
                                    key={range}
                                    onClick={() => setRangeStart(range)}
                                    className={`min-w-7 sm:min-w-9 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${rangeStart === range
                                        ? 'bg-[#d4a017] text-black shadow-md'
                                        : 'bg-[#0f2340] text-gray-500 border border-[#1a3a5c] hover:bg-[#162d52] hover:text-gray-300'
                                        }`}
                                >
                                    {range.toString().padStart(category, '0')}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Main Content Area */}
                    <div className="flex-1 overflow-y-auto bg-[#081424]">
                        {mode === 'panel' ? (
                            /* ===== PANEL MODE (Number Grid) ===== */
                            <div className="grid grid-cols-5 gap-px p-0.5 sm:p-2">
                                {numbers.map(num => {
                                    const activeTypes = getActiveTypes();
                                    const isSelected = selectedBets.some(b => b.number === num && activeTypes.some(t => t.id === b.typeId));
                                    const isForbidden = forbiddenNumbers.some(fn => fn.number === num && (fn.bet_type_id === null || activeTypes.some(t => t.id === fn.bet_type_id)));
                                    const isSpecial = specialNumbers.some(sn => sn.number === num && (sn.bet_type_id === null || activeTypes.some(t => t.id === sn.bet_type_id)));

                                    return (
                                        <button
                                            key={num}
                                            onClick={() => addBet(num)}
                                            disabled={isForbidden}
                                            className={`
                                                h-9 sm:h-11 rounded text-xs sm:text-base font-bold transition-all
                                                ${isForbidden
                                                    ? 'bg-[#1a1a2e] text-gray-700 cursor-not-allowed line-through'
                                                    : isSelected
                                                        ? 'bg-[#d4a017] text-black shadow-md shadow-amber-500/30'
                                                        : isSpecial
                                                            ? 'bg-[#0f2340] text-orange-400 hover:bg-[#162d52] border border-orange-500/30'
                                                            : 'bg-[#0f2340] text-gray-300 hover:bg-[#162d52] hover:text-white'
                                                }
                                            `}
                                        >
                                            {num}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            /* ===== KEYPAD MODE ===== */
                            <div className="flex flex-col items-center justify-start p-4 min-h-[400px]">
                                {/* Flag + Category Label */}
                                <div className="flex items-center gap-2 mb-4 self-start">
                                    <span className="text-2xl">{flag}</span>
                                    <span className="text-white font-bold">
                                        {category === 4 ? '4 สี่ตัว' : category === 3 ? '3 สามตัว' : '2 สองตัว'}
                                    </span>
                                    <label className="flex items-center gap-1.5 ml-auto cursor-pointer select-none" onClick={() => setReverseEnabled(!reverseEnabled)}>
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${reverseEnabled ? 'bg-[#d4a017] border-[#d4a017]' : 'bg-transparent border-gray-600'}`}>
                                            {reverseEnabled && <Check size={10} className="text-black" />}
                                        </div>
                                        <span className="text-gray-400 text-xs">กลับตัวเลข</span>
                                    </label>
                                </div>

                                {/* Digit Label */}
                                <p className="text-gray-400 text-sm mb-3">กรอกหมายเลข</p>

                                {/* Digit Indicator Boxes */}
                                <div className="flex gap-3 mb-6">
                                    {Array.from({ length: category }).map((_, i) => (
                                        <div
                                            key={i}
                                            className={`w-14 h-16 rounded-lg flex items-center justify-center text-3xl font-black border-2 transition-all ${keypadDigits[i] !== undefined
                                                ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-500/30'
                                                : i === keypadDigits.length
                                                    ? 'bg-[#1a2d4a] border-[#d4a017] text-gray-600 animate-pulse'
                                                    : 'bg-[#0f2340] border-[#1a3a5c] text-gray-700'
                                                }`}
                                        >
                                            {keypadDigits[i] ?? ''}
                                        </div>
                                    ))}
                                </div>

                                {/* Number Pad */}
                                <div className="grid grid-cols-3 gap-2 max-w-xs w-full">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                                        <button
                                            key={n}
                                            onClick={() => {
                                                if (keypadDigits.length < category) {
                                                    const newDigits = [...keypadDigits, n.toString()];
                                                    setKeypadDigits(newDigits);
                                                    if (newDigits.length === category) {
                                                        addBet(newDigits.join(''));
                                                        setTimeout(() => setKeypadDigits([]), 200);
                                                    }
                                                }
                                            }}
                                            className="h-16 bg-[#1a2d4a] border border-[#2a3d5a] rounded-xl text-2xl font-bold text-white hover:bg-[#243d5a] active:bg-[#d4a017] active:text-black transition-all shadow-md"
                                        >
                                            {n}
                                        </button>
                                    ))}
                                    {/* Bottom row: ล้างข้อมูล, 0, Delete */}
                                    <button
                                        onClick={() => setKeypadDigits([])}
                                        className="h-16 bg-[#0f2340] border border-[#1a3a5c] rounded-xl text-xs font-bold text-[#4fc3f7] hover:bg-[#162d52] transition-all"
                                    >
                                        ล้างข้อมูล
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (keypadDigits.length < category) {
                                                const newDigits = [...keypadDigits, '0'];
                                                setKeypadDigits(newDigits);
                                                if (newDigits.length === category) {
                                                    addBet(newDigits.join(''));
                                                    setTimeout(() => setKeypadDigits([]), 200);
                                                }
                                            }
                                        }}
                                        className="h-16 bg-[#1a2d4a] border border-[#2a3d5a] rounded-xl text-2xl font-bold text-white hover:bg-[#243d5a] active:bg-[#d4a017] active:text-black transition-all shadow-md"
                                    >
                                        0
                                    </button>
                                    <button
                                        onClick={() => setKeypadDigits(prev => prev.slice(0, -1))}
                                        className="h-16 bg-red-700/80 border border-red-600 rounded-xl text-white font-bold hover:bg-red-600 transition-all flex items-center justify-center"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>


                </div>

            </div>

            {/* ===== DIGIT SELECT MODAL (for รูดหน้า / รูดหลัง / 19ประตู) ===== */}
            {showDigitModal && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowDigitModal(false)}>
                    <div className="bg-[#0d1b30] border border-[#1a3a5c] rounded-2xl w-full max-w-xs overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-[#d4a017] to-[#c49000] p-3 text-black font-bold flex justify-between items-center">
                            <span>
                                {digitModalType === 'front' ? '🎯 รูดหน้า — เลือกเลขหลักสิบ' :
                                    digitModalType === 'back' ? '🎯 รูดหลัง — เลือกเลขหลักหน่วย' :
                                        '🎯 19ประตู — เลือกเลข'}
                            </span>
                            <button onClick={() => setShowDigitModal(false)} className="hover:bg-black/10 rounded-full p-1"><X size={18} /></button>
                        </div>
                        <div className="p-4">
                            <p className="text-gray-400 text-xs text-center mb-3">
                                {digitModalType === 'front' ? 'เลือกเลข 1 ตัว → จะได้ 10 เลข (X0-X9)' :
                                    digitModalType === 'back' ? 'เลือกเลข 1 ตัว → จะได้ 10 เลข (0X-9X)' :
                                        'เลือกเลข 1 ตัว → จะได้ 19 เลข (รูดหน้า+รูดหลัง)'}
                            </p>
                            <div className="grid grid-cols-5 gap-2">
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
                                    <button
                                        key={d}
                                        onClick={() => handleDigitSelect(d)}
                                        className="h-12 bg-[#1a2d4a] border border-[#2a3d5a] rounded-xl text-xl font-bold text-white hover:bg-[#243d5a] active:bg-[#d4a017] active:text-black transition-all shadow-md"
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== PRICE MODAL ===== */}
            {showPriceModal && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 sm:p-4">
                    <div className="bg-[#0d1b30] border border-[#1a3a5c] rounded-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh]">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-[#d4a017] to-[#c49000] p-3 text-black font-bold flex justify-between items-center">
                            <span>💰 ใส่ราคา • {selectedBets.length} รายการ</span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm bg-black/20 px-2 py-0.5 rounded">💳 {Math.floor(Number(auth?.user?.credit || 0)).toLocaleString()} ฿</span>
                                <button onClick={() => setShowPriceModal(false)} className="hover:bg-black/10 rounded-full p-1"><X size={20} /></button>
                            </div>
                        </div>

                        {/* Price Controls */}
                        <div className="p-3 border-b border-[#1a2d4a] bg-[#0a1628]">
                            <div className="flex gap-2 items-center mb-2">
                                <label className="text-gray-400 text-xs whitespace-nowrap">ราคาทั้งหมด:</label>
                                <input
                                    type="number"
                                    value={globalPrice}
                                    onChange={e => setGlobalPrice(Number(e.target.value))}
                                    className="flex-1 bg-[#081424] border border-[#1a3a5c] rounded-lg p-2 text-white text-center font-bold text-lg focus:border-[#d4a017] outline-none"
                                />
                                <button onClick={applyGlobalPrice} className="bg-[#d4a017] text-black px-4 py-2 rounded-lg hover:brightness-110 font-bold text-sm">นำไปใช้</button>
                            </div>
                            <div className="grid grid-cols-6 gap-1.5">
                                {[5, 10, 20, 50, 100, 200].map(bg => (
                                    <button key={bg} onClick={() => { setGlobalPrice(bg); setSelectedBets(prev => prev.map(bet => ({ ...bet, amount: bg }))); }} className={`py-2 rounded-lg text-xs font-bold transition-all ${globalPrice === bg ? 'bg-[#d4a017] text-black' : 'bg-[#0f2340] border border-[#1a3a5c] text-gray-300 hover:bg-[#162d52] hover:text-[#d4a017]'}`}>
                                        {bg} ฿
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Slip Name */}
                        <div className="px-3 py-2 border-b border-[#1a2d4a] bg-[#0a1628]">
                            <input
                                type="text"
                                placeholder={`ชื่อโพย: โพย ${new Date().toLocaleDateString('th-TH')}`}
                                value={slipName}
                                onChange={e => setSlipName(e.target.value)}
                                maxLength={100}
                                className="w-full bg-[#081424] border border-[#1a3a5c] rounded-lg p-2 text-white text-sm focus:border-[#d4a017] outline-none placeholder-gray-600"
                            />
                        </div>

                        {/* Table Header */}
                        <div className="grid grid-cols-[28px_1fr_60px_52px_70px_28px] gap-1 px-3 py-2 bg-[#081424] border-b border-[#1a2d4a] text-[10px] text-gray-500 font-bold uppercase">
                            <span>#</span>
                            <span>ประเภท / เลข</span>
                            <span className="text-center">จ่าย</span>
                            <span className="text-center">ราคา</span>
                            <span className="text-right">ชนะได้</span>
                            <span></span>
                        </div>

                        {/* Bet List */}
                        <div className="flex-1 overflow-y-auto">
                            {selectedBets.map((bet, i) => {
                                const winAmount = bet.amount * bet.payout;
                                return (
                                    <div key={i} className={`grid grid-cols-[28px_1fr_60px_52px_70px_28px] gap-1 items-center px-3 py-2 border-b border-[#0a1628] ${i % 2 === 0 ? 'bg-[#0d1b30]' : 'bg-[#0f1f35]'} hover:bg-[#132a4a] transition-colors`}>
                                        <span className="text-gray-600 text-xs">{i + 1}.</span>
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-[#d4a017] font-black text-base">{bet.number}</span>
                                            <span className="text-gray-500 text-[10px] truncate">{bet.typeName}</span>
                                            {bet.isReversed && <span className="text-[8px] bg-yellow-500/20 text-yellow-400 px-1 rounded flex-shrink-0">กลับ</span>}
                                            {bet.isSpecial && <span className="text-[8px] bg-orange-500/20 text-orange-400 px-1 rounded flex-shrink-0">อั้น</span>}
                                        </div>
                                        <span className="text-center text-cyan-400 text-xs font-medium">x{bet.payout}</span>
                                        <input
                                            type="number"
                                            value={bet.amount}
                                            onChange={e => {
                                                const val = Number(e.target.value);
                                                setSelectedBets(prev => {
                                                    const newArr = [...prev];
                                                    newArr[i].amount = val;
                                                    return newArr;
                                                })
                                            }}
                                            className="w-full bg-[#081424] border border-[#1a3a5c] rounded p-1 text-center text-white text-xs focus:border-[#d4a017] outline-none"
                                        />
                                        <span className="text-right text-green-400 text-xs font-bold">{winAmount.toLocaleString()}</span>
                                        <button onClick={() => removeBet(i)} className="text-gray-600 hover:text-red-400 p-0.5 transition-colors">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Summary Footer */}
                        <div className="p-3 bg-[#081424] border-t border-[#1a2d4a] space-y-2">
                            {/* Stats Row */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-[#d4a017]/10 border border-[#d4a017]/30 rounded-lg p-2 text-center">
                                    <div className="text-gray-400 text-[10px]">ยอดแทงรวม</div>
                                    <div className="text-[#d4a017] font-black text-lg">{total.toLocaleString()} ฿</div>
                                </div>
                                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 text-center">
                                    <div className="text-gray-400 text-[10px]">ถ้าถูกทั้งหมดจะได้</div>
                                    <div className="text-green-400 font-black text-lg">{selectedBets.reduce((sum, b) => sum + (b.amount * b.payout), 0).toLocaleString()} ฿</div>
                                </div>
                            </div>

                            {/* Balance Info */}
                            <div className="flex justify-between items-center text-xs bg-[#0f2340] rounded-lg p-2 border border-[#1a3a5c]">
                                <div className="flex items-center gap-3">
                                    <span className="text-gray-400">💳 เครดิตปัจจุบัน: <span className="text-white font-bold">{Math.floor(Number(auth?.user?.credit || 0)).toLocaleString()} ฿</span></span>
                                </div>
                                <div>
                                    <span className="text-gray-400">คงเหลือหลังแทง: </span>
                                    <span className={`font-bold ${(auth?.user?.credit || 0) - total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {Math.floor(Number((auth?.user?.credit || 0) - total)).toLocaleString()} ฿
                                    </span>
                                </div>
                            </div>

                            {/* Insufficient balance warning */}
                            {(auth?.user?.credit || 0) < total && (
                                <div className="text-center text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                                    ⚠️ เครดิตไม่เพียงพอ กรุณาเติมเงินก่อนทำรายการ
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                onClick={submitBets}
                                disabled={isSubmitting || (auth?.user?.credit || 0) < total}
                                className="w-full py-3 bg-gradient-to-r from-[#d4a017] to-[#b08600] text-black font-bold rounded-xl text-lg hover:brightness-110 disabled:opacity-50 shadow-lg shadow-amber-500/30 transition-all"
                            >
                                {isSubmitting ? 'กำลังบันทึก...' : `✅ ยืนยันการแทง • ${total.toLocaleString()} ฿`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== CHECK REWARD MODAL ===== */}
            {showResultModal && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-[#fff] rounded-xl w-full max-w-5xl max-h-[90vh] overflow-auto">
                        <div className="p-4 flex justify-between items-center relative">
                            <h2 className="text-xl font-bold text-black w-full text-center">
                                {lottery?.slug === 'thai' ? 'ตรวจสลาก' : 'ผลการออกรางวัลทั้งหมด'}
                            </h2>
                            <button onClick={() => setShowResultModal(false)} className="absolute right-4 top-4 text-red-500 hover:bg-red-50 rounded-full p-1"><X size={24} /></button>
                        </div>

                        <div className="p-4 space-y-4">
                            {lottery?.slug === 'thai' ? (
                                <>
                                    <div className="flex justify-between items-center mb-4">
                                        <select
                                            value={checkDate}
                                            onChange={(e) => setCheckDate(e.target.value)}
                                            className="border border-gray-300 rounded px-3 py-1.5 w-48 text-black bg-white"
                                        >
                                            {availableDates.length === 0 ? (
                                                <option value="">ไม่มีข้อมูล</option>
                                            ) : (
                                                availableDates.map((d, i) => (
                                                    <option key={i} value={d}>
                                                        {new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                        <span className="text-sm font-bold text-black">รางวัลต่อ 1 THB</span>
                                    </div>

                                    {isLoadingResult ? (
                                        <div className="text-center py-20 text-gray-500">กำลังโหลด...</div>
                                    ) : checkResult ? (
                                        <div className="space-y-4">
                                            <div className="bg-[#f4e04d] p-3 rounded text-center shadow-sm border border-yellow-400">
                                                <div className="font-bold text-black text-sm">รางวัลที่ 1</div>
                                                <div className="text-black text-xs mb-1">รางวัลละ 6,000,000 THB</div>
                                                <div className="text-4xl font-bold text-black tracking-widest">{checkResult.first_prize || '-'}</div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                <div className="bg-[#f4e04d] p-3 rounded text-center shadow-sm border border-yellow-400">
                                                    <div className="font-bold text-black text-xs">เลขท้าย 2 ตัว</div>
                                                    <div className="text-black text-[10px] mb-1">รางวัลละ 2,000 THB</div>
                                                    <div className="text-2xl font-bold text-black tracking-widest">{checkResult.two_bottom || '-'}</div>
                                                </div>
                                                <div className="bg-[#f4e04d] p-3 rounded text-center shadow-sm border border-yellow-400">
                                                    <div className="font-bold text-black text-xs">เลขท้าย 3 ตัว</div>
                                                    <div className="text-black text-[10px] mb-1">รางวัลละ 4,000 THB</div>
                                                    <div className="text-2xl font-bold text-black tracking-widest">{checkResult.three_bottom || '-'}</div>
                                                </div>
                                                <div className="bg-[#f4e04d] p-3 rounded text-center shadow-sm border border-yellow-400">
                                                    <div className="font-bold text-black text-xs">รางวัลข้างเคียงรางวัลที่ 1</div>
                                                    <div className="text-black text-[10px] mb-1">รางวัลละ 100,000 THB</div>
                                                    <div className="text-lg font-bold text-black flex flex-col items-center">
                                                        {checkResult.details?.near1?.map((n, i) => <span key={i}>{n}</span>) || '-'}
                                                    </div>
                                                </div>
                                            </div>

                                            {checkResult.details?.second && checkResult.details.second.length > 0 && (
                                                <>
                                                    <div>
                                                        <div className="bg-[#f4e04d] py-1 px-4 rounded text-center mb-2 shadow-sm border border-yellow-400">
                                                            <div className="font-bold text-black text-sm">รางวัลที่ 2</div>
                                                            <div className="text-black text-xs">จำนวน 5 รางวัลละ 200,000 THB</div>
                                                        </div>
                                                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                                            {checkResult.details.second.map((n, i) => (
                                                                <div key={i} className="bg-gray-100 p-2 rounded text-center border border-gray-200 text-black font-bold text-lg tracking-wider">{n}</div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {checkResult.details?.third && (
                                                        <div>
                                                            <div className="bg-[#f4e04d] py-1 px-4 rounded text-center mb-2 shadow-sm border border-yellow-400">
                                                                <div className="font-bold text-black text-sm">รางวัลที่ 3</div>
                                                                <div className="text-black text-xs">จำนวน 10 รางวัลละ 80,000 THB</div>
                                                            </div>
                                                            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                                                                {checkResult.details.third.map((n, i) => (
                                                                    <div key={i} className="bg-gray-100 p-2 rounded text-center border border-gray-200 text-black font-bold tracking-wider">{n}</div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {checkResult.details?.fourth && (
                                                        <div>
                                                            <div className="bg-[#f4e04d] py-1 px-4 rounded text-center mb-2 shadow-sm border border-yellow-400">
                                                                <div className="font-bold text-black text-sm">รางวัลที่ 4</div>
                                                                <div className="text-black text-xs">จำนวน 50 รางวัลละ 40,000 THB</div>
                                                            </div>
                                                            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                                                                {checkResult.details.fourth.map((n, i) => (
                                                                    <div key={i} className="bg-gray-100 p-1 rounded text-center border border-gray-200 text-black text-sm font-semibold">{n}</div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {checkResult.details?.fifth && (
                                                        <div>
                                                            <div className="bg-[#f4e04d] py-1 px-4 rounded text-center mb-2 shadow-sm border border-yellow-400">
                                                                <div className="font-bold text-black text-sm">รางวัลที่ 5</div>
                                                                <div className="text-black text-xs">จำนวน 100 รางวัลละ 20,000 THB</div>
                                                            </div>
                                                            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                                                                {checkResult.details.fifth.map((n, i) => (
                                                                    <div key={i} className="bg-gray-100 p-1 rounded text-center border border-gray-200 text-black text-sm font-semibold">{n}</div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-20 text-gray-500">
                                            ไม่พบผลรางวัลสำหรับวันที่นี้
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    {isLoadingAllResults ? (
                                        <div className="text-center py-20 text-gray-500">กำลังโหลด...</div>
                                    ) : allResults.length > 0 ? (
                                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                                            {allResults.map((r, i) => {
                                                const digits = r.first_prize?.length || 0;
                                                const drawDate = r.draw_date?.split('T')[0] || r.draw_date;
                                                return (
                                                    <div key={i}>
                                                        <div className="text-sm text-gray-600 mb-1 font-medium bg-gray-100 px-3 py-1.5 rounded">
                                                            งวดประจำวันที่ {drawDate}
                                                        </div>
                                                        <div className={`grid ${digits >= 4 ? 'grid-cols-4' : 'grid-cols-3'} gap-2`}>
                                                            {digits >= 4 && (
                                                                <div className="bg-[#f4e04d] p-2 rounded text-center shadow-sm border border-yellow-400">
                                                                    <div className="font-bold text-black text-xs">เลข 4 ตัว</div>
                                                                    <div className="text-xl font-bold text-black tracking-widest">{r.first_prize || '-'}</div>
                                                                </div>
                                                            )}
                                                            <div className="bg-[#f4e04d] p-2 rounded text-center shadow-sm border border-yellow-400">
                                                                <div className="font-bold text-black text-xs">เลข 3 ตัวบน</div>
                                                                <div className="text-xl font-bold text-black tracking-widest">{r.three_top || r.first_prize || '-'}</div>
                                                            </div>
                                                            <div className="bg-[#f4e04d] p-2 rounded text-center shadow-sm border border-yellow-400">
                                                                <div className="font-bold text-black text-xs">เลข 2 ตัวบน</div>
                                                                <div className="text-xl font-bold text-black tracking-widest">{r.two_top || '-'}</div>
                                                            </div>
                                                            <div className="bg-[#f4e04d] p-2 rounded text-center shadow-sm border border-yellow-400">
                                                                <div className="font-bold text-black text-xs">เลข 2 ตัวล่าง</div>
                                                                <div className="text-xl font-bold text-black tracking-widest">{r.two_bottom || '-'}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-20 text-gray-500">
                                            ไม่พบผลรางวัล
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ===== SUCCESS MODAL ===== */}
            {showSuccess && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0d1b30] border border-[#1a3a5c] rounded-xl w-full max-w-sm text-center p-6">
                        <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-500/30">
                            <Check size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">บันทึกโพยสำเร็จ</h2>
                        <p className="text-gray-400 mb-6">ยอดรวม {submittedTotal.toLocaleString()} บาท</p>
                        <button
                            onClick={() => router.visit('/')}
                            className="w-full py-3 bg-gradient-to-r from-[#d4a017] to-[#b08600] text-black font-bold rounded-xl shadow-lg"
                        >
                            ตกลง
                        </button>
                    </div>
                </div>
            )}

            {/* ===== ERROR MODAL ===== */}
            {errorModal.show && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-gradient-to-b from-[#1a2d4a] to-[#0d1b30] border border-red-500/30 rounded-2xl w-full max-w-sm text-center p-6 shadow-2xl">
                        <div className="w-20 h-20 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-red-500/30">
                            <X size={40} />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-3">{errorModal.title}</h2>
                        <p className="text-gray-300 mb-6 whitespace-pre-line leading-relaxed">{errorModal.message}</p>

                        {errorModal.title.includes('เครดิต') && (
                            <button
                                onClick={() => { setErrorModal({ show: false, title: '', message: '' }); router.visit('/deposit'); }}
                                className="w-full py-3 bg-gradient-to-r from-green-600 to-green-500 text-white font-bold rounded-xl mb-3 shadow-lg hover:from-green-500 hover:to-green-400 transition-all"
                            >
                                💳 เติมเงินเลย
                            </button>
                        )}

                        <button
                            onClick={() => setErrorModal({ show: false, title: '', message: '' })}
                            className="w-full py-3 bg-[#1a2d4a] text-gray-300 font-bold rounded-xl border border-[#2a3d5a] hover:bg-[#243d5a] transition-all"
                        >
                            ปิด
                        </button>
                    </div>
                </div>
            )}

            {/* ===== RULES MODAL ===== */}
            {showRulesModal && (
                <RulesModal lottery={lottery} payoutRates={payoutRates} onClose={() => setShowRulesModal(false)} />
            )}

        </MainLayout>
    );
}

/* ===== Rules Modal Component ===== */
function RulesModal({ lottery, payoutRates = {}, onClose }) {
    const [expandedId, setExpandedId] = useState(null);
    const category = lottery?.category || 'lottery';
    const slug = lottery?.slug;
    const r = (id, fallback) => payoutRates[id] ?? fallback;

    // Format draw days for display
    const formatDrawDays = (drawDays) => {
        if (!drawDays) return 'ทุกวัน';
        const dayMap = {
            'mon': 'จันทร์', 'tue': 'อังคาร', 'wed': 'พุธ', 'thu': 'พฤหัสบดี', 'fri': 'ศุกร์', 'sat': 'เสาร์', 'sun': 'อาทิตย์',
            '1': 'วันที่ 1', '16': 'วันที่ 16',
            'monday': 'จันทร์', 'tuesday': 'อังคาร', 'wednesday': 'พุธ', 'thursday': 'พฤหัสบดี', 'friday': 'ศุกร์', 'saturday': 'เสาร์', 'sunday': 'อาทิตย์',
        };
        // Handle JSON string like '["1","16"]'
        if (typeof drawDays === 'string') {
            try {
                const parsed = JSON.parse(drawDays);
                if (Array.isArray(parsed)) {
                    return parsed.map(d => dayMap[String(d).trim().toLowerCase()] || d).join(' และ ');
                }
            } catch { }
            const days = drawDays.split(',').map(d => d.trim().toLowerCase());
            return days.map(d => dayMap[d] || d).join(', ');
        }
        if (Array.isArray(drawDays)) {
            return drawDays.map(d => dayMap[String(d).trim().toLowerCase()] || d).join(' และ ');
        }
        return String(drawDays);
    };

    const formatTime = (isoStr) => {
        if (!isoStr) return '-';
        try {
            const d = new Date(isoStr);
            return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        } catch { return '-'; }
    };

    // Flag mapping
    const flagMap = {
        'thai': '🇹🇭', 'gsb-1': '🇹🇭', 'gsb-2': '🇹🇭', 'baac': '🇹🇭',
        'lao': '🇱🇦', 'lao-hd': '🇱🇦', 'lao-star': '🇱🇦', 'lao-red': '🇱🇦', 'lao-samakkhi': '🇱🇦', 'lao-pattana': '🇱🇦', 'lao-asean': '🇱🇦',
        'hanoi': '🇻🇳', 'hanoi-vip': '🇻🇳', 'hanoi-special': '🇻🇳',
        'malay': '🇲🇾',
        'nikkei': '🇯🇵', 'hang-seng': '🇭🇰', 'china': '🇨🇳', 'taiwan': '🇹🇼', 'korea': '🇰🇷',
        'india': '🇮🇳', 'singapore': '🇸🇬', 'thai-stock': '🇹🇭',
        'russia': '🇷🇺', 'uk': '🇬🇧', 'germany': '🇩🇪', 'dowjones': '🇺🇸',
    };
    const flag = flagMap[slug] || '🎰';

    // Get rules for current lottery type
    const getRules = () => {
        if (slug === 'malay') {
            return {
                types: [
                    { id: 10, name: '4ตัวบน', digits: 4, desc: 'ทายเลข 4 หลักท้ายของรางวัลที่ 1', how: 'เลขที่แทงต้องตรงกับ 4 หลักท้ายของรางวัลที่ 1', ex: 'ผลรางวัลที่ 1 = 1234 → แทง 1234 ถูกรางวัล', payout: `x${r(10, 3000)}` },
                    { id: 4, name: '3ตัวบน', digits: 3, desc: 'ทายเลข 3 หลักท้ายของรางวัลที่ 1', how: 'เลขที่แทงต้องตรงกับ 3 หลักท้ายของรางวัลที่ 1', ex: 'ผลรางวัลที่ 1 = 1234 → 3ตัวบน = 234 → แทง 234 ถูก', payout: `x${r(4, 900)}` },
                    { id: 1, name: '2ตัวบน', digits: 2, desc: 'ทายเลข 2 หลักท้ายของรางวัลที่ 1', how: 'เลขที่แทงต้องตรงกับ 2 หลักท้ายของรางวัลที่ 1', ex: 'ผลรางวัลที่ 1 = 1234 → 2ตัวบน = 34 → แทง 34 ถูก', payout: `x${r(1, 90)}` },
                    { id: 2, name: '2ตัวล่าง', digits: 2, desc: 'ทายเลข 2 หลักตรงกับ 2 ตัวล่าง', how: 'เลขที่แทงต้องตรงกับ 2 ตัวล่าง', ex: 'ผล 2ตัวล่าง = 56 → แทง 56 ถูกรางวัล', payout: `x${r(2, 90)}` },
                    { id: 5, name: 'วิ่งบน', digits: 1, desc: 'ทายเลขตัวเดียวที่ปรากฏอยู่ใน 3 ตัวบน', how: 'เลขที่แทง (1 ตัว) ต้องปรากฏอยู่ในเลข 3 ตัวบน', ex: '3ตัวบน = 234 → แทง 2, 3, หรือ 4 ถูกรางวัล', payout: `x${r(5, 2.4)}` },
                    { id: 6, name: 'วิ่งล่าง', digits: 1, desc: 'ทายเลขตัวเดียวที่ปรากฏอยู่ใน 2 ตัวล่าง', how: 'เลขที่แทง (1 ตัว) ต้องปรากฏอยู่ในเลข 2 ตัวล่าง', ex: '2ตัวล่าง = 56 → แทง 5 หรือ 6 ถูกรางวัล', payout: `x${r(6, 3.2)}` },
                ],
            };
        }
        if (category === 'stock' || category === 'stock-vip') {
            return {
                types: [
                    { id: 4, name: '3ตัวบน', digits: 3, desc: 'ทายเลข 3 หลักท้ายของดัชนีปิดตลาด', how: 'เลขที่แทงต้องตรงกับ 3 หลักท้ายของดัชนีปิดตลาด', ex: 'ดัชนีปิด = 1,234.56 → 3ตัวบน = 345 → แทง 345 ถูก', payout: `x${r(4, 900)}` },
                    { id: 1, name: '2ตัวบน', digits: 2, desc: 'ทายเลข 2 หลักท้ายของดัชนีปิดตลาด', how: 'เลขที่แทงต้องตรงกับ 2 หลักท้ายของดัชนีปิดตลาด', ex: 'ดัชนีปิด = 1,234.56 → 2ตัวบน = 45 → แทง 45 ถูก', payout: `x${r(1, 90)}` },
                    { id: 2, name: '2ตัวล่าง', digits: 2, desc: 'ทายเลข 2 หลักตรงกับ 2 ตัวล่าง', how: 'เลขที่แทงต้องตรงกับเลข 2 ตัวล่าง', ex: 'ผล 2ตัวล่าง = 78 → แทง 78 ถูกรางวัล', payout: `x${r(2, 90)}` },
                    { id: 5, name: 'วิ่งบน', digits: 1, desc: 'ทายเลขตัวเดียวที่ปรากฏอยู่ใน 3 ตัวบน', how: 'เลขที่แทง (1 ตัว) ต้องปรากฏอยู่ในเลข 3 ตัวบน', ex: '3ตัวบน = 345 → แทง 3, 4, หรือ 5 ถูกรางวัล', payout: `x${r(5, 2.4)}` },
                    { id: 6, name: 'วิ่งล่าง', digits: 1, desc: 'ทายเลขตัวเดียวที่ปรากฏอยู่ใน 2 ตัวล่าง', how: 'เลขที่แทง (1 ตัว) ต้องปรากฏอยู่ในเลข 2 ตัวล่าง', ex: '2ตัวล่าง = 78 → แทง 7 หรือ 8 ถูกรางวัล', payout: `x${r(6, 3.2)}` },
                ],
            };
        }
        // หวยปกติ (ไทย, ลาว, ฮานอย)
        const has4Digit = slug?.startsWith('hanoi') || slug?.startsWith('lao');
        const types = [];
        if (has4Digit) {
            types.push({ id: 10, name: '4ตัวตรง', digits: 4, desc: 'ทายเลข 4 หลักตรงกับ 4 ตัวท้ายของรางวัลที่ 1', how: 'เลขที่แทงต้องตรงกับ 4 ตัวท้ายของรางวัลที่ 1 เรียงลำดับถูกต้อง', ex: 'ผลรางวัลที่ 1 = 12345 → 4ตัวตรง = 2345 → แทง 2345 ถูก', payout: `x${r(10, 5000)}` });
        }
        types.push(
            { id: 4, name: '3ตัวบน', digits: 3, desc: 'ทายเลข 3 หลักตรงกับ 3 ตัวท้ายของรางวัลที่ 1', how: 'เลขที่แทงต้องตรงกับ 3 ตัวท้ายของรางวัลที่ 1 เรียงลำดับถูกต้อง', ex: 'ผลรางวัลที่ 1 = 123456 → 3ตัวบน = 456 → แทง 456 ถูก', payout: `x${r(4, 900)}` },
            { id: 3, name: '3ตัวโต๊ด', digits: 3, desc: 'ทายเลข 3 หลัก สลับตำแหน่งได้', how: 'เลขที่แทงมีตัวเลขเหมือนกับ 3 ตัวบน ไม่ต้องเรียงลำดับ', ex: '3ตัวบน = 456 → แทง 654, 465, 546 ฯลฯ ก็ถูก', payout: `x${r(3, 150)}` },
            { id: 9, name: '3ตัวล่าง', digits: 3, desc: 'ทายเลข 3 หลักตรงกับ 3 ตัวล่าง (หวยไทยมี 2 ชุด)', how: 'เลขที่แทงต้องตรงกับ 3 ตัวล่างชุดใดชุดหนึ่ง', ex: 'ผล 3ตัวล่าง = 123, 789 → แทง 123 หรือ 789 ถูก', payout: `x${r(9, 900)}`, note: '⚠️ หวยไทยมี 2 ชุด / ลาว-ฮานอยอาจไม่มี' },
            { id: 1, name: '2ตัวบน', digits: 2, desc: 'ทายเลข 2 หลักตรงกับ 2 ตัวท้ายของรางวัลที่ 1', how: 'เลขที่แทงต้องตรงกับ 2 ตัวท้ายของรางวัลที่ 1', ex: 'ผลรางวัลที่ 1 = 123456 → 2ตัวบน = 56 → แทง 56 ถูก', payout: `x${r(1, 90)}` },
            { id: 2, name: '2ตัวล่าง', digits: 2, desc: 'ทายเลข 2 หลักตรงกับ 2 ตัวล่าง', how: 'เลขที่แทงต้องตรงกับ 2 ตัวล่าง', ex: 'ผล 2ตัวล่าง = 34 → แทง 34 ถูกรางวัล', payout: `x${r(2, 90)}` },
            { id: 5, name: 'วิ่งบน', digits: 1, desc: 'ทายเลขตัวเดียวที่ปรากฏอยู่ใน 3 ตัวบน', how: 'เลขที่แทง (1 ตัว) ต้องปรากฏอยู่ในเลข 3 ตัวบน', ex: '3ตัวบน = 456 → แทง 4, 5, หรือ 6 ถูกรางวัล', payout: `x${r(5, 2.4)}` },
            { id: 6, name: 'วิ่งล่าง', digits: 1, desc: 'ทายเลขตัวเดียวที่ปรากฏอยู่ใน 2 ตัวล่าง', how: 'เลขที่แทง (1 ตัว) ต้องปรากฏอยู่ในเลข 2 ตัวล่าง', ex: '2ตัวล่าง = 34 → แทง 3 หรือ 4 ถูกรางวัล', payout: `x${r(6, 3.2)}` },
        );
        return { types };
    };

    const rules = getRules();

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
                            <BookOpen size={18} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-black">{flag} กติกา {lottery?.name}</h2>
                            <p className="text-gray-400 text-xs">รายละเอียดและอัตราจ่าย</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-4 space-y-4">

                    {/* ===== Schedule Info Panel ===== */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 overflow-hidden">
                        <div className="px-4 py-3 bg-blue-600">
                            <h3 className="font-bold text-white text-sm">📋 ข้อมูล{lottery?.name}</h3>
                        </div>
                        <div className="p-4">
                            {/* Description */}
                            {lottery?.description && (
                                <p className="text-gray-700 text-sm mb-3 leading-relaxed">{lottery.description}</p>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                {/* Draw Days */}
                                <div className="bg-white rounded-lg p-3 border border-blue-100">
                                    <div className="text-[10px] font-bold text-blue-500 uppercase mb-1">📅 วันที่ออกผล</div>
                                    <div className="text-black text-sm font-semibold">{formatDrawDays(lottery?.draw_days)}</div>
                                </div>

                                {/* Draw Time */}
                                <div className="bg-white rounded-lg p-3 border border-blue-100">
                                    <div className="text-[10px] font-bold text-green-500 uppercase mb-1">⏰ เวลาออกผล</div>
                                    <div className="text-black text-sm font-semibold">{lottery?.draw_time_str || formatTime(lottery?.draw_time) || '-'}</div>
                                </div>

                                {/* Close Time */}
                                <div className="bg-white rounded-lg p-3 border border-blue-100">
                                    <div className="text-[10px] font-bold text-red-500 uppercase mb-1">🔒 ปิดรับแทง</div>
                                    <div className="text-black text-sm font-semibold">{formatTime(lottery?.close_time)}</div>
                                </div>

                                {/* Close Before */}
                                <div className="bg-white rounded-lg p-3 border border-blue-100">
                                    <div className="text-[10px] font-bold text-orange-500 uppercase mb-1">⏳ ปิดก่อนออกผล</div>
                                    <div className="text-black text-sm font-semibold">{lottery?.close_before_minutes ? `${lottery.close_before_minutes} นาที` : '-'}</div>
                                </div>
                            </div>

                            {/* Status */}
                            <div className="mt-3 flex items-center gap-2">
                                <span className="text-xs text-gray-500">สถานะ:</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${lottery?.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {lottery?.status === 'open' ? '🟢 เปิดรับแทง' : '🔴 ปิดรับแทง'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ===== Bet Types ===== */}
                    <div>
                        <h3 className="font-bold text-black text-sm mb-2">🎯 ประเภทการแทง</h3>
                        <div className="space-y-2">
                            {rules.types.map(t => (
                                <div key={t.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                                        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <span className="w-7 h-7 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold text-xs">
                                                {t.digits}
                                            </span>
                                            <div>
                                                <div className="font-bold text-black text-sm">{t.name}</div>
                                                <div className="text-gray-500 text-xs">{t.desc}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold">{t.payout}</span>
                                            {expandedId === t.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                        </div>
                                    </button>
                                    {expandedId === t.id && (
                                        <div className="px-3 pb-3 border-t border-gray-100 pt-2 space-y-2">
                                            <div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">วิธีถูกรางวัล</div>
                                                <div className="text-black text-xs">{t.how}</div>
                                            </div>
                                            <div className="bg-blue-50 rounded-lg p-2.5">
                                                <div className="text-[10px] font-bold text-blue-600 uppercase mb-0.5">ตัวอย่าง</div>
                                                <div className="text-blue-800 text-xs">{t.ex}</div>
                                            </div>
                                            {t.note && (
                                                <div className="bg-yellow-50 rounded-lg p-2.5">
                                                    <div className="text-yellow-800 text-xs">{t.note}</div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* General Rules */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h3 className="font-bold text-black text-sm mb-2">📌 กฎทั่วไป</h3>
                        <ul className="space-y-1.5 text-xs text-gray-600">
                            <li>• เลขอั้น (จ่ายครึ่ง) — อัตราจ่ายลดเหลือครึ่งหนึ่ง</li>
                            <li>• เลขอั้นห้ามแทง — เจ้ามือปิดรับ ไม่สามารถแทงได้</li>
                            <li>• อัตราจ่ายขึ้นอยู่กับการตั้งค่าของเจ้ามือ</li>
                            <li>• ระบบปิดรับแทงก่อนเวลาออกผลตามที่กำหนด</li>
                            <li>• เงินรางวัลเข้าเครดิตอัตโนมัติหลังผลรางวัลออก</li>
                        </ul>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-3 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors text-sm"
                    >
                        เข้าใจแล้ว
                    </button>
                </div>
            </div>
        </div>
    );
}


