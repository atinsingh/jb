'use client'

import { useState } from 'react';
import { XMarkIcon, PaintBrushIcon } from '@heroicons/react/24/outline';
import { Field, FieldGroup, Label } from '@/components/catalyst/fieldset';
import { Button } from '@/components/catalyst/button';

export default function TemplateSettings({ isOpen, onClose, settings, onSettingsChange }) {
  if (!isOpen) return null;

  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    onSettingsChange(localSettings);
    onClose();
  };

  const colorSchemes = [
    { value: 'blue', label: 'Blue', color: 'bg-blue-600' },
    { value: 'green', label: 'Green', color: 'bg-green-600' },
    { value: 'purple', label: 'Purple', color: 'bg-purple-600' },
    { value: 'orange', label: 'Orange', color: 'bg-orange-600' },
    { value: 'red', label: 'Red', color: 'bg-red-600' },
    { value: 'indigo', label: 'Indigo', color: 'bg-indigo-600' },
  ];

  const fonts = [
    { value: 'inter', label: 'Inter', font: 'font-sans' },
    { value: 'roboto', label: 'Roboto', font: 'font-sans' },
    { value: 'playfair', label: 'Playfair Display', font: 'font-serif' },
    { value: 'lato', label: 'Lato', font: 'font-sans' },
    { value: 'montserrat', label: 'Montserrat', font: 'font-sans' },
  ];

  const fontSizes = [
    { value: 'small', label: 'Small', size: 'text-sm' },
    { value: 'medium', label: 'Medium', size: 'text-base' },
    { value: 'large', label: 'Large', size: 'text-lg' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <PaintBrushIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-950">Template Settings</h3>
                <p className="text-sm text-zinc-500">Customize your resume appearance</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5 text-zinc-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <FieldGroup>
              {/* Color Scheme */}
              <Field>
                <Label>Color Scheme</Label>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  {colorSchemes.map((scheme) => (
                    <button
                      key={scheme.value}
                      onClick={() => setLocalSettings(prev => ({ ...prev, colorScheme: scheme.value }))}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                        localSettings.colorScheme === scheme.value
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full ${scheme.color}`} />
                      <span className="text-sm font-medium text-zinc-700">{scheme.label}</span>
                    </button>
                  ))}
                </div>
              </Field>

              {/* Font Family */}
              <Field>
                <Label>Font Family</Label>
                <select
                  value={localSettings.fontFamily}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, fontFamily: e.target.value }))}
                  className="mt-2 block w-full rounded-lg border-zinc-300 py-2.5 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                >
                  {fonts.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </Field>

              {/* Font Size */}
              <Field>
                <Label>Font Size</Label>
                <div className="mt-2 flex gap-3">
                  {fontSizes.map((size) => (
                    <button
                      key={size.value}
                      onClick={() => setLocalSettings(prev => ({ ...prev, fontSize: size.value }))}
                      className={`flex-1 py-2.5 px-4 rounded-lg border-2 transition-all ${
                        localSettings.fontSize === size.value
                          ? 'border-blue-600 bg-blue-50 text-blue-600'
                          : 'border-zinc-200 hover:border-zinc-300 text-zinc-700'
                      }`}
                    >
                      <span className={`${size.size} font-medium`}>{size.label}</span>
                    </button>
                  ))}
                </div>
              </Field>
            </FieldGroup>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-200">
            <Button onClick={onClose} plain>
              Cancel
            </Button>
            <Button onClick={handleSave} color="blue">
              Apply Settings
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

