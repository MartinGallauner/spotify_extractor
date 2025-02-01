
require('dotenv').config();
const querystring = require('querystring');
const fs = require('fs').promises;
var access_token

var express = require('express')
var app = express()


var client_id = process.env.SPOTIFY_CLIENT_ID;
var client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = 'http://localhost:8888/callback';

app.get('/login', function(req, res) {

    var scope = 'user-library-read';
  

    res.redirect('https://accounts.spotify.com/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
      }));
  });


app.get('/callback', async (req, res) => {
  const code = req.query.code;
  
  // Now exchange the code for an access token
  try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64')
          },
          body: querystring.stringify({
              code: code,
              redirect_uri: redirect_uri,
              grant_type: 'authorization_code'
          })
      });

      const data = await response.json();
      
      // setting access token
      access_token = data.access_token;
      
      // Fetch liked songs
      const songs = await fetch('https://api.spotify.com/v1/me/tracks', {
          headers: {
              'Authorization': 'Bearer ' + access_token
          }
      });
      
      const songsData = await songs.json();

      // Save the songs data to a JSON file
      const savedFilename = await saveSongsToJson(songsData);
        
      // Send response to client with the filename where data was saved
      res.json({
        message: 'Songs data saved successfully',
        filename: savedFilename,
        data: songsData
      });

      
  } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Failed to fetch data' });
  }
});


app.listen(8888, () => {
  console.log('Server is running on http://localhost:8888');
});

async function saveSongsToJson(songsData) {
  try {
      // Deep clean function to remove available_markets from any level of the object
      function cleanSpotifyData(obj) {
          // If this is an array, clean each item
          if (Array.isArray(obj)) {
              return obj.map(item => cleanSpotifyData(item));
          }
          
          // If this is an object, clean its properties
          if (obj && typeof obj === 'object') {
              const cleanedObj = {};
              for (const [key, value] of Object.entries(obj)) {
                  // Skip the available_markets field
                  if (key !== 'available_markets') {
                      cleanedObj[key] = cleanSpotifyData(value);
                  }
              }
              return cleanedObj;
          }
          
          // If it's neither an array nor an object, return as is
          return obj;
      }

      // Clean the data before saving
      const cleanedData = cleanSpotifyData(songsData);
      
      // Create a data folder if it doesn't exist
      await fs.mkdir('data', { recursive: true });
      
      // Format the cleaned data nicely with indentation
      const formattedData = JSON.stringify(cleanedData, null, 2);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `data/spotify-likes-${timestamp}.json`;
      
      await fs.writeFile(filename, formattedData, 'utf8');
      return filename;
  } catch (error) {
      console.error('Error saving songs:', error);
      throw error;
  }
}