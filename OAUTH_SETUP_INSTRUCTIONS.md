# OAuth Setup Instructions for Preview Environment

## ✅ Configuration Updated!

The backend and frontend have been configured to use your preview URL:
- **Preview URL**: `https://843e7c48-27ec-472b-838a-c444758e23be.preview.emergentagent.com`
- **Backend API**: `https://843e7c48-27ec-472b-838a-c444758e23be.preview.emergentagent.com/api`

## 🔧 Required: Update Google OAuth Settings

You MUST update your Google OAuth redirect URI to work with the preview environment:

### Steps to Update Google Cloud Console:

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project

2. **Navigate to Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Find your OAuth 2.0 Client ID: `542775705311-cc194ucgvl2v1fbjenlngmskf5vsed1i.apps.googleusercontent.com`
   - Click on it to edit

3. **Update Authorized Redirect URIs**
   - Add this URL to "Authorized redirect URIs":
     ```
     https://843e7c48-27ec-472b-838a-c444758e23be.preview.emergentagent.com/api/auth/google/callback
     ```
   
4. **Also Add Authorized JavaScript Origins**
   - Add this URL to "Authorized JavaScript origins":
     ```
     https://843e7c48-27ec-472b-838a-c444758e23be.preview.emergentagent.com
     ```

5. **Save Changes**
   - Click "Save" button at the bottom
   - Wait 5-10 minutes for Google to propagate the changes

## 🧪 Testing OAuth

Once you've updated the Google settings (wait 5-10 minutes), test it:

1. **Open your preview app**: https://843e7c48-27ec-472b-838a-c444758e23be.preview.emergentagent.com/login

2. **Click "Continue with Google"**
   - Should redirect to Google login
   - After authentication, should redirect back to your app
   - Should land on `/auth/success` and then redirect to dashboard

3. **Check if user is created**
   - User should be created in MongoDB
   - JWT token should be stored in localStorage
   - Should see user profile in dashboard

## 🔍 Troubleshooting

**Error: "redirect_uri_mismatch"**
- Make sure you added the EXACT URL to Google Console
- Wait 5-10 minutes after adding the URL
- Clear browser cache and try again

**Error: "CORS error"**
- This should be fixed now with the updated FRONTEND_URL
- If persists, check browser console for exact error

**Error: "Cannot connect to backend"**
- Check backend logs: `sudo supervisorctl tail -f backend`
- Verify backend is running: `sudo supervisorctl status backend`
- Test API: `curl https://843e7c48-27ec-472b-838a-c444758e23be.preview.emergentagent.com/api/health`

## 📋 LinkedIn OAuth Setup (Optional)

If you want to enable LinkedIn sign-in:

1. **Create LinkedIn App**
   - Go to: https://www.linkedin.com/developers/apps
   - Create new app or use existing
   
2. **Configure OAuth Settings**
   - Add redirect URI:
     ```
     https://843e7c48-27ec-472b-838a-c444758e23be.preview.emergentagent.com/api/auth/linkedin/callback
     ```
   - Request access to "Sign In with LinkedIn using OpenID Connect"

3. **Add Credentials to Backend**
   - Edit `/app/backend/.env`
   - Add:
     ```
     LINKEDIN_CLIENT_ID=your_linkedin_client_id
     LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
     ```
   
4. **Restart Backend**
   ```bash
   sudo supervisorctl restart backend
   ```

## 🎯 Next Steps

1. Update Google OAuth redirect URI (required for testing)
2. Test Google sign-in on preview app
3. (Optional) Set up LinkedIn OAuth if needed
4. For production deployment, update URLs again with production domain

## 📝 Current Configuration

**Backend (.env):**
```
FRONTEND_URL=https://843e7c48-27ec-472b-838a-c444758e23be.preview.emergentagent.com
GOOGLE_CLIENT_ID=542775705311-cc194ucgvl2v1fbjenlngmskf5vsed1i.apps.googleusercontent.com
GOOGLE_REDIRECT_URI=https://843e7c48-27ec-472b-838a-c444758e23be.preview.emergentagent.com/api/auth/google/callback
```

**Frontend (.env.local):**
```
REACT_APP_BACKEND_URL=https://843e7c48-27ec-472b-838a-c444758e23be.preview.emergentagent.com
```

---

**Need help?** Check the backend logs or test the API endpoints directly!
