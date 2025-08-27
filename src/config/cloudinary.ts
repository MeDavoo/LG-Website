// Cloudinary configuration
// To set up Cloudinary:
// 1. Sign up at https://cloudinary.com/users/register/free
// 2. Go to your Dashboard to get your Cloud Name
// 3. Go to Settings > Upload > Add upload preset
// 4. Create an "Unsigned" upload preset (no authentication required)
// 5. Replace the values below with your actual Cloudinary settings

export const CLOUDINARY_CONFIG = {
  // Your actual Cloudinary cloud name
  CLOUD_NAME: 'dpxlbcjql',
  
  // You still need to create an unsigned upload preset
  // Go to Settings > Upload > Add upload preset in your Cloudinary dashboard
  UPLOAD_PRESET: 'pokemon_uploads', // You'll create this next
  
  // Optional: You can set a default folder for all uploads
  DEFAULT_FOLDER: 'pokemon-images'
};

// Example of what your values might look like:
// CLOUD_NAME: 'lg-website-pokemon'
// UPLOAD_PRESET: 'pokemon_uploads'
