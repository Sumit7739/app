import React from 'react';
import { Download } from 'lucide-react';

interface UpdateModalProps {
    version: string;
    notes?: string;
    url: string;
    forceUpdate: boolean;
    onClose: () => void;
}

const UpdateModal: React.FC<UpdateModalProps> = ({ version, notes, url, forceUpdate, onClose }) => {
    
    const handleDownload = () => {
        window.open(url, '_blank');
        if (!forceUpdate) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                        <Download size={32} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-black">Update Available</h2>
                    <p className="font-bold opacity-90 mt-1">Version {version}</p>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4 mb-6">
                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">What's New</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                            {notes || 'New features and improvements are available.'}
                        </p>
                    </div>

                    <div className="space-y-3">
                        <button 
                            onClick={handleDownload}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Download size={20} />
                            Download Update
                        </button>
                        
                        {!forceUpdate && (
                            <button 
                                onClick={onClose}
                                className="w-full py-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold text-sm transition-colors"
                            >
                                Skip for now
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpdateModal;
