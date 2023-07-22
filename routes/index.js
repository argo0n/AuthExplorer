const express = require('express');
const router = express.Router();
const baseURL = process.env.BASE_URL;
const githubClientID = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

const {OAuth2Client} = require('google-auth-library');
const githubLink = `https://github.com/login/oauth/authorize?client_id=${githubClientID}&scope=read:user,user:email`;

console.log(baseURL);

// Helper functions
async function exchangeCode(code) {
  const params = {
    client_id: githubClientID,
    client_secret: githubClientSecret,
    code
  };

    const url = new URL('https://github.com/login/oauth/access_token');
  url.searchParams.append('client_id', params.client_id);
  url.searchParams.append('client_secret', params.client_secret);
  url.searchParams.append('code', params.code);

  try {
    const response = await fetch(url.toString(), { headers: {"Accept": "application/json"} });
    return response.ok ? await response.json() : { statusCode: response.status };
  } catch (error) {
    console.error(error);
    return { error: error.message };
  }
}

async function userInfo(access_token) {
  const url = 'https://api.github.com/user';

  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${access_token}`
      }
    });

    return response.ok ? await response.json() : console.error('Response not OK');
  } catch (error) {
    console.error(error);
    return false;
  }
}

// Routes
router.get('/', (req, res) => res.render('index', { title: 'Express', github_link: githubLink, google_client_id: process.env.GOOGLE_CLIENT_ID}));

router.get("/github-callback", async (req, res) => {
  const callbackCode = req.query.code;

  try {
    const accessToken = await exchangeCode(callbackCode);

    if (accessToken.access_token) {
      res.render('github_accesscode', {
        access_token_data: JSON.stringify(accessToken),
        access_token: accessToken.access_token
      });
    } else {
      res.render('api_error', {error: JSON.stringify(accessToken)});
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({error: error.message});
  }
});

router.post("/github_user", async(req, res) => {
  const github_access_token = req.body.github_access_token;
  fetch("https://api.github.com/user", {
    headers: {
      "Authorization": `Bearer ${github_access_token}`,
      "Accept": "application/vnd.github+json"
    }
  })
    .then(result => {
      if (result.ok) {
        result.json()
          .then(r => {
            fetch("https://api.github.com/user/emails", {
              headers: {
                "Authorization": `Bearer ${github_access_token}`,
                "Accept": "application/vnd.github+json"
              }
            })
              .then(result => {
                if (result.ok) {
                  result.json()
                    .then(r => {

                      res.render("result", {title: "GitHub API User result", result: JSON.stringify(r)})
                    })
                }
              })
            res.render("result", {title: "GitHub API User result", result: JSON.stringify(r)})
          })
      }
    })

})

router.post("/google-callback", async (req, res) => {
  const googleOAuthClient = new OAuth2Client();
  async function verify() {
    console.log("Verifying ID Token");
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken: req.body.credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    console.log("Verified ID Token");
    return ticket.getPayload();
  }
  return verify()
    .then(idkwhatthisis => {
      return res.status(200).json(idkwhatthisis);
    })
    .catch(error => {
    console.error(error);
    res.status(500).json({error: error.message});
  });
})

// Exported modules
module.exports = router;
