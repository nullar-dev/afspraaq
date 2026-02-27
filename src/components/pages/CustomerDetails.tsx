'use client';

import React, { useState } from 'react';
import { User, Mail, Phone, MapPin, FileText, Lock, Check, Shield } from 'lucide-react';
import { useBooking } from '@/context/BookingContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const CustomerDetails: React.FC = () => {
  const { state, dispatch } = useBooking();
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [completedFields, setCompletedFields] = useState<string[]>([]);

  const handleInputChange = (field: keyof typeof state.customerDetails, value: string) => {
    dispatch({ type: 'SET_CUSTOMER_DETAILS', payload: { [field]: value } });

    // Track completed fields for animation
    if (value.trim() && !completedFields.includes(field)) {
      setCompletedFields([...completedFields, field]);
    } else if (!value.trim() && completedFields.includes(field)) {
      setCompletedFields(completedFields.filter(f => f !== field));
    }
  };

  const inputClasses = (fieldName: string) => `
    bg-[#1E1E1E] border-2 text-white placeholder:text-[#4A4A4A] 
    transition-all duration-300 rounded-xl py-5 sm:py-6 px-4 sm:px-5
    ${
      focusedField === fieldName
        ? 'border-gold shadow-gold ring-2 ring-gold/20'
        : 'border-[#2A2A2A] hover:border-[#3A3A3A]'
    }
    ${completedFields.includes(fieldName) ? 'border-green-500/50' : ''}
  `;

  const formFields = [
    { id: 'firstName', label: 'First Name', icon: User, placeholder: 'John', type: 'text' },
    { id: 'lastName', label: 'Last Name', icon: User, placeholder: 'Doe', type: 'text' },
    {
      id: 'email',
      label: 'Email Address',
      icon: Mail,
      placeholder: 'john@example.com',
      type: 'email',
    },
    { id: 'phone', label: 'Phone Number', icon: Phone, placeholder: '(555) 123-4567', type: 'tel' },
  ];

  const addressFields = [
    { id: 'address', label: 'Street Address', icon: MapPin, placeholder: '123 Main Street' },
    { id: 'city', label: 'City', placeholder: 'New York' },
    { id: 'state', label: 'State', placeholder: 'NY' },
    { id: 'zipCode', label: 'ZIP Code', placeholder: '10001' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8 sm:mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center animate-pulse-gold">
            <User className="w-5 h-5 text-[#0A0A0A]" />
          </div>
          <span className="text-gold text-sm font-semibold uppercase tracking-wider">
            Step 4 of 5
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
          Customer Details
        </h2>
        <p className="text-[#B0B0B0] text-base sm:text-lg max-w-2xl">
          Please provide your contact and billing information. We&apos;ll use this to confirm your
          appointment.
        </p>
      </div>

      <div className="bg-gradient-to-br from-[#141414] to-[#0F0F0F] rounded-2xl border border-[#2A2A2A] p-5 sm:p-8 lg:p-10">
        <form className="space-y-6 sm:space-y-8">
          {/* Personal Info Section */}
          <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <h3 className="text-white font-semibold text-lg mb-4 sm:mb-5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                <User className="w-4 h-4 text-gold" />
              </div>
              Personal Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {formFields.map((field, index) => (
                <div
                  key={field.id}
                  className="space-y-2"
                  style={{ animationDelay: `${(index + 1) * 100}ms` }}
                >
                  <Label
                    htmlFor={field.id}
                    className={`text-sm font-medium flex items-center gap-2 transition-colors ${
                      focusedField === field.id ? 'text-gold' : 'text-[#B0B0B0]'
                    }`}
                  >
                    <field.icon className="w-4 h-4" />
                    {field.label}
                  </Label>
                  <div className="relative">
                    <Input
                      id={field.id}
                      type={field.type}
                      placeholder={field.placeholder}
                      value={state.customerDetails[field.id as keyof typeof state.customerDetails]}
                      onChange={e =>
                        handleInputChange(
                          field.id as keyof typeof state.customerDetails,
                          e.target.value
                        )
                      }
                      onFocus={() => setFocusedField(field.id)}
                      onBlur={() => setFocusedField(null)}
                      className={inputClasses(field.id)}
                    />
                    {completedFields.includes(field.id) && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-scale-in">
                        <Check className="w-5 h-5 text-green-500" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#2A2A2A] to-transparent" />

          {/* Address Section */}
          <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <h3 className="text-white font-semibold text-lg mb-4 sm:mb-5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-gold" />
              </div>
              Billing Address
            </h3>

            <div className="space-y-4 sm:space-y-5">
              {/* Full width address */}
              <div className="space-y-2">
                <Label
                  htmlFor="address"
                  className={`text-sm font-medium flex items-center gap-2 transition-colors ${
                    focusedField === 'address' ? 'text-gold' : 'text-[#B0B0B0]'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  Street Address
                </Label>
                <div className="relative">
                  <Input
                    id="address"
                    type="text"
                    placeholder="123 Main Street"
                    value={state.customerDetails.address}
                    onChange={e => handleInputChange('address', e.target.value)}
                    onFocus={() => setFocusedField('address')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('address')}
                  />
                  {completedFields.includes('address') && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-scale-in">
                      <Check className="w-5 h-5 text-green-500" />
                    </div>
                  )}
                </div>
              </div>

              {/* City, State, ZIP */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                {addressFields.slice(1).map(field => (
                  <div key={field.id} className="space-y-2">
                    <Label
                      htmlFor={field.id}
                      className={`text-sm font-medium transition-colors ${
                        focusedField === field.id ? 'text-gold' : 'text-[#B0B0B0]'
                      }`}
                    >
                      {field.label}
                    </Label>
                    <div className="relative">
                      <Input
                        id={field.id}
                        type="text"
                        placeholder={field.placeholder}
                        value={
                          state.customerDetails[field.id as keyof typeof state.customerDetails]
                        }
                        onChange={e =>
                          handleInputChange(
                            field.id as keyof typeof state.customerDetails,
                            e.target.value
                          )
                        }
                        onFocus={() => setFocusedField(field.id)}
                        onBlur={() => setFocusedField(null)}
                        className={inputClasses(field.id)}
                      />
                      {completedFields.includes(field.id) && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-scale-in">
                          <Check className="w-5 h-5 text-green-500" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#2A2A2A] to-transparent" />

          {/* Special Requests */}
          <div className="animate-fade-in-up" style={{ animationDelay: '500ms' }}>
            <h3 className="text-white font-semibold text-lg mb-4 sm:mb-5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-gold" />
              </div>
              Special Requests
              <span className="text-[#6B6B6B] text-sm font-normal">(Optional)</span>
            </h3>

            <div className="space-y-2">
              <Textarea
                id="specialRequests"
                placeholder="Any specific concerns or requests for your vehicle..."
                value={state.customerDetails.specialRequests}
                onChange={e => handleInputChange('specialRequests', e.target.value)}
                onFocus={() => setFocusedField('specialRequests')}
                onBlur={() => setFocusedField(null)}
                className={`${inputClasses('specialRequests')} min-h-[120px] resize-none`}
              />
            </div>
          </div>
        </form>
      </div>

      {/* Security Note - Enhanced */}
      <div
        className="mt-6 sm:mt-8 flex items-start gap-4 p-4 sm:p-5 rounded-xl bg-gradient-to-r from-[#141414] to-transparent border border-[#2A2A2A] animate-fade-in-up"
        style={{ animationDelay: '600ms' }}
      >
        <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
          <Shield className="w-6 h-6 text-green-500" />
        </div>
        <div>
          <h4 className="text-white font-semibold mb-1 flex items-center gap-2">
            <Lock className="w-4 h-4 text-gold" />
            Your Information is Secure
          </h4>
          <p className="text-[#6B6B6B] text-sm leading-relaxed">
            All data is encrypted with 256-bit SSL and will only be used to confirm your
            appointment. We never share your information with third parties.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetails;
