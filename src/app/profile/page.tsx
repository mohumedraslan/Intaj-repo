'use client';

import { useState } from 'react';
import '@/styles/profile.css';
import { TwoFactorSetup } from '@/components/security/TwoFactorSetup';

export default function ProfilePage() {
  const [aiModel, setAiModel] = useState('gpt4');
  const [responseStyle, setResponseStyle] = useState('professional');
  const [saveMessage, setSaveMessage] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);

  const handleSaveChanges = () => {
    setSaveMessage('Saved successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handlePhotoUpload = () => {
    setUploadingPhoto(true);
    setTimeout(() => {
      setUploadingPhoto(false);
      setSaveMessage('Profile photo updated!');
      setTimeout(() => setSaveMessage(''), 3000);
    }, 2000);
  };

  return (
    <div className="min-h-screen neural-grid pt-24 pb-12">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-float delay-2000"></div>
      </div>

      {/* Success Message */}
      {saveMessage && (
        <div 
          role="alert"
          aria-live="polite"
          className="fixed top-20 right-6 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-slide-up"
        >
          {saveMessage}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="mb-8 animate-slide-up">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-gradient">Profile Settings</span>
          </h1>
          <p className="text-gray-400">Manage your account, preferences, and AI automation settings</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="glass-card p-8 rounded-2xl text-center animate-slide-up">
              {/* Profile Avatar */}
              <div className="relative mb-6">
                <div className="w-32 h-32 profile-avatar rounded-full mx-auto mb-4 flex items-center justify-center">
                  <div className="w-28 h-28 bg-bg-primary rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                </div>
                <button
                  className="absolute bottom-2 right-6 w-8 h-8 gradient-neural rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
                  aria-label="Edit profile photo"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                  </svg>
                </button>
              </div>

              <h2 className="text-2xl font-bold mb-2">Alex Johnson</h2>
              <p className="text-gray-400 mb-4">alex@company.com</p>
              
              {/* Status Badge */}
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-600/20 to-cyan-600/20 px-4 py-2 rounded-full mb-6">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-400 font-medium">Pro Plan Active</span>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gradient">5</div>
                  <div className="text-xs text-gray-400">Active Bots</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gradient">3</div>
                  <div className="text-xs text-gray-400">Channels</div>
                </div>
              </div>

              <button
                className="gradient-neural w-full px-6 py-3 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
                onClick={handlePhotoUpload}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
              </button>
            </div>
          </div>

          {/* Settings Panels */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Information */}
            <div className="glass-card p-8 rounded-2xl animate-slide-up">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 gradient-neural rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold">Account Information</h3>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                  <input
                    id="fullName"
                    type="text"
                    defaultValue="Alex Johnson"
                    className="w-full bg-bg-tertiary border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none transition-colors input-focus"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    defaultValue="alex@company.com"
                    className="w-full bg-bg-tertiary border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none transition-colors input-focus"
                    placeholder="Enter your email address"
                  />
                </div>
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-2">Company</label>
                  <input
                    id="company"
                    type="text"
                    defaultValue="TechCorp Inc."
                    className="w-full bg-bg-tertiary border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none transition-colors input-focus"
                    placeholder="Enter your company name"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                  <input
                    id="phone"
                    type="tel"
                    defaultValue="+1 (555) 123-4567"
                    className="w-full bg-bg-tertiary border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none transition-colors input-focus"
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  className="gradient-neural px-6 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
                  onClick={handleSaveChanges}
                >
                  Save Changes
                </button>
              </div>
            </div>

            {/* AI Preferences */}
            <div className="glass-card p-8 rounded-2xl animate-slide-up">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold">AI Preferences</h3>
              </div>

              <div className="space-y-6">
                <div>
                  <label htmlFor="aiModel" className="block text-sm font-medium text-gray-300 mb-3">Default AI Model</label>
                  <select
                    id="aiModel"
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    className="w-full bg-bg-tertiary border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none transition-colors input-focus"
                  >
                    <option value="gpt4">GPT-4 Turbo (Recommended)</option>
                    <option value="claude">Claude 3.5 Sonnet</option>
                    <option value="gemini">Gemini Pro</option>
                    <option value="mistral">Mistral Large</option>
                  </select>
                </div>

                <div role="radiogroup" aria-label="Response Style">
                  <label className="block text-sm font-medium text-gray-300 mb-3">Response Style</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['professional', 'friendly', 'creative'].map((style) => (
                      <button
                        key={style}
                        onClick={() => setResponseStyle(style)}
                        role="radio"
                        aria-checked={responseStyle === style}
                        className={`${
                          responseStyle === style
                            ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                            : 'bg-bg-tertiary border-gray-600 text-gray-300'
                        } border px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:border-purple-500 capitalize`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Auto-Response Speed</label>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-400">Slow</span>
                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                      <div className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full w-3/4"></div>
                    </div>
                    <span className="text-sm text-gray-400">Fast</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Settings */}
            <div className="glass-card p-8 rounded-2xl animate-slide-up">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold">Security & Privacy</h3>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Two-Factor Authentication</div>
                    <div className="text-sm text-gray-400">Add an extra layer of security</div>
                  </div>
                  <button 
                    className="gradient-neural px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
                    onClick={() => setShowTwoFactorSetup(true)}
                  >
                    Enable 2FA
                  </button>
                </div>

                <hr className="border-gray-700" />

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Data Export</div>
                    <div className="text-sm text-gray-400">Download your chat data and settings</div>
                  </div>
                  <button className="bg-bg-tertiary border border-gray-600 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:border-blue-500 transition-colors">
                    Export Data
                  </button>
                </div>

                <hr className="border-gray-700" />

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-red-400">Delete Account</div>
                    <div className="text-sm text-gray-400">Permanently delete your account and data</div>
                  </div>
                  <button className="bg-red-600/20 border border-red-500 text-red-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600/30 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
          </div>
      </div>

      {/* 2FA Setup Dialog */}
      {showTwoFactorSetup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="max-w-md w-full mx-4">
            <TwoFactorSetup 
              onComplete={() => {
                setShowTwoFactorSetup(false);
                setSaveMessage('Two-factor authentication has been enabled.');
              }}
              onCancel={() => setShowTwoFactorSetup(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}