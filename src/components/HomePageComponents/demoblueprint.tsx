import React, { useState } from 'react';
import { Calendar, CheckCircle, User, Mail } from 'lucide-react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase.js'; // Adjust path to your Firebase config

// Declare gtag and dataLayer for TypeScript
declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: any) => void;
    dataLayer: any[];
  }
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
}

const DemoSignup: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Function to track Google Analytics and Google Ads conversions
  const trackConversion = () => {
    if (typeof window !== 'undefined' && window.gtag) {
      // Track Google Analytics 4 event using your existing tag
      window.gtag('event', 'BluePrint_Submitted', {
        event_category: 'Lead Generation',
        event_label: 'BluePrint Form Submitted',
        value: 2500,
        custom_parameters: {
          user_name: `${formData.firstName} ${formData.lastName}`,
          user_email: formData.email
        }
      });

      // Track Google Ads conversion using your existing Google tag
      // The conversion will automatically be linked to your Google Ads account
      // Replace CONVERSION_LABEL with the label from your Google Ads conversion action
      window.gtag('event', 'conversion', {
        send_to: 'GT-W6JK86Z9/CONVERSION_LABEL', // Use your existing tag ID with the conversion label
        value: 2500.0,
        currency: 'USD',
        transaction_id: `demo_${Date.now()}_${formData.email}` // Unique transaction ID to prevent duplicates
      });

      console.log('Conversion tracked using existing Google tag');
    }

    // Backup method: Using Google Tag Manager dataLayer (if you're also using GTM)
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push({
        event: 'BluePrint_Submitted',
        event_category: 'Lead Generation',
        event_label: 'BluePrint Form Submitted',
        conversion_value: 2500,
        user_data: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email
        },
        transaction_id: `demo_${Date.now()}_${formData.email}`
      });

      console.log('Conversion data pushed to dataLayer');
    }

    if (!window.gtag && !window.dataLayer) {
      console.warn('Neither gtag nor dataLayer found - conversion tracking may not be working');
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      // Save to Firebase Firestore with email fields for Trigger Email extension
      await addDoc(collection(db, 'demo_requests'), {
        // Hardcoded email fields for the Trigger Email extension
        to: 'matthew.paris@lemaraisadvisory.com', // Email
        message: {
          subject: 'New BluePrint Demo Request',
          html: `
            <h2>New BluePrint Demo Request</h2>
            <p><strong>Name:</strong> ${formData.firstName} ${formData.lastName}</p>
            <p><strong>Email:</strong> ${formData.email}</p>
            <p><strong>Message:</strong> ${formData.message || 'No additional message provided'}</p>
            <p><strong>Submitted:</strong> ${new Date().toLocaleDateString()}</p>
          `,
          text: `New BluePrint Request from ${formData.firstName} ${formData.lastName} (${formData.email}): ${formData.message || 'No additional message provided'}`
        },
        
        // Your existing fields (keeping the same structure)
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        additionalMessage: formData.message, // Renamed to avoid conflict
        timestamp: Timestamp.now(),
        status: 'pending'
      });

      console.log('Demo request saved to Firebase');
      
      // Track Google Analytics conversion
      trackConversion();
      
      setIsSubmitted(true);
      
      // Open calendar link after a brief delay
      setTimeout(() => {
        window.open('https://calendar.app.google/8oroGtzDTBAB8PtX9', '_blank');
      }, 1000);

    } catch (error) {
      console.error('Error saving demo request:', error);
      // You might want to show an error message to the user here
      alert('There was an error submitting your request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      message: ''
    });
    setIsSubmitted(false);
    setErrors({});
  };

  if (isSubmitted) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="mb-6">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
          <p className="text-gray-600">
            Your request has been submitted successfully. You'll be redirected to our calendar to schedule your meeting.
          </p>
        </div>
        
        <div className="space-y-4">
          <a
            href="https://calendar.app.google/8oroGtzDTBAB8PtX9"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            onClick={() => {
              // Track calendar click
              if (typeof window !== 'undefined' && window.gtag) {
                window.gtag('event', 'calendar_click', {
                  event_category: 'Lead Generation',
                  event_label: 'Schedule Meeting Button'
                });
              }
            }}
          >
            <Calendar className="w-5 h-5 mr-2" />
            Schedule a meeting now
          </a>
          
          <button
            onClick={resetForm}
            className="w-full px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8">
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Talk to an expert</h2>
        <p className="text-gray-600">
          BluePrint Request 
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
              First Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.firstName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="John"
              />
            </div>
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
              Last Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.lastName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Doe"
              />
            </div>
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address *
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="john@company.com"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
            Additional Information
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
            placeholder="Tell us about your specific needs or questions..."
          />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full font-semibold py-3 px-6 rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
            isSubmitting 
              ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isSubmitting ? 'Submitting...' : 'Talk to an Expert'}
        </button>
      </div>

      <p className="mt-4 text-xs text-gray-500 text-center">
        By submitting this form, you agree to be contacted about our services.
      </p>
    </div>
  );
};

export default DemoSignup;