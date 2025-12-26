export default function handler(req, res) {
  // Enable CORS for your frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  // Return the API key
  res.status(200).json({
    apiKey: process.env.GOOGLE_MAPS_API_KEY
  });
}
