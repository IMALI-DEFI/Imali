// src/components/enterprise/BrandingSettings.jsx
import React, { useState, useEffect } from 'react';
import { useEnterprise } from '../../hooks/useEnterprise';

const BrandingSettings = () => {
  const { getOrganization, updateBranding, loading } = useEnterprise();
  const [branding, setBranding] = useState({
    logo_url: '',
    primary_color: '#4f46e5',
    secondary_color: '#7c3aed',
    font_family: 'Inter',
    custom_css: '',
    dashboard_title: 'IMALI Enterprise',
    favicon_url: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadOrganization();
  }, []);

  const loadOrganization = async () => {
    const result = await getOrganization();
    if (result.success && result.data.custom_branding) {
      setBranding({ ...branding, ...result.data.custom_branding });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const result = await updateBranding(branding);
    
    if (result.success) {
      setMessage({ type: 'success', text: 'Branding updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update branding' });
    }
    
    setSaving(false);
  };

  const handleChange = (field, value) => {
    setBranding({ ...branding, [field]: value });
  };

  const colorPresets = [
    { name: 'Indigo', value: '#4f46e5' },
    { name: 'Purple', value: '#7c3aed' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f59e0b' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Teal', value: '#14b8a6' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custom Branding</h1>
          <p className="mt-2 text-sm text-gray-600">
            Customize the look and feel of your organization's dashboard
          </p>
        </div>
      </div>

      {message && (
        <div className={`mt-6 rounded-md p-4 ${message.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className={`text-sm ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
            {message.text}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* Logo Upload */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Logo & Icons</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo URL
              </label>
              <input
                type="url"
                value={branding.logo_url}
                onChange={(e) => handleChange('logo_url', e.target.value)}
                placeholder="https://your-domain.com/logo.png"
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter a URL to your organization's logo (recommended size: 200x50px)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Favicon URL
              </label>
              <input
                type="url"
                value={branding.favicon_url}
                onChange={(e) => handleChange('favicon_url', e.target.value)}
                placeholder="https://your-domain.com/favicon.ico"
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Colors */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Colors</h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Color
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={branding.primary_color}
                  onChange={(e) => handleChange('primary_color', e.target.value)}
                  className="h-10 w-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={branding.primary_color}
                  onChange={(e) => handleChange('primary_color', e.target.value)}
                  className="flex-1 block border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secondary Color
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={branding.secondary_color}
                  onChange={(e) => handleChange('secondary_color', e.target.value)}
                  className="h-10 w-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={branding.secondary_color}
                  onChange={(e) => handleChange('secondary_color', e.target.value)}
                  className="flex-1 block border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color Presets
            </label>
            <div className="flex flex-wrap gap-2">
              {colorPresets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => {
                    handleChange('primary_color', preset.value);
                  }}
                  className="w-8 h-8 rounded-full border-2 border-gray-300 hover:border-gray-400 transition"
                  style={{ backgroundColor: preset.value }}
                  title={preset.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Typography */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Typography</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dashboard Title
            </label>
            <input
              type="text"
              value={branding.dashboard_title}
              onChange={(e) => handleChange('dashboard_title', e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="IMALI Enterprise"
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Font Family
            </label>
            <select
              value={branding.font_family}
              onChange={(e) => handleChange('font_family', e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="Inter">Inter</option>
              <option value="Roboto">Roboto</option>
              <option value="Open Sans">Open Sans</option>
              <option value="Lato">Lato</option>
              <option value="Montserrat">Montserrat</option>
              <option value="Poppins">Poppins</option>
            </select>
          </div>
        </div>

        {/* Custom CSS */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Custom CSS</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional CSS
            </label>
            <textarea
              rows="6"
              value={branding.custom_css}
              onChange={(e) => handleChange('custom_css', e.target.value)}
              placeholder="/* Add your custom CSS here */"
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"
            />
            <p className="mt-1 text-xs text-gray-500">
              Add custom CSS to override default styles (use with caution)
            </p>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Preview</h3>
          <div 
            className="rounded-lg p-6 border"
            style={{
              backgroundColor: '#ffffff',
              fontFamily: branding.font_family,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              {branding.logo_url ? (
                <img src={branding.logo_url} alt="Logo" className="h-8 object-contain" />
              ) : (
                <div className="text-lg font-bold" style={{ color: branding.primary_color }}>
                  {branding.dashboard_title}
                </div>
              )}
              <div className="flex space-x-2">
                <button
                  className="px-4 py-2 rounded-md text-sm font-medium text-white"
                  style={{ backgroundColor: branding.primary_color }}
                >
                  Primary Button
                </button>
                <button
                  className="px-4 py-2 rounded-md text-sm font-medium"
                  style={{ backgroundColor: branding.secondary_color, color: '#ffffff' }}
                >
                  Secondary Button
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-2 rounded-full" style={{ backgroundColor: branding.primary_color }}></div>
              <div className="h-2 rounded-full w-2/3" style={{ backgroundColor: branding.secondary_color }}></div>
              <p className="text-sm text-gray-600">This is a preview of your custom branding.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BrandingSettings;