const express = require('express');
const bodyParser = require('body-parser');
const URL = require("url").URL
const crypto = require('crypto');
const dbURI ='mongodb+srv://vesteluser:HB0AjesCnY0x5HC0@url.eax8afa.mongodb.net/?retryWrites=true&w=majority';
const mongoose = require('mongoose');
const UrlModule = require('./urlModule');
const UserModule = require('./userModule');
const session = require('express-session');
const ejs = require('ejs');
const path = require('path');

// Connect to the database and start the server
mongoose.connect(dbURI)
    .then((result) => app.listen(5000))
    .catch((err) => console.log(err));

const app = express();
app.use(bodyParser.urlencoded({ extended : true}));
app.use(express.static('public'));
app.use(session({
  secret: 'şifre',
  resave : false,
  saveUninitialized: true
}));

// Function to generate random strings    
function generateRandomString(length) {
    const randomBytes = crypto.randomBytes(length);
    const base64url = randomBytes.toString('base64url');
    // Making the string url-friendly
    const urlFriendlyString = base64url
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return urlFriendlyString.substring(0, length);
}

// Function to validate url
function validUrl(string){
  try {
    new URL(string);
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
}

// Home Page - Sign up / Log in forms
app.get('/', (req,res) => { 
    res.status(200).sendFile(__dirname + '/public/userInterface.html');
});

// User sign up handler
app.post('/api/signup', async (req, res) => {
  
  // Check if username is provided
  if (!req.body.signupUsername) {
    res.status(400).write("<h1>Please provide a username</h1><a href='/'>Go back</a>");
    res.end();
    return;
  }

  // Check if the password is provided
  if (!req.body.signupPassword) {
    res.status(400).write("<h1>Please provide a password</h1><a href='/'>Go back</a>");
    res.end();
    return;
  }

  let searchUsername = await UserModule.findOne({ username : req.body.signupUsername}).exec();

  if(searchUsername){
    res.status(200).write("<h1>Username already exists</h1><a href='/'>Go back</a>");
    res.end();
    return;
  }

  const userModule = new UserModule({
    username: req.body.signupUsername,
    password: req.body.signupPassword  
  });

  try {
    const result = await userModule.save();
    res.status(200).write("<h1>You have been registered</h1><a href='/'>Go back</a>");
    res.end();

  } catch (err) {
    console.log(err);
    res.status(500).end();
  }
});

// User log in handler
app.post('/api/login', async (req,res) => {
  
  req.session.username = req.body.loginUsername;
  
  if (!req.body.loginUsername) {
    res.status(400).write("<h1>Please provide a username</h1><a href='/'>Go back</a>");
    res.end();
    return;
  }

  // Check if the password is provided
  if (!req.body.loginPassword) {
    res.status(400).write("<h1>Please provide a password</h1><a href='/'>Go back</a>");
    res.end();
    return;
  }

  let searchUser = await UserModule.findOne({ username : req.body.loginUsername, password : req.body.loginPassword}).exec();

  if(!searchUser){
    res.status(400).write("<h1>Your informations does not match!</h1>");
    res.end();
  }

  res.status(200).sendFile(__dirname + '/public/urlInterface.html');
  
});

// Dashboard to see clicks
app.get('/api/dashboard', async (req, res) => {
  // Check if the user is logged in
  if (!req.session.username) {
    res.status(401).send('Unauthorized');
    return;
  }

  const username = req.session.username;

  try {
    const links = await UrlModule.find({ owner: username }).exec();

    const formattedLinks = links.map((link) => {
      return {
        shortLink: link.short,
        longLink: link.long,
        clickCount: link.clicks,
      };
    });

    const templatePath = path.join(__dirname, '/public/dashboard.html');
    ejs.renderFile(templatePath, { links: formattedLinks }, (err, renderedHTML) => {
      if (err) {
        console.log(err);
        res.status(500).send('Internal Server Error');
      } else {
        res.send(renderedHTML);
      }
    });
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
});

// Shorten the URL
app.post('/api/shorten', async (req, res) => {
  const inputString = req.body.inputString;
  const customString = req.body.customString;
  const username = req.session.username;

  // End if long URL is invalid
  if (!validUrl(inputString)) {
    res.status(400).write("<h1>Your URL is invalid</h1><a href='/'>Go back</a>");
    res.end();
    return;
  }

  // Check if the custom blank is filled
  if (customString) {
    // Check if custom URL would be valid
    const checkUrl = 'http://localhost:5000/' + customString;
    if (!validUrl(checkUrl)) {
      res.status(400).write("<h1>Your custom string is invalid</h1><a href='/'>Go back</a>");
      res.end();
      return;
    }

    // Check if the custom string is unique
    try {
      let searchCustom = await UrlModule.findOne({ short: "localhost:5000/" + customString }).exec();

      // If the custom URL is found
      if (searchCustom) {
        if (searchCustom.long === inputString && username === searchCustom.owner) {
          const shortUrl = "http://" + searchCustom.short;
          const templatePath = path.join(__dirname, '/public/shortened-link.html');
          ejs.renderFile(templatePath, { shortLink: shortUrl }, (err, renderedHTML) => {
            if (err) {
              console.log(err);
              res.status(500).send('Internal Server Error');
            } else {
              res.send(renderedHTML);
            }
          });
          res.end();
          return;
        }
        // If the custom URL is already in use
        res.write("<h1>The custom string you provided is already in use!</h1><a href='/'>Go back</a>");
        res.end();
        return;
      }
    } catch (err) {
      console.log(err);
      res.status(500).end();
    }

    // Save the new URL to the database
    const urlModule = new UrlModule({
      long: inputString,
      short: "localhost:5000/" + customString,
      owner: username,
    });

    const result = await urlModule.save();
    const shortUrl = "http://" + urlModule.short;

    const templatePath = path.join(__dirname, '/public/shortened-link.html');
    ejs.renderFile(templatePath, { shortLink: shortUrl }, (err, renderedHTML) => {
      if (err) {
        console.log(err);
        res.status(500).send('Internal Server Error');
      } else {
        res.send(renderedHTML);
      }
    });
  } else {
    let random = generateRandomString(6);

    // Check if the string is unique
    try {
      let searchShort = await UrlModule.findOne({ short: random }).exec();
      while (searchShort) {
        random = generateRandomString(6);
        searchShort = await UrlModule.findOne({ short: "localhost:5000/" + random }).exec();
      }
    } catch (err) {
      console.log(err);
      res.status(500).end();
    }

    // Check the database, retrieve info or create new URL
    try {
      const search = await UrlModule.findOne({ long: inputString }).exec();

      if (search && search.owner === username) {
        const shortUrl = "http://" + search.short;

        const templatePath = path.join(__dirname, '/public/shortened-link.html');
        ejs.renderFile(templatePath, { shortLink: shortUrl }, (err, renderedHTML) => {
          if (err) {
            console.log(err);
            res.status(500).send('Internal Server Error');
          } else {
            res.send(renderedHTML);
          }
        });
      } else {
        const urlModule = new UrlModule({
          long: inputString,
          short: "localhost:5000/" + random,
          owner: username
        });

        const result = await urlModule.save();
        const shortUrl = "http://" + urlModule.short;

        const templatePath = path.join(__dirname, '/public/shortened-link.html');
        ejs.renderFile(templatePath, { shortLink: shortUrl }, (err, renderedHTML) => {
          if (err) {
            console.log(err);
            res.status(500).send('Internal Server Error');
          } else {
            res.send(renderedHTML);
          }
        });
      }
    } catch (err) {
      console.log(err);
      res.status(500).send('Internal Server Error');
    }
  }
});

// Redirect to the original URL
app.get('/:shorturl',async (req,res) => {
  const shorturl = "localhost:5000/" + req.params.shorturl;
  try{
      const search = await UrlModule.findOne({ short : shorturl}).exec();
      if(search){
          // Modify the click counter
          search.clicks++;
          await search.save();
          res.status(200).redirect(search.long);
      }
      else{
          res.status(404).write("Invalid URL");
          res.end();
      }
  } catch(err){
      console.log(err);
      res.status(500).end();
  }
});

// Show all the data
app.get('/api/links', (req,res) =>{
  UrlModule.find()
  .then((result) => {
      res.send(result);
  })
  .catch((err) => {
      console.log(err);
  });
});

app.post('/api/delete-link', async(req, res) => {
  const shortUrl = req.body.shortLink;
  const username = req.session.username;

  UrlModule.findOneAndDelete({short : shortUrl, owner : username}).exec();
  res.redirect('http://localhost:5000/api/dashboard');
})



