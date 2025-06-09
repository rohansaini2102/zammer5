# Zammer Deployment Checklist

## Backend (Render) Configuration

### Environment Variables Required on Render:
```bash
# Server Configuration
PORT=5000
NODE_ENV=production

# Database
MONGO_URI=mongodb+srv://wintertailsmanrdjiima:bpY9xRpJoBy1gRYR@zammer.pumbd8u.mongodb.net/?retryWrites=true&w=majority&appName=zammer

# JWT Secret
JWT_SECRET=zammer_marketplace_9X7bPq2R5sT8vZ3wK6jH1mN4cF0dL5aE

# Email Configuration
EMAIL_USER=udditkantsinha@gmail.com
EMAIL_PASS=bwzn snqd lfbb mpyy
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=dxrtru40n
CLOUDINARY_API_KEY=769431259298731
CLOUDINARY_API_SECRET=hcXoin0cBZh9oAH1BlUJsrR6bc0
CLOUDINARY_URL=cloudinary://769431259298731:hcXoin0cBZh9oAH1BlUJsrR6bc0@dxrtru40n

# Frontend URL (update this with your actual frontend deployment URL)
FRONTEND_URL=https://your-frontend-domain.com
```

### CORS Configuration Updated:
✅ Added `https://zammer5.onrender.com` to allowed origins in both `app.js` and `server.js`
✅ Added regex patterns for common deployment platforms (Vercel, Netlify, Amplify)

## Frontend Configuration

### Environment Variables (.env):
✅ Updated `REACT_APP_API_URL` to `https://zammer5.onrender.com/api`
✅ API fallback is enabled for better reliability
✅ Local API URL remains for development

### API Configuration:
- The frontend uses an intelligent API fallback system
- Primary URL: `https://zammer5.onrender.com/api`
- Fallback URL: `http://localhost:5000/api` (for development)
- Automatic switching between endpoints based on availability

## Deployment Steps:

### Backend (Render):
1. Push your latest code to GitHub
2. In Render dashboard, add all environment variables listed above
3. Update `FRONTEND_URL` with your actual frontend deployment URL
4. Deploy the backend service

### Frontend:
1. Build the frontend: `npm run build`
2. Deploy to your chosen platform (Vercel, Netlify, Amplify, etc.)
3. Update backend CORS if using a custom domain

## Important Notes:

1. **CORS**: Once you deploy your frontend, add its URL to the CORS allowed origins in:
   - `/backend/app.js` (line 32-40)
   - `/backend/server.js` (line 34-40)

2. **Environment Variables**: Never commit `.env` files to Git. Use `.env.example` as reference.

3. **API Fallback**: The frontend will automatically switch between primary and fallback APIs if one fails.

4. **Socket.IO**: Real-time features will work across domains with the current CORS setup.

5. **SSL/HTTPS**: Render provides HTTPS by default. Ensure your frontend also uses HTTPS.

## Testing After Deployment:

1. Test user registration and login
2. Test seller registration and login
3. Test product creation and image uploads
4. Test real-time order notifications
5. Test cart and checkout functionality
6. Check browser console for CORS errors

## Troubleshooting:

- **CORS Errors**: Add the frontend domain to allowed origins
- **API Connection Failed**: Check environment variables and API URL
- **Socket.IO Not Connecting**: Verify CORS settings in server.js
- **Image Upload Issues**: Verify Cloudinary credentials