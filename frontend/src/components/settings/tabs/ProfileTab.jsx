import React, { useState } from 'react';
import { Section, InputField, Button } from '../SettingsComponents';

export const ProfileTab = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    phone: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
    console.log('Form submitted:', formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Section 
        title="Personal Information"
        description="Update your personal information and contact details."
      >
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div className="sm:col-span-3">
            <InputField
              label="First name"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="sm:col-span-3">
            <InputField
              label="Last name"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="sm:col-span-4">
            <InputField
              label="Email address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="sm:col-span-3">
            <InputField
              label="Company"
              name="company"
              value={formData.company}
              onChange={handleChange}
            />
          </div>
          <div className="sm:col-span-3">
            <InputField
              label="Phone number"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>
        </div>
      </Section>

      <div className="pt-5">
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="secondary">
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Save changes
          </Button>
        </div>
      </div>
    </form>
  );
};

export default ProfileTab;
