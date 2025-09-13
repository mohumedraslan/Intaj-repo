'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, CheckCircle, AlertCircle, Lock, ArrowRight, ArrowLeft, CreditCard as CardIcon, Calendar, KeyRound } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    country: '',
    postalCode: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState({});
  const [isComplete, setIsComplete] = useState(false);

  // Sample plan data - in a real app, this would come from context or query params
  const plan = {
    name: 'Professional Plan',
    price: 49,
    billingCycle: 'monthly',
    features: [
      'Unlimited AI Agents',
      'Advanced Analytics',
      'Priority Support',
      'Custom Integrations',
      'Team Collaboration'
    ]
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const validateStep = () => {
    const newErrors = {};
    
    if (step === 1) {
      if (!formData.name.trim()) newErrors.name = 'Name is required';
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      else if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = 'Email is invalid';
    } else if (step === 2) {
      if (!formData.address.trim()) newErrors.address = 'Address is required';
      if (!formData.city.trim()) newErrors.city = 'City is required';
      if (!formData.country.trim()) newErrors.country = 'Country is required';
      if (!formData.postalCode.trim()) newErrors.postalCode = 'Postal code is required';
    } else if (step === 3 && paymentMethod === 'credit_card') {
      if (!formData.cardNumber.trim()) newErrors.cardNumber = 'Card number is required';
      else if (!/^\d{16}$/.test(formData.cardNumber.replace(/\s/g, ''))) {
        newErrors.cardNumber = 'Card number must be 16 digits';
      }
      
      if (!formData.cardExpiry.trim()) newErrors.cardExpiry = 'Expiry date is required';
      else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(formData.cardExpiry)) {
        newErrors.cardExpiry = 'Expiry date must be in MM/YY format';
      }
      
      if (!formData.cardCvc.trim()) newErrors.cardCvc = 'CVC is required';
      else if (!/^\d{3,4}$/.test(formData.cardCvc)) {
        newErrors.cardCvc = 'CVC must be 3 or 4 digits';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const nextStep = () => {
    if (validateStep()) {
      setStep(prev => prev + 1);
    }
  };
  
  const prevStep = () => {
    setStep(prev => prev - 1);
  };
  
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };
  
  const handleCardNumberChange = (e) => {
    const { value } = e.target;
    e.target.value = formatCardNumber(value);
    handleChange(e);
  };
  
  const handleCardExpiryChange = (e) => {
    const { value } = e.target;
    let newValue = value.replace(/[^0-9]/g, '');
    
    if (newValue.length > 2) {
      newValue = `${newValue.substring(0, 2)}/${newValue.substring(2, 4)}`;
    }
    
    e.target.value = newValue;
    handleChange(e);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep()) return;
    
    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      setIsComplete(true);
    }, 2000);
  };

  // Render different steps based on current step
  const renderStep = () => {
    if (isComplete) {
      return (
        <div className="text-center py-12">
          <div className="bg-green-500/20 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-400" />
          </div>
          <h3 className="text-2xl font-bold mb-4">Payment Successful!</h3>
          <p className="text-gray-300 mb-6">
            Thank you for your purchase. Your subscription has been activated.
          </p>
          <Link 
            href="/dashboard"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors inline-block"
          >
            Go to Dashboard
          </Link>
        </div>
      );
    }

    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold mb-4">Personal Information</h3>
            
            <div>
              <label htmlFor="name" className="block text-gray-300 mb-2">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full bg-gray-800/50 border ${errors.name ? 'border-red-500' : 'border-gray-700'} rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>
            
            <div>
              <label htmlFor="email" className="block text-gray-300 mb-2">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full bg-gray-800/50 border ${errors.email ? 'border-red-500' : 'border-gray-700'} rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>
            
            <div className="flex justify-end mt-8">
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold mb-4">Billing Address</h3>
            
            <div>
              <label htmlFor="address" className="block text-gray-300 mb-2">Street Address</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className={`w-full bg-gray-800/50 border ${errors.address ? 'border-red-500' : 'border-gray-700'} rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
              {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="city" className="block text-gray-300 mb-2">City</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className={`w-full bg-gray-800/50 border ${errors.city ? 'border-red-500' : 'border-gray-700'} rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
                {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
              </div>
              
              <div>
                <label htmlFor="postalCode" className="block text-gray-300 mb-2">Postal Code</label>
                <input
                  type="text"
                  id="postalCode"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  className={`w-full bg-gray-800/50 border ${errors.postalCode ? 'border-red-500' : 'border-gray-700'} rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
                {errors.postalCode && <p className="text-red-500 text-sm mt-1">{errors.postalCode}</p>}
              </div>
            </div>
            
            <div>
              <label htmlFor="country" className="block text-gray-300 mb-2">Country</label>
              <input
                type="text"
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className={`w-full bg-gray-800/50 border ${errors.country ? 'border-red-500' : 'border-gray-700'} rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
              {errors.country && <p className="text-red-500 text-sm mt-1">{errors.country}</p>}
            </div>
            
            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center justify-center px-6 py-3 border border-gray-600 hover:bg-gray-800 text-white rounded-lg transition-colors"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </button>
              
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold mb-4">Payment Method</h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  id="credit_card"
                  name="paymentMethod"
                  value="credit_card"
                  checked={paymentMethod === 'credit_card'}
                  onChange={() => setPaymentMethod('credit_card')}
                  className="h-5 w-5 text-blue-600"
                />
                <label htmlFor="credit_card" className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2 text-blue-400" />
                  Credit Card
                </label>
              </div>
            </div>
            
            {paymentMethod === 'credit_card' && (
              <div className="mt-6 space-y-6">
                <div className="relative">
                  <label htmlFor="cardNumber" className="block text-gray-300 mb-2">Card Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      id="cardNumber"
                      name="cardNumber"
                      value={formData.cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      className={`w-full bg-gray-800/50 border ${errors.cardNumber ? 'border-red-500' : 'border-gray-700'} rounded-lg pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                      <CardIcon className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                  {errors.cardNumber && <p className="text-red-500 text-sm mt-1">{errors.cardNumber}</p>}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label htmlFor="cardExpiry" className="block text-gray-300 mb-2">Expiry Date</label>
                    <div className="relative">
                      <input
                        type="text"
                        id="cardExpiry"
                        name="cardExpiry"
                        value={formData.cardExpiry}
                        onChange={handleCardExpiryChange}
                        placeholder="MM/YY"
                        maxLength={5}
                        className={`w-full bg-gray-800/50 border ${errors.cardExpiry ? 'border-red-500' : 'border-gray-700'} rounded-lg pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      />
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                        <Calendar className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                    {errors.cardExpiry && <p className="text-red-500 text-sm mt-1">{errors.cardExpiry}</p>}
                  </div>
                  
                  <div className="relative">
                    <label htmlFor="cardCvc" className="block text-gray-300 mb-2">CVC</label>
                    <div className="relative">
                      <input
                        type="text"
                        id="cardCvc"
                        name="cardCvc"
                        value={formData.cardCvc}
                        onChange={handleChange}
                        placeholder="123"
                        maxLength={4}
                        className={`w-full bg-gray-800/50 border ${errors.cardCvc ? 'border-red-500' : 'border-gray-700'} rounded-lg pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      />
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                        <KeyRound className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                    {errors.cardCvc && <p className="text-red-500 text-sm mt-1">{errors.cardCvc}</p>}
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center justify-center px-6 py-3 border border-gray-600 hover:bg-gray-800 text-white rounded-lg transition-colors"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </button>
              
              <button
                type="submit"
                disabled={isProcessing}
                className="flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                {isProcessing ? (
                  <>
                    <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>Complete Purchase</>
                )}
              </button>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="pt-32 pb-16 neural-grid relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float delay-2000"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <div className="animate-slide-up">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Complete Your <span className="text-gradient">Purchase</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-4xl mx-auto">
              You're just a few steps away from accessing our premium AI features.
            </p>
          </div>
        </div>
      </section>

      {/* Checkout Section */}
      <section className="py-16 bg-bg-secondary">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12">
            {/* Checkout Form */}
            <div className="md:col-span-2">
              <div className="glass-card p-8 rounded-2xl">
                {!isComplete && (
                  <div className="mb-8">
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center ${step >= 1 ? 'text-blue-500' : 'text-gray-500'}`}>
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'} mr-2`}>
                          1
                        </div>
                        <span>Personal</span>
                      </div>
                      <div className={`h-0.5 w-12 ${step >= 2 ? 'bg-blue-500' : 'bg-gray-700'}`}></div>
                      <div className={`flex items-center ${step >= 2 ? 'text-blue-500' : 'text-gray-500'}`}>
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'} mr-2`}>
                          2
                        </div>
                        <span>Address</span>
                      </div>
                      <div className={`h-0.5 w-12 ${step >= 3 ? 'bg-blue-500' : 'bg-gray-700'}`}></div>
                      <div className={`flex items-center ${step >= 3 ? 'text-blue-500' : 'text-gray-500'}`}>
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'} mr-2`}>
                          3
                        </div>
                        <span>Payment</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <form onSubmit={handleSubmit}>
                  {renderStep()}
                </form>
              </div>
            </div>
            
            {/* Order Summary */}
            <div className="md:col-span-1">
              <div className="glass-card p-8 rounded-2xl sticky top-24">
                <h3 className="text-xl font-semibold mb-6">Order Summary</h3>
                
                <div className="flex justify-between mb-4">
                  <span className="text-gray-300">{plan.name}</span>
                  <span className="font-medium">${plan.price}/{plan.billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
                
                <div className="border-t border-gray-700 my-4 pt-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-300">Subtotal</span>
                    <span className="font-medium">${plan.price}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-300">Tax</span>
                    <span className="font-medium">$0.00</span>
                  </div>
                </div>
                
                <div className="border-t border-gray-700 my-4 pt-4">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>${plan.price}</span>
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    Billed {plan.billingCycle}
                  </div>
                </div>
                
                <div className="mt-6 space-y-4">
                  <h4 className="font-medium">What's included:</h4>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="mt-6 flex items-center text-sm text-gray-400">
                  <Lock className="h-4 w-4 mr-2" />
                  Secure checkout with 256-bit encryption
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}