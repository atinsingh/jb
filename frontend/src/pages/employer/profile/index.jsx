'use client';

import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { LoadingState, ErrorState, InlineError } from '@/components/employer/EmployerStates';
import { employerProfileApi } from '@/services/employerApi';

const EMPTY_FORM = { name: '', phone: '', location: '', summary: '' };

/* ------------------------------------------------------------- ui atoms --- */
const monoLabel = { fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286' };
const blueBtn = { display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff', background: '#4263EB', border: 'none', borderRadius: 999, padding: '9px 16px', cursor: 'pointer' };
const ghostBtn = { fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '9px 15px', cursor: 'pointer' };
const fieldInput = { width: '100%', fontFamily: 'inherit', fontSize: 13.5, color: '#1B1A16', background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 10, padding: '10px 12px' };
const fieldLabel = { ...monoLabel, display: 'block', marginBottom: 6 };
const cardStyle = { background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, overflow: 'hidden' };

const svgProps = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
const Icon = {
  mail: <svg {...svgProps}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M4 7 l8 6 l8 -6" /></svg>,
  phone: <svg {...svgProps}><path d="M5 4 h3 l1.5 4 l-2 1.5 a11 11 0 0 0 5 5 l1.5 -2 l4 1.5 v3 a1.5 1.5 0 0 1 -1.5 1.5 A15 15 0 0 1 3.5 5.5 A1.5 1.5 0 0 1 5 4 Z" /></svg>,
  pin: <svg {...svgProps}><path d="M12 21 s-6.5 -5.5 -6.5 -10.5 a6.5 6.5 0 0 1 13 0 C18.5 15.5 12 21 12 21 Z" /><circle cx="12" cy="10.5" r="2.3" /></svg>,
};

export default function EmployerProfile() {
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Password change
  const [showPassword, setShowPassword] = useState(false);
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '' });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState(null);
  const [pwdOk, setPwdOk] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await employerProfileApi.get();
      const u = res?.user || {};
      setProfile(u);
      setFormData({
        name: u.name || '',
        phone: u.phone || '',
        location: u.location || '',
        summary: u.summary || '',
      });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const res = await employerProfileApi.update(formData);
      const u = res?.user || { ...profile, ...formData };
      setProfile(u);
      setFormData({
        name: u.name || '',
        phone: u.phone || '',
        location: u.location || '',
        summary: u.summary || '',
      });
      setIsEditing(false);
    } catch (err) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: profile.name || '',
      phone: profile.phone || '',
      location: profile.location || '',
      summary: profile.summary || '',
    });
    setSaveError(null);
    setIsEditing(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdSaving(true);
    setPwdError(null);
    setPwdOk(false);
    try {
      await employerProfileApi.changePassword(pwd.currentPassword, pwd.newPassword);
      setPwd({ currentPassword: '', newPassword: '' });
      setShowPassword(false);
      setPwdOk(true);
    } catch (err) {
      setPwdError(err);
    } finally {
      setPwdSaving(false);
    }
  };

  const initials = (profile?.name || profile?.email || 'JB')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || 'JB';

  return (
    <>
      <Head>
        <title>My Profile · Jobocate for Employers</title>
      </Head>

      <style jsx global>{`
        #emapp ::-webkit-scrollbar { width: 8px; }
        #emapp ::-webkit-scrollbar-thumb { background: #e1d9c9; border-radius: 8px; }
        #emapp input:focus, #emapp textarea:focus { outline: none; border-color: #4263eb; box-shadow: 0 0 0 3px rgba(66,99,235,0.14); }
        #emapp .em-blue-btn:hover { background: #364fc7 !important; }
        #emapp .em-ghost:hover { background: #f4efe4 !important; }
        #emapp .em-link:hover { color: #364fc7 !important; }
        @keyframes emrise { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div id="emapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: 'var(--jb-font-sans)', color: '#1B1A16' }}>
        <EmployerSidebar active="team" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286' }}>Account · My Profile</span>
            <div style={{ flex: 1 }} />
            {!loading && !error && (
              !isEditing ? (
                <button type="button" onClick={() => setIsEditing(true)} className="em-blue-btn" style={blueBtn}>✎ Edit profile</button>
              ) : (
                <div style={{ display: 'flex', gap: 9 }}>
                  <button type="button" onClick={handleCancel} disabled={saving} className="em-ghost" style={{ ...ghostBtn, opacity: saving ? 0.5 : 1 }}>Cancel</button>
                  <button type="button" onClick={handleSubmit} disabled={saving} className="em-blue-btn" style={{ ...blueBtn, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save changes'}</button>
                </div>
              )
            )}
          </header>

          <div style={{ padding: '28px 32px 64px', maxWidth: 880, width: '100%', margin: '0 auto' }}>
            <div style={{ marginBottom: 22 }}>
              <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 36, lineHeight: 1, margin: '0 0 6px' }}>My profile</h1>
              <p style={{ fontSize: 14.5, color: '#5A544A', margin: 0 }}>Manage your personal information and sign-in credentials.</p>
            </div>

            {loading ? (
              <LoadingState label="Loading your profile…" />
            ) : error ? (
              <ErrorState error={error} onRetry={load} />
            ) : (
              <>
                {/* PROFILE INFORMATION */}
                <div style={{ ...cardStyle, marginBottom: 22 }}>
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid #F2ECE0' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Profile information</h3>
                    <p style={{ fontSize: 13, color: '#8A8378', margin: '3px 0 0' }}>Personal details and contact information.</p>
                  </div>
                  <div style={{ padding: 24 }}>
                    {saveError && <div style={{ marginBottom: 16 }}><InlineError error={saveError} /></div>}
                    <div style={{ display: 'flex', gap: 22, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div style={{ flexShrink: 0 }}>
                        <div style={{ width: 84, height: 84, borderRadius: '50%', overflow: 'hidden', background: '#4263EB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 26 }}>
                          {profile.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={profile.avatar} alt={profile.name || 'Avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            initials
                          )}
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 260 }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'emrise 0.2s ease' }}>
                            <div>
                              <label htmlFor="name" style={fieldLabel}>Full name</label>
                              <input type="text" name="name" id="name" style={fieldInput} value={formData.name} onChange={handleInputChange} />
                            </div>
                            <div>
                              <label style={fieldLabel}>Email address</label>
                              <input type="email" disabled style={{ ...fieldInput, background: '#F4EFE4', color: '#8A8378', cursor: 'not-allowed' }} value={profile.email || ''} />
                              <p style={{ fontSize: 11.5, color: '#A79E8F', margin: '6px 0 0' }}>Email changes require password confirmation and aren&apos;t available here.</p>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                              <div>
                                <label htmlFor="phone" style={fieldLabel}>Phone</label>
                                <input type="tel" name="phone" id="phone" style={fieldInput} value={formData.phone} onChange={handleInputChange} />
                              </div>
                              <div>
                                <label htmlFor="location" style={fieldLabel}>Location</label>
                                <input type="text" name="location" id="location" style={fieldInput} value={formData.location} onChange={handleInputChange} />
                              </div>
                            </div>
                            <div>
                              <label htmlFor="summary" style={fieldLabel}>Bio</label>
                              <textarea id="summary" name="summary" rows={4} style={{ ...fieldInput, resize: 'vertical', lineHeight: 1.6 }} value={formData.summary} onChange={handleInputChange} />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 12px', color: '#1B1A16' }}>{profile.name || 'Your name'}</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                              {profile.email && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 13.5, color: '#5A544A' }}>
                                  <span style={{ color: '#A79E8F' }}>{Icon.mail}</span>
                                  <a href={`mailto:${profile.email}`} className="em-link" style={{ color: '#4263EB', textDecoration: 'none', fontWeight: 600 }}>{profile.email}</a>
                                </span>
                              )}
                              {profile.phone && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 13.5, color: '#5A544A' }}>
                                  <span style={{ color: '#A79E8F' }}>{Icon.phone}</span>
                                  <a href={`tel:${profile.phone.replace(/\D/g, '')}`} className="em-link" style={{ color: '#5A544A', textDecoration: 'none' }}>{profile.phone}</a>
                                </span>
                              )}
                              {profile.location && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 13.5, color: '#5A544A' }}>
                                  <span style={{ color: '#A79E8F' }}>{Icon.pin}</span>{profile.location}
                                </span>
                              )}
                            </div>
                            <div style={{ borderTop: '1px solid #F2ECE0', marginTop: 18, paddingTop: 18 }}>
                              <div style={{ ...monoLabel, marginBottom: 8 }}>About</div>
                              <p style={{ fontSize: 14, lineHeight: 1.65, color: '#3A352C', margin: 0, whiteSpace: 'pre-line' }}>{profile.summary || 'No bio added yet.'}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ACCOUNT INFORMATION */}
                <div style={cardStyle}>
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid #F2ECE0' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Account</h3>
                    <p style={{ fontSize: 13, color: '#8A8378', margin: '3px 0 0' }}>Settings and preferences.</p>
                  </div>
                  <div style={{ padding: 24 }}>
                    {/* Change password */}
                    <div style={{ borderBottom: profile.createdAt ? '1px solid #F2ECE0' : 'none', paddingBottom: profile.createdAt ? 20 : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 3px' }}>Change password</h4>
                          <p style={{ fontSize: 13, color: '#8A8378', margin: 0 }}>Update the password you use to sign in.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setShowPassword((v) => !v); setPwdError(null); setPwdOk(false); }}
                          className="em-ghost"
                          style={ghostBtn}
                        >
                          {showPassword ? 'Close' : 'Update'}
                        </button>
                      </div>
                      {pwdOk && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 12, fontSize: 12.5, fontWeight: 600, color: '#157A49', background: '#EAF6EE', border: '1px solid #CDE9D6', borderRadius: 999, padding: '6px 12px' }}>✓ Password updated.</div>
                      )}
                      {showPassword && (
                        <form onSubmit={handleChangePassword} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14, animation: 'emrise 0.2s ease' }}>
                          {pwdError && <InlineError error={pwdError} />}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                            <div>
                              <label htmlFor="currentPassword" style={fieldLabel}>Current password</label>
                              <input type="password" id="currentPassword" required style={fieldInput} value={pwd.currentPassword} onChange={(e) => setPwd((p) => ({ ...p, currentPassword: e.target.value }))} />
                            </div>
                            <div>
                              <label htmlFor="newPassword" style={fieldLabel}>New password</label>
                              <input type="password" id="newPassword" required minLength={8} style={fieldInput} value={pwd.newPassword} onChange={(e) => setPwd((p) => ({ ...p, newPassword: e.target.value }))} />
                            </div>
                          </div>
                          <div>
                            <button type="submit" disabled={pwdSaving} className="em-blue-btn" style={{ ...blueBtn, opacity: pwdSaving ? 0.6 : 1 }}>{pwdSaving ? 'Updating…' : 'Update password'}</button>
                          </div>
                        </form>
                      )}
                    </div>

                    {/* Account created */}
                    {profile.createdAt && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 20 }}>
                        <div>
                          <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 3px' }}>Account created</h4>
                          <p style={{ fontSize: 13, color: '#8A8378', margin: 0 }}>
                            {new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: '#157A49', background: '#EAF6EE', border: '1px solid #CDE9D6', padding: '4px 10px', borderRadius: 999 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1FA463' }} />ACTIVE
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
