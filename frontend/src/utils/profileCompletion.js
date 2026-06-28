/**
 * Profile Completion Utility
 * Checks if a user's profile is complete based on their role
 */

export const checkProfileCompletion = (user) => {
  if (!user) return { isComplete: false, missingFields: [] };

  const missingFields = [];

  // Common required fields for all users
  if (!user.name || user.name.trim() === '') {
    missingFields.push('Name');
  }

  if (!user.phone || user.phone.trim() === '') {
    missingFields.push('Phone');
  }

  if (!user.location || user.location.trim() === '') {
    missingFields.push('Location');
  }

  // Role-specific requirements
  if (user.role === 'ROLE_CANDIDATE') {
    if (!user.summary || user.summary.trim() === '') {
      missingFields.push('Professional Summary');
    }

    if (!user.skills || user.skills.length === 0) {
      missingFields.push('Skills');
    }

    if (!user.experience || user.experience.length === 0) {
      missingFields.push('Work Experience');
    }

    if (!user.education || user.education.length === 0) {
      missingFields.push('Education');
    }
  } else if (user.role === 'ROLE_EMPLOYER') {
    // For employers, we might want to check company info
    // This can be expanded based on your requirements
  }

  // Calculate completion percentage based on role
  let totalFields = 4; // name, phone, location, and role-specific fields
  if (user.role === 'ROLE_CANDIDATE') {
    totalFields = 7; // name, phone, location, summary, skills, experience, education
  } else if (user.role === 'ROLE_EMPLOYER') {
    totalFields = 4; // name, phone, location (can add more employer-specific fields later)
  }

  const completionPercentage = Math.max(0, Math.round(
    ((totalFields - missingFields.length) / totalFields) * 100
  ));

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    completionPercentage,
  };
};

