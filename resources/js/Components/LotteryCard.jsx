import React, { useState, useEffect } from 'react';
import { Clock, Star, Info, TrendingUp, Zap, Timer, Flame } from 'lucide-react';
import { Link } from '@inertiajs/react';

// ===== Flag Components =====
const ThaiFlag = () => (
    <svg viewBox="0 0 100 66" className="w-full h-full">
        <rect width="100" height="11" fill="#ED1C24" />
        <rect y="11" width="100" height="11" fill="#FFFFFF" />
        <rect y="22" width="100" height="22" fill="#241D4F" />
        <rect y="44" width="100" height="11" fill="#FFFFFF" />
        <rect y="55" width="100" height="11" fill="#ED1C24" />
    </svg>
);

const VietnamFlag = () => (
    <svg viewBox="0 0 100 66" className="w-full h-full">
        <rect width="100" height="66" fill="#DA251D" />
        <polygon points="50,13 56,32 76,32 60,44 66,63 50,51 34,63 40,44 24,32 44,32" fill="#FFFF00" />
    </svg>
);

const LaoFlag = () => (
    <svg viewBox="0 0 100 66" className="w-full h-full">
        <rect width="100" height="16" fill="#CE1126" />
        <rect y="16" width="100" height="34" fill="#002868" />
        <circle cx="50" cy="33" r="12" fill="#FFFFFF" />
        <rect y="50" width="100" height="16" fill="#CE1126" />
    </svg>
);

const MalaysiaFlag = () => (
    <svg viewBox="0 0 100 66" className="w-full h-full">
        <rect width="100" height="66" fill="#CC0001" />
        {[0, 2, 4, 6].map(i => <rect key={i} y={i * 9.4} width="100" height="4.7" fill="#FFFFFF" />)}
        <rect width="50" height="35" fill="#010066" />
        <circle cx="22" cy="17" r="10" fill="#FFCC00" />
        <circle cx="25" cy="17" r="8" fill="#010066" />
    </svg>
);

const JapanFlag = () => (
    <svg viewBox="0 0 100 66" className="w-full h-full">
        <rect width="100" height="66" fill="#FFFFFF" />
        <circle cx="50" cy="33" r="16" fill="#BC002D" />
    </svg>
);

const ChinaFlag = () => (
    <svg viewBox="0 0 100 66" className="w-full h-full">
        <rect width="100" height="66" fill="#DE2910" />
        <polygon points="20,12 22,18 28,18 23,22 25,28 20,24 15,28 17,22 12,18 18,18" fill="#FFDE00" />
    </svg>
);

const HongKongFlag = () => (
    <svg viewBox="0 0 100 66" className="w-full h-full">
        <rect width="100" height="66" fill="#DE2910" />
        <circle cx="50" cy="33" r="15" fill="none" stroke="#FFFFFF" strokeWidth="3" />
    </svg>
);

const TaiwanFlag = () => (
    <svg viewBox="0 0 100 66" className="w-full h-full">
        <rect width="100" height="66" fill="#FE0000" />
        <rect width="50" height="35" fill="#000095" />
        <circle cx="25" cy="17" r="10" fill="#FFFFFF" />
    </svg>
);

const KoreaFlag = () => (
    <svg viewBox="0 0 100 66" className="w-full h-full">
        <rect width="100" height="66" fill="#FFFFFF" />
        <circle cx="50" cy="33" r="15" fill="#C60C30" />
        <path d="M50,18 A15,15 0 0,1 50,48" fill="#003478" />
    </svg>
);

const SingaporeFlag = () => (
    <svg viewBox="0 0 100 66" className="w-full h-full">
        <rect width="100" height="33" fill="#ED2939" />
        <rect y="33" width="100" height="33" fill="#FFFFFF" />
        <circle cx="22" cy="17" r="10" fill="#FFFFFF" />
        <circle cx="25" cy="17" r="10" fill="#ED2939" />
    </svg>
);

const IndiaFlag = () => (
    <svg viewBox="0 0 100 66" className="w-full h-full">
        <rect width="100" height="22" fill="#FF9933" />
        <rect y="22" width="100" height="22" fill="#FFFFFF" />
        <rect y="44" width="100" height="22" fill="#138808" />
        <circle cx="50" cy="33" r="7" fill="none" stroke="#000080" strokeWidth="2" />
    </svg>
);

const EgyptFlag = () => (
    <svg viewBox="0 0 100 66" className="w-full h-full">
        <rect width="100" height="22" fill="#CE1126" />
        <rect y="22" width="100" height="22" fill="#FFFFFF" />
        <rect y="44" width="100" height="22" fill="#000000" />
    </svg>
);

const RussiaFlag = () => (
    <svg viewBox="0 0 100 66" className="w-full h-full">
        <rect width="100" height="22" fill="#FFFFFF" />
        <rect y="22" width="100" height="22" fill="#0039A6" />
        <rect y="44" width="100" height="22" fill="#D52B1E" />
    </svg>
);

const GermanyFlag = () => (
    <svg viewBox="0 0 100 66" className="w-full h-full">
        <rect width="100" height="22" fill="#000000" />
        <rect y="22" width="100" height="22" fill="#DD0000" />
        <rect y="44" width="100" height="22" fill="#FFCE00" />
    </svg>
);

const UKFlag = () => (
    <svg viewBox="0 0 100 66" className="w-full h-full">
        <rect width="100" height="66" fill="#012169" />
        <path d="M0,0 L100,66 M100,0 L0,66" stroke="#FFFFFF" strokeWidth="12" />
        <path d="M0,0 L100,66 M100,0 L0,66" stroke="#C8102E" strokeWidth="6" />
        <path d="M50,0 V66 M0,33 H100" stroke="#FFFFFF" strokeWidth="18" />
        <path d="M50,0 V66 M0,33 H100" stroke="#C8102E" strokeWidth="10" />
    </svg>
);

const USFlag = () => (
    <svg viewBox="0 0 100 66" className="w-full h-full">
        <rect width="100" height="66" fill="#B22234" />
        {[0, 2, 4, 6, 8, 10, 12].map(i => <rect key={i} y={i * 5} width="100" height="5" fill={i % 2 === 0 ? "#B22234" : "#FFFFFF"} />)}
        <rect width="40" height="35" fill="#3C3B6E" />
    </svg>
);

// Icon Components
const BAACIcon = () => (
    <div className="w-full h-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center">
        <span className="text-white font-bold text-sm">ธกส</span>
    </div>
);

const StockIcon = ({ children }) => (
    <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
        <TrendingUp className="text-green-400" size={24} />
    </div>
);

// Flag resolver
const FlagIcon = ({ slug, category }) => {
    // Stock-based lotteries
    if (category === 'stock') {
        if (slug.includes('nikkei')) return <JapanFlag />;
        if (slug.includes('china')) return <ChinaFlag />;
        if (slug.includes('hangseng')) return <HongKongFlag />;
        if (slug.includes('taiwan')) return <TaiwanFlag />;
        if (slug.includes('korea')) return <KoreaFlag />;
        if (slug.includes('singapore')) return <SingaporeFlag />;
        if (slug.includes('thai-stock')) return <ThaiFlag />;
        if (slug.includes('india')) return <IndiaFlag />;
        if (slug.includes('egypt')) return <EgyptFlag />;
        if (slug.includes('russia')) return <RussiaFlag />;
        if (slug.includes('germany')) return <GermanyFlag />;
        if (slug.includes('uk')) return <UKFlag />;
        if (slug.includes('dowjones')) return <USFlag />;
        return <StockIcon />;
    }

    // Regular lotteries
    if (slug === 'thai') return <ThaiFlag />;
    if (slug.includes('hanoi')) return <VietnamFlag />;
    if (slug.includes('lao')) return <LaoFlag />;
    if (slug === 'malay') return <MalaysiaFlag />;
    if (slug === 'baac') return <BAACIcon />;
    return null;
};

// Premium Casino-style card styles
const cardStyles = {
    // Regular Lotteries
    'thai': { bg: 'from-[#1a237e] via-[#283593] to-[#3949ab]', glow: 'shadow-blue-500/30' },
    'hanoi': { bg: 'from-[#b71c1c] via-[#c62828] to-[#d32f2f]', glow: 'shadow-red-500/30' },
    'hanoi-special': { bg: 'from-[#880e4f] via-[#ad1457] to-[#c2185b]', glow: 'shadow-pink-500/30' },
    'hanoi-vip': { bg: 'from-[#ff6f00] via-[#ff8f00] to-[#ffa000]', glow: 'shadow-orange-500/30' },
    'hanoi-adhoc': { bg: 'from-[#4a148c] via-[#6a1b9a] to-[#7b1fa2]', glow: 'shadow-purple-500/30' },
    'hanoi-redcross': { bg: 'from-[#8b0000] via-[#b22222] to-[#dc143c]', glow: 'shadow-red-600/30' },
    'lao': { bg: 'from-[#0d47a1] via-[#1565c0] to-[#1976d2]', glow: 'shadow-blue-500/30' },
    'lao-vip': { bg: 'from-[#004d40] via-[#00695c] to-[#00796b]', glow: 'shadow-teal-500/30' },
    'malay': { bg: 'from-[#1a237e] via-[#b71c1c] to-[#f9a825]', glow: 'shadow-yellow-500/30' },
    'baac': { bg: 'from-[#1b5e20] via-[#2e7d32] to-[#388e3c]', glow: 'shadow-green-500/30' },

    // Stock Lotteries - Premium dark theme
    'hangseng-morning': { bg: 'from-[#1a1a2e] via-[#16213e] to-[#0f3460]', glow: 'shadow-cyan-500/20' },
    'hangseng-afternoon': { bg: 'from-[#1a1a2e] via-[#16213e] to-[#0f3460]', glow: 'shadow-cyan-500/20' },
    'taiwan': { bg: 'from-[#2d132c] via-[#801336] to-[#c72c41]', glow: 'shadow-rose-500/20' },
    'nikkei-morning': { bg: 'from-[#1a1a2e] via-[#2d2d44] to-[#424242]', glow: 'shadow-zinc-500/20' },
    'nikkei-afternoon': { bg: 'from-[#1a1a2e] via-[#2d2d44] to-[#424242]', glow: 'shadow-zinc-500/20' },
    'korea': { bg: 'from-[#1a1a2e] via-[#0a2647] to-[#144272]', glow: 'shadow-blue-500/20' },
    'china-morning': { bg: 'from-[#3d0000] via-[#950101] to-[#ba1a1a]', glow: 'shadow-red-600/20' },
    'china-afternoon': { bg: 'from-[#3d0000] via-[#950101] to-[#ba1a1a]', glow: 'shadow-red-600/20' },
    'singapore': { bg: 'from-[#1a1a2e] via-[#16213e] to-[#1f4287]', glow: 'shadow-indigo-500/20' },
    'thai-stock': { bg: 'from-[#1a237e] via-[#283593] to-[#3949ab]', glow: 'shadow-blue-500/20' },
    'thai-stock-morning': { bg: 'from-[#1565c0] via-[#1976d2] to-[#1e88e5]', glow: 'shadow-blue-400/20' },
    'india': { bg: 'from-[#ff5722] via-[#ff7043] to-[#ff8a65]', glow: 'shadow-orange-500/20' },
    'egypt': { bg: 'from-[#1a1a2e] via-[#263238] to-[#37474f]', glow: 'shadow-slate-500/20' },
    'russia': { bg: 'from-[#1a1a2e] via-[#1565c0] to-[#1976d2]', glow: 'shadow-blue-500/20' },
    'germany': { bg: 'from-[#1a1a2e] via-[#424242] to-[#616161]', glow: 'shadow-amber-500/20' },
    'uk': { bg: 'from-[#1a1a2e] via-[#012169] to-[#1a237e]', glow: 'shadow-indigo-500/20' },
    'dowjones': { bg: 'from-[#1a1a2e] via-[#0d47a1] to-[#1565c0]', glow: 'shadow-blue-500/20' },
};

// Background image mapping (slug → optimized WebP)
const cardBgImages = {
    // Regular Lotteries
    'thai': '/images/lottery/optimized/รัฐบาลไทย.webp',
    'baac': '/images/lottery/optimized/หวยธกส.webp',
    'gsb-1': '/images/lottery/optimized/ออมสิน1ปี.webp',
    'gsb-2': '/images/lottery/optimized/ออมสิน2ปี.webp',
    'malay': '/images/lottery/optimized/หวยมาเลย์.webp',
    'lao-star': '/images/lottery/optimized/ลาวสตาร์.webp',
    'lao-samakki': '/images/lottery/optimized/ลาวสามัคคี.webp',
    'lao-vip': '/images/lottery/optimized/ลาวVIP.webp',
    'lao': '/images/lottery/optimized/ลาวพัฒนา.webp',
    'hanoi-adhoc': '/images/lottery/optimized/ฮานอยเฉพาะกิจ.webp',
    'hanoi-special': '/images/lottery/optimized/ฮานอยพิเศษ.webp',
    'hanoi-vip': '/images/lottery/optimized/ฮานอยVIP.webp',
    'hanoi': '/images/lottery/optimized/หวยฮานอย.webp',
    'hanoi-redcross': '/images/lottery/optimized/ฮานอยกาชาด.jpg',

    // Stock Lotteries
    'thai-stock-morning': '/images/lottery/optimized/หุ้นไทยเช้า.webp',
    'thai-stock': '/images/lottery/optimized/หุ้นไทยเย็น.webp',
    'nikkei-morning-vip': '/images/lottery/optimized/นิเคอิเช้าVIP.webp',
    'nikkei-afternoon-vip': '/images/lottery/optimized/นิเคอิบ่ายVIP.webp',
    'nikkei-morning': '/images/lottery/optimized/นิเคอิเช้า.webp',
    'nikkei-afternoon': '/images/lottery/optimized/นิเคอิบ่าย.webp',
    'china-morning-vip': '/images/lottery/optimized/หุ้นจีนเช้าVIP.webp',
    'china-afternoon-vip': '/images/lottery/optimized/หุ้นจีนบ่ายVIP.webp',
    'china-morning': '/images/lottery/optimized/หุ้นจีนเช้า.webp',
    'china-afternoon': '/images/lottery/optimized/หุ้นจีนบ่าย.webp',
    'hangseng-morning-vip': '/images/lottery/optimized/ฮังเส็งเช้าVIP.webp',
    'hangseng-afternoon-vip': '/images/lottery/optimized/ฮังเส็งบ่ายVIP.webp',
    'hangseng-morning': '/images/lottery/optimized/ฮั่งเส็งเช้า.webp',
    'hangseng-afternoon': '/images/lottery/optimized/ฮั่งเส็งบ่าย.webp',
    'taiwan-vip': '/images/lottery/optimized/หุ้นไต้หวันVIP.webp',
    'taiwan': '/images/lottery/optimized/หุ้นไต้หวัน.webp',
    'korea': '/images/lottery/optimized/หุ้นเกาหลี.webp',
    'singapore-vip': '/images/lottery/optimized/หุ้นสิงคโปร์VIP.webp',
    'singapore': '/images/lottery/optimized/หุ้นสิงคโปร์.webp',
    'india-vip': '/images/lottery/optimized/หุ้นอินเดียVIP.webp',
    'india': '/images/lottery/optimized/หุ้นอินเดีย.webp',
    'egypt-vip': '/images/lottery/optimized/หุ้นอียิปต์VIP.webp',
    'egypt': '/images/lottery/optimized/หุ้นอียิปต์.webp',
    'russia-vip': '/images/lottery/optimized/หุ้นรัสเซียVIP.webp',
    'russia': '/images/lottery/optimized/หุ้นรัสเซีย.webp',
    'germany-vip': '/images/lottery/optimized/หุ้นเยอรมันVIP.webp',
    'germany': '/images/lottery/optimized/หุ้นเยอรมัน.webp',
    'uk-vip': '/images/lottery/optimized/หุ้นอังกฤษVIP.webp',
    'uk': '/images/lottery/optimized/หุ้นอังกฤษ.webp',
    'dowjones-vip': '/images/lottery/optimized/หุ้ยดาวโจนส์VIP.webp',
    'dowjones': '/images/lottery/optimized/หุ้นดาวโจนส์.webp',
};

// Resolve background image for a given slug
const getBgImage = (slug) => {
    // Try exact match first
    if (cardBgImages[slug]) return cardBgImages[slug];
    // Try prefix match (e.g., 'hanoi-vip' matches 'hanoi')
    for (const [prefix, img] of Object.entries(cardBgImages)) {
        if (slug.startsWith(prefix)) return img;
    }
    return null;
};

const formatCloseTime = (isoString) => {
    if (!isoString) return '--:--';
    const date = new Date(isoString);
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
};

// Animated stock chart background for stock lotteries
const StockChartBg = () => (
    <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 100 50" preserveAspectRatio="none">
        <path d="M0,40 Q10,35 20,38 T40,30 T60,35 T80,25 T100,30" fill="none" stroke="#10b981" strokeWidth="0.5" />
        <path d="M0,45 Q15,40 30,42 T60,35 T80,40 T100,35" fill="none" stroke="#10b981" strokeWidth="0.3" />
    </svg>
);

export default function LotteryCard({ name, slug, drawTime, closeTime, status, scheduleDesc, description, category, nextDrawDay, nextDrawTime, nextOpenDay, nextOpenTime, latestResult }) {
    const [timeLeft, setTimeLeft] = useState('');
    const [currentStatus, setCurrentStatus] = useState(status);
    const [showInfo, setShowInfo] = useState(false);
    const [showClosedAlert, setShowClosedAlert] = useState(false);

    const style = cardStyles[slug] || { bg: 'from-gray-700 via-gray-800 to-gray-900', glow: 'shadow-gray-500/20' };
    const isStock = category === 'stock';
    const bgImage = getBgImage(slug);
    const [imgLoaded, setImgLoaded] = useState(false);

    // Check if closing soon (less than 30 mins)
    const [isClosingSoon, setIsClosingSoon] = useState(false);

    const handleCardClick = (e) => {
        if (currentStatus === 'closed') {
            e.preventDefault();
            setShowClosedAlert(true);
        }
    };

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const draw = new Date(drawTime);
            const close = new Date(closeTime);

            const diffToDraw = draw - now;
            const diffToClose = close - now;

            // Respect server status: if server says 'closed', stay closed.
            // Client can only transition open → closed (when close time passes),
            // never closed → open (that requires a page refresh / new server data).
            if (status === 'closed') {
                setCurrentStatus('closed');
            } else {
                // Server said 'open' — check if close time has passed
                setCurrentStatus(diffToClose <= 0 ? 'closed' : 'open');
            }

            if (diffToDraw <= 0) {
                setTimeLeft('กำลังออกผล');
                clearInterval(interval);
            } else {
                const days = Math.floor(diffToDraw / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diffToDraw / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((diffToDraw / 1000 / 60) % 60);
                const seconds = Math.floor((diffToDraw / 1000) % 60);

                // Check if closing soon (within 30 minutes)
                const minsToClose = diffToClose / (1000 * 60);
                setIsClosingSoon(minsToClose > 0 && minsToClose <= 30);

                if (days > 0) {
                    setTimeLeft(`${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
                } else {
                    setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
                }
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [drawTime, closeTime, status]);

    return (
        <div className="relative group">
            <Link
                href={currentStatus === 'open' ? `/bet/${slug}` : '#'}
                onClick={handleCardClick}
                className={`relative block overflow-hidden rounded-xl sm:rounded-2xl transition-all duration-300 
                    shadow-lg hover:shadow-2xl ${style.glow}
                    hover:scale-[1.02] sm:hover:scale-[1.03] hover:-translate-y-0.5 sm:hover:-translate-y-1
                    ${currentStatus === 'closed' ? 'opacity-60 grayscale cursor-not-allowed' : ''}
                    ${isClosingSoon ? 'ring-2 ring-red-500/50 animate-pulse' : ''}`}
            >
                {/* Main Card */}
                <div className={`h-20 sm:h-28 ${bgImage && imgLoaded ? '' : `bg-gradient-to-br ${style.bg}`} relative overflow-hidden`}>
                    {/* Background Image */}
                    {bgImage && (
                        <>
                            <img
                                src={bgImage}
                                alt=""
                                loading="lazy"
                                width="400"
                                height="225"
                                onLoad={() => setImgLoaded(true)}
                                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                            />
                            {/* Dark overlay for readability */}
                            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
                        </>
                    )}

                    {/* Stock chart background for stock lotteries (only when no bg image) */}
                    {isStock && !bgImage && <StockChartBg />}

                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent 
                        transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />



                    {/* Status Badge */}
                    <div className={`absolute top-1.5 right-1.5 sm:top-2 sm:right-2 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-bold flex items-center gap-0.5 sm:gap-1
                        ${currentStatus === 'open'
                            ? isClosingSoon
                                ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/30 animate-pulse'
                                : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30'
                            : 'bg-red-500/90 text-white shadow-lg shadow-red-500/30'}`}>
                        {isClosingSoon && <Flame size={8} className="animate-bounce sm:w-[10px] sm:h-[10px]" />}
                        {currentStatus === 'open' ? `ปิด${formatCloseTime(closeTime)}` : 'ปิดรับ'}
                    </div>

                    {/* Closed overlay — show latest results */}
                    {currentStatus === 'closed' && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            {latestResult?.three_top ? (
                                <div className="text-center px-1">
                                    <div className="text-[8px] sm:text-[10px] text-gray-400 mb-0.5">ผลรางวัล {latestResult.draw_date}</div>
                                    <div className="flex items-center justify-center gap-1 sm:gap-2">
                                        <div className="bg-[#d4a017]/20 border border-[#d4a017]/50 rounded px-1.5 sm:px-2 py-0.5">
                                            <div className="text-[7px] sm:text-[9px] text-[#d4a017]">3ตัวบน</div>
                                            <div className="text-white font-bold text-sm sm:text-lg font-mono">{latestResult.three_top}</div>
                                        </div>
                                        <div className="bg-cyan-500/20 border border-cyan-500/50 rounded px-1.5 sm:px-2 py-0.5">
                                            <div className="text-[7px] sm:text-[9px] text-cyan-400">2ตัวล่าง</div>
                                            <div className="text-white font-bold text-sm sm:text-lg font-mono">{latestResult.two_bottom || '--'}</div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="text-red-400 font-bold text-xs sm:text-sm">ปิดรับแทง</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Star button */}
                    <button className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 p-1 sm:p-1.5 rounded-full bg-black/30 
                        hover:bg-yellow-500/30 transition-colors group/star">
                        <Star size={10} className="text-gray-400 group-hover/star:text-yellow-400 transition-colors sm:w-3 sm:h-3" />
                    </button>
                </div>

                {/* Footer */}
                <div className="px-2 py-1.5 sm:px-3 sm:py-2 bg-[#0a0f1a] flex flex-col sm:flex-row sm:justify-between sm:items-center border-t border-white/5 gap-0.5 sm:gap-0">
                    <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1">
                        <Clock size={10} className={`flex-shrink-0 sm:w-3 sm:h-3 ${currentStatus === 'open' ? 'text-green-400' : 'text-red-400'}`} />
                        <span className={`text-[10px] sm:text-xs font-mono font-medium flex-shrink-0 ${currentStatus === 'open' ? 'text-white' : 'text-gray-500'}`}>
                            {timeLeft || '--:--'}
                        </span>
                        <span className="text-white text-[10px] sm:text-xs font-bold truncate ml-0.5 sm:ml-1">{name}</span>
                    </div>
                    <span className="text-[8px] sm:text-[10px] text-gray-500 flex-shrink-0 sm:ml-2 hidden sm:inline">{scheduleDesc}</span>
                </div>
            </Link>

            {/* Info Popup */}
            {showInfo && description && (
                <div className="absolute z-30 top-full left-0 right-0 mt-2 bg-[#0a1628] rounded-lg p-3 text-xs 
                    text-gray-300 shadow-xl border border-cyan-500/30 backdrop-blur-sm">
                    <button onClick={() => setShowInfo(false)} className="absolute top-1 right-2 text-gray-500 hover:text-white">&times;</button>
                    <p>{description}</p>
                </div>
            )}

            {/* Result / Closed Alert */}
            {showClosedAlert && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={(e) => { e.stopPropagation(); setShowClosedAlert(false); }}>
                    <div className="bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] border border-[#d4a017]/50 rounded-2xl p-6 
                        max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="text-center mb-4">
                            <div className="text-lg font-bold text-white">{name}</div>
                            {latestResult && (
                                <div className="text-sm text-gray-400 mt-1">งวดประจำวันที่ {latestResult.draw_date}</div>
                            )}
                        </div>

                        {latestResult?.three_top ? (
                            <>
                                {/* Result Grid */}
                                <div className="space-y-2 mb-4">
                                    {/* 3ตัวบน — prominent */}
                                    <div className="bg-gradient-to-r from-[#d4a017]/20 to-[#d4a017]/10 border border-[#d4a017]/40 rounded-xl p-3 text-center">
                                        <div className="text-[#d4a017] text-xs font-bold mb-1">3ตัวบน</div>
                                        <div className="text-white font-bold text-3xl font-mono tracking-widest">{latestResult.three_top}</div>
                                    </div>
                                    {/* 2ตัว row */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-center">
                                            <div className="text-blue-400 text-xs font-bold mb-1">2ตัวบน</div>
                                            <div className="text-white font-bold text-2xl font-mono tracking-widest">{latestResult.two_top || '--'}</div>
                                        </div>
                                        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 text-center">
                                            <div className="text-cyan-400 text-xs font-bold mb-1">2ตัวล่าง</div>
                                            <div className="text-white font-bold text-2xl font-mono tracking-widest">{latestResult.two_bottom || '--'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Next open info */}
                                {(nextOpenDay || nextOpenTime) && (
                                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2 mb-4">
                                        <p className="text-center text-xs">
                                            <span className="text-gray-400">เปิดรับแทงอีกครั้ง</span>{' '}
                                            <span className="text-emerald-400 font-bold">
                                                วัน{nextOpenDay || nextDrawDay} {nextOpenTime || nextDrawTime} น.
                                            </span>
                                        </p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-4 mb-4">
                                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Clock size={32} className="text-red-500" />
                                </div>
                                <p className="text-gray-400 text-sm">ยังไม่มีผลรางวัล</p>
                                {(nextOpenDay || nextOpenTime) && (
                                    <p className="text-yellow-400 text-sm font-bold mt-2">
                                        เปิดรับแทง วัน{nextOpenDay || nextDrawDay} {nextOpenTime || nextDrawTime} น.
                                    </p>
                                )}
                            </div>
                        )}

                        <button
                            onClick={() => setShowClosedAlert(false)}
                            className="w-full py-3 bg-gradient-to-r from-[#d4a017] to-[#b08600] hover:from-[#e0b020] hover:to-[#c49000] 
                                text-black font-bold rounded-xl transition-all shadow-lg shadow-amber-500/30"
                        >
                            ปิด
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
