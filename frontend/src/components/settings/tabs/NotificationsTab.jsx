import React, { useState } from 'react';
import { Section, Toggle } from '../SettingsComponents';

export const NotificationsTab = () => {
  const [notifications, setNotifications] = useState({
    email: true,
    marketing: false,
    security: true,
    updates: true
  });

  const toggleNotification = (key) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="space-y-8">
      <Section 
        title="Email Notifications"
        description="Manage when you'll receive email notifications from Jobocate."
      >
        <div className="space-y-4">
          <Toggle
            label="Account activity"
            description="Get notified about changes to your account."
            enabled={notifications.email}
            setEnabled={() => toggleNotification('email')}
          />
          <Toggle
            label="Marketing emails"
            description="Receive updates about new features and products."
            enabled={notifications.marketing}
            setEnabled={() => toggleNotification('marketing')}
          />
          <Toggle
            label="Security alerts"
            description="Be notified about important security changes."
            enabled={notifications.security}
            setEnabled={() => toggleNotification('security')}
          />
          <Toggle
            label="Product updates"
            description="Get the latest news and updates."
            enabled={notifications.updates}
            setEnabled={() => toggleNotification('updates')}
          />
        </div>
      </Section>

      <Section title="Push Notifications">
        <div className="space-y-4">
          <Toggle
            label="Enable push notifications"
            description="Receive notifications in your browser."
            enabled={true}
            setEnabled={() => {}}
          />
        </div>
      </Section>
    </div>
  );
};

export default NotificationsTab;
