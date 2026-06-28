import React, { useState } from 'react';
import { Section, InputField, Button, Modal } from '../SettingsComponents';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export const SecurityTab = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showLogoutSessions, setShowLogoutSessions] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    // Handle password change
    console.log('Password changed');
  };

  return (
    <div className="space-y-8">
      <Section 
        title="Change Password"
        description="Update your password to keep your account secure."
      >
        <form onSubmit={handlePasswordSubmit} className="space-y-6">
          <div className="space-y-4">
            <InputField
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <InputField
              label="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <InputField
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary">
              Update password
            </Button>
          </div>
        </form>
      </Section>

      <Section 
        title="Two-Factor Authentication"
        description="Add an extra layer of security to your account."
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Two-factor authentication</p>
            <p className="text-sm text-gray-500">
              {twoFactorEnabled 
                ? 'Two-factor authentication is currently enabled.'
                : 'Two-factor authentication is currently disabled.'}
            </p>
          </div>
          <Button 
            variant={twoFactorEnabled ? 'secondary' : 'primary'}
            onClick={() => setShow2FAModal(true)}
          >
            {twoFactorEnabled ? 'Disable' : 'Enable'} 2FA
          </Button>
        </div>
      </Section>

      <Section 
        title="Active Sessions"
        description="This is a list of devices that have logged into your account."
      >
        <div className="overflow-hidden bg-white shadow sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            <li>
              <div className="flex items-center px-4 py-4 sm:px-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      Chrome on Windows
                    </p>
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Current session
                    </span>
                  </div>
                  <div className="mt-1 flex items-center text-sm text-gray-500">
                    <p>Last active: Just now</p>
                    <span className="mx-1">·</span>
                    <p>IP: 192.168.1.1</p>
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <Button variant="secondary" size="sm" onClick={() => setShowLogoutSessions(true)}>
                    Log out other sessions
                  </Button>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </Section>

      <Section 
        title="Danger Zone"
        description="These actions are irreversible. Please be certain."
        className="border-red-200 bg-red-50 rounded-lg p-6 -mx-6"
      >
        <div className="space-y-4">
          <div className="md:flex md:items-center md:justify-between">
            <div className="max-w-xl">
              <p className="text-sm font-medium text-gray-900">Delete account</p>
              <p className="text-sm text-gray-500">
                Permanently delete your account and all of your data. This action cannot be undone.
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Button 
                variant="danger" 
                onClick={() => setShowDeleteAccount(true)}
              >
                Delete account
              </Button>
            </div>
          </div>
        </div>
      </Section>

      {/* 2FA Modal */}
      <Modal 
        isOpen={show2FAModal} 
        onClose={() => setShow2FAModal(false)}
        title={twoFactorEnabled ? 'Disable Two-Factor Authentication' : 'Enable Two-Factor Authentication'}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            {twoFactorEnabled
              ? 'Are you sure you want to disable two-factor authentication?'
              : 'Scan the QR code with your authenticator app to enable two-factor authentication.'}
          </p>
          
          {!twoFactorEnabled && (
            <div className="flex justify-center py-4">
              {/* QR Code Placeholder */}
              <div className="bg-gray-200 p-4 rounded">
                <div className="w-48 h-48 bg-white flex items-center justify-center">
                  <p className="text-xs text-gray-500 text-center">QR Code would be displayed here</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
            <Button 
              variant="primary" 
              onClick={() => {
                setTwoFactorEnabled(!twoFactorEnabled);
                setShow2FAModal(false);
              }}
              className="w-full justify-center"
            >
              {twoFactorEnabled ? 'Disable' : 'Enable'} 2FA
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => setShow2FAModal(false)}
              className="mt-3 sm:mt-0 w-full justify-center"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Logout Other Sessions Modal */}
      <Modal 
        isOpen={showLogoutSessions} 
        onClose={() => setShowLogoutSessions(false)}
        title="Log out other sessions"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Please enter your password to confirm you would like to log out of your other sessions across all of your devices.
          </p>
          <InputField
            label="Password"
            type="password"
            required
            className="mt-4"
          />
          <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
            <Button 
              variant="danger" 
              onClick={() => {
                // Handle logout other sessions
                setShowLogoutSessions(false);
              }}
              className="w-full justify-center"
            >
              Log out other sessions
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => setShowLogoutSessions(false)}
              className="mt-3 sm:mt-0 w-full justify-center"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Account Modal */}
      <Modal 
        isOpen={showDeleteAccount} 
        onClose={() => setShowDeleteAccount(false)}
        title="Delete account"
      >
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">Are you sure?</h3>
              <div className="mt-2 text-sm text-gray-500">
                <p>This action cannot be undone. This will permanently delete your account and all of your data.</p>
              </div>
            </div>
          </div>
          
          <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
            <Button 
              variant="danger" 
              onClick={() => {
                // Handle account deletion
                setShowDeleteAccount(false);
              }}
              className="w-full justify-center"
            >
              Yes, delete my account
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => setShowDeleteAccount(false)}
              className="mt-3 sm:mt-0 w-full justify-center"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SecurityTab;
