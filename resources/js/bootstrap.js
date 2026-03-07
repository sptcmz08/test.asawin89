import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
window.axios.defaults.withCredentials = true;
window.axios.defaults.withXSRFToken = true;

/**
 * สร้าง CSRF header ที่ถูกต้อง:
 * - Cookie XSRF-TOKEN (encrypted) → ส่งเป็น X-XSRF-TOKEN
 * - Meta tag (unencrypted) → ส่งเป็น X-CSRF-TOKEN
 */
function getCsrfHeaders() {
    const cookieMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    if (cookieMatch) {
        return { 'X-XSRF-TOKEN': decodeURIComponent(cookieMatch[1]) };
    }
    const meta = document.querySelector('meta[name="csrf-token"]')?.content;
    if (meta) {
        return { 'X-CSRF-TOKEN': meta };
    }
    return {};
}

/**
 * ===== GLOBAL FETCH INTERCEPTOR =====
 * ครอบ fetch() ทุกอัน → จัดการ CSRF ให้อัตโนมัติ
 * 1. ลบ X-CSRF-TOKEN เก่าที่อาจ stale (จาก meta tag)
 * 2. ใส่ header ที่ถูกต้องจาก cookie หรือ meta tag
 * 3. ถ้าได้ 419 → retry อัตโนมัติ 1 ครั้ง (user ไม่รู้สึกอะไร)
 */
const originalFetch = window.fetch;
window.fetch = async function (url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        options.credentials = options.credentials || 'same-origin';

        // ลบ X-CSRF-TOKEN เก่าที่โค้ดใน component อาจใส่มา (อาจ stale!)
        // Laravel เช็ค X-CSRF-TOKEN ก่อน X-XSRF-TOKEN ถ้าเจอค่าเก่า = mismatch
        const headers = options.headers || {};
        delete headers['X-CSRF-TOKEN'];

        options.headers = {
            ...headers,
            ...getCsrfHeaders(),
        };
    }

    let response = await originalFetch(url, options);

    // ถ้า 419 → refresh token แล้ว retry 1 ครั้ง
    if (response.status === 419 && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        await originalFetch(window.location.pathname, {
            credentials: 'same-origin',
        }).catch(() => { });

        await new Promise(resolve => setTimeout(resolve, 100));

        const retryHeaders = options.headers || {};
        delete retryHeaders['X-CSRF-TOKEN'];
        delete retryHeaders['X-XSRF-TOKEN'];
        options.headers = { ...retryHeaders, ...getCsrfHeaders() };

        response = await originalFetch(url, options);
    }

    return response;
};

/**
 * ===== PERIODIC TOKEN REFRESH =====
 * ทุก 5 นาที → GET หน้าปัจจุบันเพื่อ keep session alive + refresh cookie
 */
setInterval(() => {
    originalFetch(window.location.pathname, {
        credentials: 'same-origin',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
    }).catch(() => { });
}, 5 * 60 * 1000);
