import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Bars3Icon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

const sectionsList = [
    { id: 'personal', label: 'Personal Details' },
    { id: 'summary', label: 'Professional Summary' },
    { id: 'experience', label: 'Experience' },
    { id: 'education', label: 'Education' },
    { id: 'skills', label: 'Skills' },
    { id: 'projects', label: 'Projects' },
];

function SortableSection({ id, label, onClick, isActive }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="mb-2">
            <div
                className={`bg-white border rounded-lg overflow-hidden ${isActive ? 'border-indigo-600 ring-1 ring-indigo-600' : 'border-gray-200 hover:border-gray-300'}`}
            >
                <div className="flex items-center p-3 bg-gray-50 cursor-pointer" onClick={onClick}>
                    <div {...attributes} {...listeners} className="mr-3 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing">
                        <Bars3Icon className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-gray-700 flex-1">{label}</span>
                    {isActive ? <ChevronUpIcon className="w-4 h-4 text-gray-500" /> : <ChevronDownIcon className="w-4 h-4 text-gray-500" />}
                </div>
            </div>
        </div>
    );
}

export default function EditorSidebar({ resume, onUpdate, activeTab, setActiveTab }) {
    const [expandedSection, setExpandedSection] = useState('personal');

    // If resume doesn't have sectionsOrder, use default
    const sectionsOrder = resume?.sectionsOrder || sectionsList.map(s => s.id);

    const handleSectionClick = (id) => {
        setExpandedSection(expandedSection === id ? null : id);
    };

    const handleInputChange = (section, field, value) => {
        // Generic handler for flat fields (like personal details)
        // For array fields (experience), we need specialized handlers
        if (section === 'personal' || section === 'summary') return;
        // Logic is getting complex for one file.
        // Ideally, pass update up.
    };

    return (
        <div className="flex flex-col h-full">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-4">
                <button
                    onClick={() => setActiveTab('content')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'content' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Content
                </button>
                <button
                    onClick={() => setActiveTab('design')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'design' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Design
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'settings' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Settings
                </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto pr-2">
                {activeTab === 'content' && (
                    <SortableContext items={sectionsOrder} strategy={verticalListSortingStrategy}>
                        {sectionsOrder.map((sectionId) => {
                            const sectionDef = sectionsList.find(s => s.id === sectionId) || { id: sectionId, label: sectionId };
                            const isActive = expandedSection === sectionId;
                            return (
                                <div key={sectionId}>
                                    <SortableSection
                                        id={sectionId}
                                        label={sectionDef.label}
                                        isActive={isActive}
                                        onClick={() => handleSectionClick(sectionId)}
                                    />
                                    {isActive && (
                                        <div className="p-4 border-l-2 border-indigo-100 ml-4 mb-4 space-y-4">
                                            {/* Form Content Based on Section ID */}
                                            {sectionId === 'personal' && (
                                                <div className="space-y-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Full Name"
                                                        className="w-full p-2 border rounded"
                                                        value={resume?.fullName || ''}
                                                        onChange={(e) => onUpdate({ fullName: e.target.value })}
                                                    />
                                                    <input
                                                        type="email"
                                                        placeholder="Email"
                                                        className="w-full p-2 border rounded"
                                                        value={resume?.email || ''}
                                                        onChange={(e) => onUpdate({ email: e.target.value })}
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Phone"
                                                        className="w-full p-2 border rounded"
                                                        value={resume?.phone || ''}
                                                        onChange={(e) => onUpdate({ phone: e.target.value })}
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Location"
                                                        className="w-full p-2 border rounded"
                                                        value={resume?.location || ''}
                                                        onChange={(e) => onUpdate({ location: e.target.value })}
                                                    />
                                                </div>
                                            )}
                                            {sectionId === 'summary' && (
                                                <textarea
                                                    className="w-full p-2 border rounded h-32"
                                                    placeholder="Write your professional summary..."
                                                    value={resume?.summary || ''}
                                                    onChange={(e) => onUpdate({ summary: e.target.value })}
                                                />
                                            )}
                                            {/* Placeholder for complex sections */}
                                            {(sectionId !== 'personal' && sectionId !== 'summary') && (
                                                <div className="text-sm text-gray-500">
                                                    Complex section editing (Experience, Education, etc.) would go here.
                                                    For MVP, assuming JSON update or sub-forms.
                                                    <br />
                                                    <button className="text-indigo-600 hover:underline mt-2">+ Add Item</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </SortableContext>
                )}

                {activeTab === 'design' && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['modern', 'classic', 'minimal'].map(t => (
                                    <div
                                        key={t}
                                        onClick={() => onUpdate({ template: t })}
                                        className={`p-2 border rounded cursor-pointer text-center capitalize ${resume?.template === t ? 'border-indigo-600 bg-indigo-50' : 'hover:bg-gray-50'}`}
                                    >
                                        {t}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Accent Color</label>
                            <div className="flex gap-2">
                                {['#000000', '#4f46e5', '#ca8a04', '#16a34a', '#dc2626'].map(c => (
                                    <div
                                        key={c}
                                        onClick={() => onUpdate({ theme: { ...resume?.theme, color: c } })}
                                        className={`w-8 h-8 rounded-full cursor-pointer ring-2 ring-offset-2 ${resume?.theme?.color === c ? 'ring-gray-400' : 'ring-transparent'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
