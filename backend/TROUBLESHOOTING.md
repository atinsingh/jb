# Troubleshooting 401 Unauthorized Error

## Common Issues and Solutions

### 1. Port Mismatch
**Problem**: You're accessing `http://localhost:8000` but the backend runs on port `8000`

**Solution**: 
- Check the backend port: The default is `8000` (see `main.ts`)
- Access the correct URL: `http://localhost:8000/api/users/profile`
- Or set `PORT=8000` in your `.env` file if you want to use port 8000

### 2. Missing or Incorrect Authorization Header
**Problem**: Token not sent correctly in the request

**Solution**: 
- Ensure the header is: `Authorization: Bearer <your-token>`
- The word "Bearer" (with capital B) and a space before the token is required
- Example: `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3. JWT_SECRET Mismatch
**Problem**: Token was signed with a different secret than the one used for validation

**Solution**:
- Ensure `JWT_SECRET` in `.env` matches the one used when the token was created
- If you changed the secret, you need to login again to get a new token

### 4. Token Expired
**Problem**: Token has passed its expiration time

**Solution**:
- Default expiration is 7 days (see `JWT_EXPIRES_IN` in `.env`)
- Login again to get a new token

### 5. User Not Found
**Problem**: Token is valid but user was deleted from database

**Solution**:
- Check if the user exists in the database
- Login again to create a new token with current user data

## How to Debug

### Check Logs
With the enhanced logging, you should see detailed error messages:

1. **Check if token is present**:
   ```
   [JwtAuthGuard] JWT token missing from Authorization header
   ```
   or
   ```
   [JwtAuthGuard] JWT token found in request
   ```

2. **Check token validation**:
   ```
   [JwtStrategy] Validating JWT payload: { id: ..., email: ... }
   [JwtStrategy] JWT validation successful - User found: ...
   ```
   or
   ```
   [JwtStrategy] JWT validation failed - User not found in database: ...
   ```

3. **Check specific errors**:
   ```
   [JwtAuthGuard] JWT validation info: TokenExpiredError
   [JwtAuthGuard] JWT validation info: JsonWebTokenError
   ```

### Test with cURL

```bash
# Replace YOUR_TOKEN with the actual token from login response
curl -X GET http://localhost:8000/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Test with Postman/Insomnia

1. Method: `GET`
2. URL: `http://localhost:8000/api/users/profile`
3. Headers:
   - `Authorization`: `Bearer <your-token>`
   - `Content-Type`: `application/json`

## Quick Checklist

- [ ] Using correct port (8000 by default, not 8000)
- [ ] Authorization header includes "Bearer " prefix
- [ ] Token is not expired
- [ ] JWT_SECRET matches between token creation and validation
- [ ] User exists in database
- [ ] Check application logs for detailed error messages

## Example Request

```bash
# 1. Login to get token
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Response: {"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}

# 2. Use token to access protected endpoint
curl -X GET http://localhost:8000/api/users/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

