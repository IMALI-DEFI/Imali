// src/components/enterprise/EnterpriseOnboardingWizard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEnterprise } from '../../hooks/useEnterprise';

const EnterpriseOnboardingWizard = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { loading: apiLoading } = useEnterprise();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Step 1: Organization Info
    organization_name: '',
    website: '',
    industry: 'financial_services',
    team_size: '1-10',
    
    // Step 2: Contact Info
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    job_title: '',
    
    // Step 3: Requirements
    use_case: 'financial_literacy',
    desired_features: [],
    estimated_users: '1-10',
    budget_range: '500-1000',
    
    // Step 4: Integration Needs
    exchanges: [],
    dex_enabled: false,
    stocks_enabled: false,
    
    // Step 5: Branding
    has_domain: false,
    custom_domain: '',
    has_logo: false,
    
    // Legal
    accepted_terms: false,
  });
  
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [requestId, setRequestId] = useState(null);

  const industries = [
    { value: 'financial_services', label: 'Financial Services', icon: '🏦' },
    { value: 'crypto_exchange', label: 'Crypto Exchange', icon: '🪙' },
    { value: 'trading_community', label: 'Trading Community', icon: '👥' },
    { value: 'fintech', label: 'Fintech Platform', icon: '📱' },
    { value: 'educational', label: 'Educational Platform', icon: '📚' },
    { value: 'investment_club', label: 'Investment Club', icon: '🤝' },
    { value: 'other', label: 'Other', icon: '💼' },
  ];

  const useCases = [
    { value: 'financial_literacy', label: 'Financial Literacy Program', description: 'Teach users about trading in a safe environment' },
    { value: 'workforce_training', label: 'Workforce Training', description: 'Train employees on trading strategies' },
    { value: 'small_business', label: 'Small Business Support', description: 'Offer trading tools to business clients' },
    { value: 'innovation_sandbox', label: 'Innovation Sandbox', description: 'Test and develop new trading strategies' },
    { value: 'education', label: 'School / Education Program', description: 'Integrate into curriculum' },
    { value: 'white_label', label: 'White Label Platform', description: 'Launch your own branded trading platform' },
  ];

  const features = [
    { id: 'custom_branding', label: 'Custom Branding', icon: '🎨', description: 'Your logo, colors, and domain' },
    { id: 'admin_panel', label: 'Admin Panel', icon: '⚙️', description: 'Full user management and controls' },
    { id: 'enhanced_bot_controls', label: 'Enhanced Bot Controls', icon: '🤖', description: 'Customize strategy parameters' },
    { id: 'team_permissions', label: 'Team Permissions', icon: '👥', description: 'Admin/member/viewer roles' },
    { id: 'audit_logs', label: 'Audit Logs', icon: '📋', description: 'Track all organization activity' },
    { id: 'analytics', label: 'Advanced Analytics', icon: '📊', description: 'Organization-wide performance metrics' },
    { id: 'priority_support', label: 'Priority Support', icon: '⭐', description: '24/7 dedicated support' },
    { id: 'custom_strategies', label: 'Custom Strategies', icon: '📈', description: 'Build proprietary strategies' },
  ];

  const exchanges = [
    { id: 'alpaca', name: 'Alpaca', icon: '🦙', description: 'Stocks & ETFs', enabled: true },
    { id: 'okx', name: 'OKX', icon: '🟢', description: 'Crypto (CEX)', enabled: true },
    { id: 'binance', name: 'Binance', icon: '🟡', description: 'Crypto (CEX) - Coming Soon', enabled: false },
    { id: 'coinbase', name: 'Coinbase', icon: '🔵', description: 'Crypto - Coming Soon', enabled: false },
  ];

  const updateForm = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const toggleFeature = (featureId) => {
    setFormData(prev => ({
      ...prev,
      desired_features: prev.desired_features.includes(featureId)
        ? prev.desired_features.filter(f => f !== featureId)
        : [...prev.desired_features, featureId]
    }));
  };

  const toggleExchange = (exchangeId) => {
    setFormData(prev => ({
      ...prev,
      exchanges: prev.exchanges.includes(exchangeId)
        ? prev.exchanges.filter(e => e !== exchangeId)
        : [...prev.exchanges, exchangeId]
    }));
  };

  const validateStep = () => {
    const newErrors = {};
    
    if (currentStep === 1) {
      if (!formData.organization_name.trim()) newErrors.organization_name = 'Organization name is required';
      if (!formData.industry) newErrors.industry = 'Please select an industry';
    }
    
    if (currentStep === 2) {
      if (!formData.contact_name.trim()) newErrors.contact_name = 'Contact name is required';
      if (!formData.contact_email.trim()) newErrors.contact_email = 'Email is required';
      if (!/^\S+@\S+\.\S+$/.test(formData.contact_email)) newErrors.contact_email = 'Valid email is required';
      if (!formData.job_title) newErrors.job_title = 'Job title is required';
    }
    
    if (currentStep === 5) {
      if (!formData.accepted_terms) newErrors.accepted_terms = 'You must accept the terms to continue';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep()) {
      setCurrentStep(prev => Math.min(prev + 1, 6));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    
    setLoading(true);
    try {
      const result = await signup({
        email: formData.contact_email,
        mode: 'enterprise',
        organization_name: formData.organization_name,
        contact_name: formData.contact_name,
        use_case: formData.use_case,
        company_size: formData.team_size,
        desired_features: formData.desired_features,
        accepted_terms: true,
      });
      
      if (result.success) {
        setSubmitted(true);
        setRequestId(result.request_id);
      } else {
        alert(result.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Signup error:', error);
      alert('Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    const titles = {
      1: 'Organization Details',
      2: 'Contact Information',
      3: 'Requirements',
      4: 'Integrations',
      5: 'Branding & Domain',
      6: 'Review & Submit',
    };
    return titles[currentStep];
  };

  const getStepDescription = () => {
    const descriptions = {
      1: 'Tell us about your organization',
      2: 'How can we reach you?',
      3: 'What features do you need?',
      4: 'Which exchanges do you want to connect?',
      5: 'Customize your branded experience',
      6: 'Review your request before submitting',
    };
    return descriptions[currentStep];
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-gray-800/50 backdrop-blur rounded-2xl border border-gray-700 p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-white mb-2">Request Received!</h2>
          <p className="text-gray-300 mb-4">
            Thank you for your interest in IMALI Enterprise. Our team will review your request and contact you shortly.
          </p>
          {requestId && (
            <p className="text-xs text-gray-500 mb-6">Request ID: {requestId}</p>
          )}
          <div className="bg-gray-700/50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-300 mb-2">📧 What happens next?</p>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>✅ Our team reviews your request (within 24 hours)</li>
              <li>✅ We'll schedule a demo call</li>
              <li>✅ We'll prepare a custom proposal</li>
              <li>✅ You'll get access to a test environment</li>
            </ul>
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-4 py-1 mb-4">
            <span className="text-indigo-400 text-sm">🏢</span>
            <span className="text-indigo-300 text-sm font-medium">Enterprise Onboarding</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Launch Your Branded Trading Platform
          </h1>
          <p className="text-gray-400">
            Get a custom white-label solution in minutes
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {[1, 2, 3, 4, 5, 6].map(step => (
              <div key={step} className="text-center flex-1">
                <div className={`text-xs font-medium ${
                  step <= currentStep ? 'text-indigo-400' : 'text-gray-600'
                }`}>
                  Step {step}
                </div>
              </div>
            ))}
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 6) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-gray-800/50 backdrop-blur rounded-2xl border border-gray-700 p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white">{getStepTitle()}</h2>
            <p className="text-gray-400 mt-1">{getStepDescription()}</p>
          </div>

          {/* Step 1: Organization Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Organization Name *
                </label>
                <input
                  type="text"
                  value={formData.organization_name}
                  onChange={(e) => updateForm('organization_name', e.target.value)}
                  placeholder="e.g., Acme Trading Inc."
                  className={`w-full px-4 py-3 bg-gray-900 border ${errors.organization_name ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
                {errors.organization_name && (
                  <p className="text-red-400 text-sm mt-1">{errors.organization_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Industry *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {industries.map(industry => (
                    <button
                      key={industry.value}
                      type="button"
                      onClick={() => updateForm('industry', industry.value)}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition ${
                        formData.industry === industry.value
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-gray-700 bg-gray-900 hover:bg-gray-800'
                      }`}
                    >
                      <span className="text-2xl">{industry.icon}</span>
                      <span className="text-white">{industry.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Website (Optional)
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => updateForm('website', e.target.value)}
                    placeholder="https://yourcompany.com"
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Team Size
                  </label>
                  <select
                    value={formData.team_size}
                    onChange={(e) => updateForm('team_size', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="1-10">Just me (1-10)</option>
                    <option value="11-50">Small team (11-50)</option>
                    <option value="51-200">Medium team (51-200)</option>
                    <option value="201-500">Large team (201-500)</option>
                    <option value="500+">Enterprise (500+)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Contact Info */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => updateForm('contact_name', e.target.value)}
                    placeholder="John Doe"
                    className={`w-full px-4 py-3 bg-gray-900 border ${errors.contact_name ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  />
                  {errors.contact_name && <p className="text-red-400 text-sm mt-1">{errors.contact_name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    value={formData.job_title}
                    onChange={(e) => updateForm('job_title', e.target.value)}
                    placeholder="CEO / Founder / Product Manager"
                    className={`w-full px-4 py-3 bg-gray-900 border ${errors.job_title ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  />
                  {errors.job_title && <p className="text-red-400 text-sm mt-1">{errors.job_title}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => updateForm('contact_email', e.target.value)}
                    placeholder="john@acme.com"
                    className={`w-full px-4 py-3 bg-gray-900 border ${errors.contact_email ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  />
                  {errors.contact_email && <p className="text-red-400 text-sm mt-1">{errors.contact_email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => updateForm('contact_phone', e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  How did you hear about us?
                </label>
                <select
                  value={formData.referral_source}
                  onChange={(e) => updateForm('referral_source', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select an option</option>
                  <option value="google">Google Search</option>
                  <option value="reddit">Reddit</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="twitter">Twitter/X</option>
                  <option value="friend">Friend/Colleague</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Requirements */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Primary Use Case *
                </label>
                <select
                  value={formData.use_case}
                  onChange={(e) => updateForm('use_case', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {useCases.map(uc => (
                    <option key={uc.value} value={uc.value}>{uc.label}</option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-2">
                  {useCases.find(uc => uc.value === formData.use_case)?.description}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Desired Features *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {features.map(feature => (
                    <button
                      key={feature.id}
                      type="button"
                      onClick={() => toggleFeature(feature.id)}
                      className={`flex items-start gap-3 p-3 rounded-lg border text-left transition ${
                        formData.desired_features.includes(feature.id)
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-gray-700 bg-gray-900 hover:bg-gray-800'
                      }`}
                    >
                      <span className="text-xl">{feature.icon}</span>
                      <div>
                        <div className="text-white font-medium">{feature.label}</div>
                        <div className="text-xs text-gray-400">{feature.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Estimated Users
                  </label>
                  <select
                    value={formData.estimated_users}
                    onChange={(e) => updateForm('estimated_users', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="1-10">1-10 users</option>
                    <option value="11-50">11-50 users</option>
                    <option value="51-200">51-200 users</option>
                    <option value="201-1000">201-1,000 users</option>
                    <option value="1000+">1,000+ users</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Monthly Budget Range
                  </label>
                  <select
                    value={formData.budget_range}
                    onChange={(e) => updateForm('budget_range', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="500-1000">$500 - $1,000</option>
                    <option value="1000-2500">$1,000 - $2,500</option>
                    <option value="2500-5000">$2,500 - $5,000</option>
                    <option value="5000+">$5,000+</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Integrations */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Which exchanges do you want to support?
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {exchanges.map(exchange => (
                    <button
                      key={exchange.id}
                      type="button"
                      onClick={() => exchange.enabled && toggleExchange(exchange.id)}
                      disabled={!exchange.enabled}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition ${
                        !exchange.enabled
                          ? 'border-gray-700 bg-gray-900 opacity-50 cursor-not-allowed'
                          : formData.exchanges.includes(exchange.id)
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-gray-700 bg-gray-900 hover:bg-gray-800'
                      }`}
                    >
                      <span className="text-2xl">{exchange.icon}</span>
                      <div className="flex-1 text-left">
                        <div className="text-white font-medium">{exchange.name}</div>
                        <div className="text-xs text-gray-400">{exchange.description}</div>
                      </div>
                      {!exchange.enabled && (
                        <span className="text-xs text-yellow-500">Coming Soon</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <h4 className="text-white font-medium mb-3">Additional Integrations</h4>
                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-white">DEX Support (Uniswap-style)</span>
                      <p className="text-xs text-gray-400">Decentralized exchange trading</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.dex_enabled}
                      onChange={(e) => updateForm('dex_enabled', e.target.checked)}
                      className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-600 rounded"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-white">Stock Trading (Alpaca)</span>
                      <p className="text-xs text-gray-400">US equities and ETFs</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.stocks_enabled}
                      onChange={(e) => updateForm('stocks_enabled', e.target.checked)}
                      className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-600 rounded"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Branding & Domain */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <h4 className="text-white font-medium mb-3">Custom Branding</h4>
                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-white">Custom Domain</span>
                      <p className="text-xs text-gray-400">Use your own domain (e.g., trade.yourcompany.com)</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.has_domain}
                      onChange={(e) => updateForm('has_domain', e.target.checked)}
                      className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-600 rounded"
                    />
                  </label>
                  {formData.has_domain && (
                    <input
                      type="text"
                      value={formData.custom_domain}
                      onChange={(e) => updateForm('custom_domain', e.target.value)}
                      placeholder="trade.yourcompany.com"
                      className="w-full mt-2 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🎨</span>
                  <div>
                    <h5 className="text-blue-300 font-medium mb-1">White-Label Preview</h5>
                    <p className="text-sm text-gray-300 mb-3">
                      Your organization will get:
                    </p>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>✓ Custom logo on dashboard</li>
                      <li>✓ Your brand colors throughout</li>
                      <li>✓ Custom favicon</li>
                      <li>✓ "Powered by IMALI" can be removed</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💰</span>
                  <div>
                    <h5 className="text-yellow-300 font-medium mb-1">Reddit Special Offer</h5>
                    <p className="text-sm text-gray-300">
                      Mention you found us on Reddit and we'll waive the $2,500 setup fee!
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.accepted_terms}
                    onChange={(e) => updateForm('accepted_terms', e.target.checked)}
                    className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-600 rounded"
                  />
                  <span className="text-gray-300 text-sm">
                    I agree to the <a href="/terms" target="_blank" className="text-indigo-400 hover:underline">Terms of Service</a> and <a href="/privacy" target="_blank" className="text-indigo-400 hover:underline">Privacy Policy</a>
                  </span>
                </label>
                {errors.accepted_terms && (
                  <p className="text-red-400 text-sm mt-2">{errors.accepted_terms}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 6: Review */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <h4 className="text-white font-medium mb-3">Organization Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-700">
                    <span className="text-gray-400">Organization:</span>
                    <span className="text-white font-medium">{formData.organization_name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-700">
                    <span className="text-gray-400">Industry:</span>
                    <span className="text-white">{industries.find(i => i.value === formData.industry)?.label}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-700">
                    <span className="text-gray-400">Contact:</span>
                    <span className="text-white">{formData.contact_name} ({formData.contact_email})</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-700">
                    <span className="text-gray-400">Use Case:</span>
                    <span className="text-white">{useCases.find(uc => uc.value === formData.use_case)?.label}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-700">
                    <span className="text-gray-400">Team Size:</span>
                    <span className="text-white">{formData.team_size}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-400">Features:</span>
                    <span className="text-white text-right">
                      {formData.desired_features.length} selected
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4 text-center">
                <p className="text-indigo-300 text-sm">
                  Our team will review your request and contact you within 24 hours to schedule a demo.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-700">
            {currentStep > 1 && (
              <button
                onClick={prevStep}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition"
              >
                ← Back
              </button>
            )}
            {currentStep < 6 ? (
              <button
                onClick={nextStep}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition ml-auto"
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition ml-auto disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Request →'}
              </button>
            )}
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-8 text-center">
          <div className="flex justify-center gap-8 text-sm text-gray-500">
            <span>🔒 256-bit Encryption</span>
            <span>⚡ 24h Response Time</span>
            <span>🏢 Enterprise SLA Available</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseOnboardingWizard;
