import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

/**
 * Simple Bootstrap 5-style Alert Modal
 * แทนที่ browser alert() และ confirm()
 */

const ICONS = {
    success: <CheckCircle size={24} className="text-green-500" />,
    error: <XCircle size={24} className="text-red-500" />,
    warning: <AlertTriangle size={24} className="text-yellow-500" />,
    info: <Info size={24} className="text-blue-500" />,
    confirm: <AlertTriangle size={24} className="text-yellow-500" />,
};

const COLORS = {
    success: { border: 'border-green-500/30', bg: 'bg-green-500/10', btn: 'bg-green-600 hover:bg-green-700' },
    error: { border: 'border-red-500/30', bg: 'bg-red-500/10', btn: 'bg-red-600 hover:bg-red-700' },
    warning: { border: 'border-yellow-500/30', bg: 'bg-yellow-500/10', btn: 'bg-yellow-600 hover:bg-yellow-700' },
    info: { border: 'border-blue-500/30', bg: 'bg-blue-500/10', btn: 'bg-blue-600 hover:bg-blue-700' },
    confirm: { border: 'border-yellow-500/30', bg: 'bg-yellow-500/10', btn: 'bg-yellow-600 hover:bg-yellow-700' },
};

export function AlertModal({
    show,
    type = 'info',
    title,
    message,
    onClose,
    onConfirm,
    confirmText = 'ตกลง',
    cancelText = 'ยกเลิก',
}) {
    if (!show) return null;

    const color = COLORS[type] || COLORS.info;
    const icon = ICONS[type] || ICONS.info;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50"
            onClick={onClose}
        >
            <div
                className={`bg-[#1a2a42] rounded-xl border ${color.border} w-full max-w-sm shadow-xl`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
                    <div className="flex items-center gap-2">
                        {icon}
                        <h3 className="text-white font-bold text-base">{title || 'แจ้งเตือน'}</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-4 py-4">
                    <p className="text-gray-300 text-sm">{message}</p>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-700/50">
                    {type === 'confirm' ? (
                        <>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={() => { onConfirm?.(); onClose?.(); }}
                                className={`px-4 py-2 text-sm font-bold text-white ${color.btn} rounded-lg transition-colors`}
                            >
                                {confirmText}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onClose}
                            className={`px-4 py-2 text-sm font-bold text-white ${color.btn} rounded-lg transition-colors`}
                        >
                            ตกลง
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * useAlert hook
 * Usage:
 *   const { alert, AlertComponent } = useAlert();
 *   alert.success('บันทึกสำเร็จ');
 *   alert.error('เกิดข้อผิดพลาด');
 *   alert.confirm('ลบรายการนี้?', () => handleDelete());
 *   return <div>{AlertComponent}</div>;
 */
export function useAlert() {
    const [alertState, setAlertState] = React.useState({
        show: false,
        type: 'info',
        title: '',
        message: '',
        onConfirm: null,
    });

    const hideAlert = () => setAlertState(s => ({ ...s, show: false }));

    const success = (message, title) => setAlertState({ show: true, type: 'success', title: title || 'สำเร็จ', message, onConfirm: null });
    const error = (message, title) => setAlertState({ show: true, type: 'error', title: title || 'ผิดพลาด', message, onConfirm: null });
    const warning = (message, title) => setAlertState({ show: true, type: 'warning', title: title || 'คำเตือน', message, onConfirm: null });
    const info = (message, title) => setAlertState({ show: true, type: 'info', title: title || 'แจ้งเตือน', message, onConfirm: null });
    const confirm = (message, onConfirm, title) => setAlertState({ show: true, type: 'confirm', title: title || 'ยืนยัน', message, onConfirm });

    const AlertComponent = (
        <AlertModal
            show={alertState.show}
            type={alertState.type}
            title={alertState.title}
            message={alertState.message}
            onClose={hideAlert}
            onConfirm={alertState.onConfirm}
        />
    );

    return {
        alertState,
        hideAlert,
        alert: { success, error, warning, info, confirm },
        // Top-level shortcuts for backward compatibility
        success,
        error,
        warning,
        info,
        confirm,
        AlertComponent,
    };
}
