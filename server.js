
require('dotenv').config();
const querystring = require('querystring');
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
      console.log('Your liked songs:', songsData);
      
      // Send response to client
      res.json(songsData);
      
  } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Failed to fetch data' });
  }
});


app.listen(8888, () => {
  console.log('Server is running on http://localhost:8888');
});
