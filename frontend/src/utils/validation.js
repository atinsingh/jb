const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format

export const validateEmail = (email) => {
  if (!email) return 'Email is required';
  if (!emailRegex.test(email)) return 'Please enter a valid email address';
  return '';
};

export const validateRequired = (value, fieldName) => {
  if (!value || value.trim() === '') return `${fieldName} is required`;
  return '';
};

export const validatePhone = (phone) => {
  if (!phone) return 'Phone number is required';
  if (!phoneRegex.test(phone)) return 'Please enter a valid phone number';
  return '';
};

export const validatePassword = (password) => {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters long';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  if (!/[!@#$%^&*]/.test(password)) return 'Password must contain at least one special character (!@#$%^&*)';
  return '';
};

export const validateConfirmPassword = (password, confirmPassword) => {
  if (password !== confirmPassword) return 'Passwords do not match';
  return '';
};

export const validateForm = (formData, validations) => {
  const errors = {};
  let isValid = true;

  Object.keys(validations).forEach((field) => {
    const value = formData[field];
    const fieldValidations = validations[field];
    
    for (const validation of fieldValidations) {
      const error = validation.validator(value, formData);
      if (error) {
        errors[field] = error;
        isValid = false;
        break;
      }
    }
  });

  return { errors, isValid };
};

// Common validation rules
export const commonValidations = {
  email: [
    { validator: (value) => validateRequired(value, 'Email'), field: 'email' },
    { validator: validateEmail, field: 'email' },
  ],
  password: [
    { validator: (value) => validateRequired(value, 'Password'), field: 'password' },
    { validator: validatePassword, field: 'password' },
  ],
  confirmPassword: [
    { 
      validator: (value, formData) => validateConfirmPassword(formData.password, value), 
      field: 'confirmPassword' 
    },
  ],
  firstName: [
    { validator: (value) => validateRequired(value, 'First name'), field: 'firstName' },
  ],
  lastName: [
    { validator: (value) => validateRequired(value, 'Last name'), field: 'lastName' },
  ],
  company: [
    { validator: (value) => validateRequired(value, 'Company'), field: 'company' },
  ],
  phone: [
    { validator: (value) => validateRequired(value, 'Phone'), field: 'phone' },
    { validator: validatePhone, field: 'phone' },
  ],
};
