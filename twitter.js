const express = require('express')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const path = require('path')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const dateFns = require('date-fns')
const app = express()

app.use(express.json())
let db = null
const dbPath = path.join(__dirname, 'twitterClone.db')

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Started at http://localhost:3000/')
    })
  } catch (error) {
    console.log(`DB Error: ${error.message} `)
    process.exit(1)
  }
}
initializeDbAndServer()

//middleWare
const authenticateToken = (request, response, next) => {
  const authHeader = request.headers['authorization']
  let jwtToken
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }

  if (jwtToken === undefined) {
    response.status(400)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'SECRET', (error, user) => {
      if (error) {
        response.status(400)
        response.send('Invalid JWT Token')
      } else {
        request.username = user.username
        console.log(request.username)
        next()
      }
    })
  }
}

//apis
app.post('/register/', async (request, response) => {
  const userDetails = request.body
  const {username, password, name, gender} = userDetails
  const hashedPassword = await bcrypt.hash(password, 10)

  const getUsername = `
        SELECT * FROM user WHERE username = "${username}"
    `
  const dbUser = await db.get(getUsername)

  if (dbUser !== undefined) {
    response.status(400)
    response.send('User already exists')
  } else {
    if (password.length < 6) {
      response.status(400)
      response.send('Password is too short')
    } else {
      const postUser = `
                INSERT INTO user(name,username,password,gender)
                VALUES 
                    (
                        "${name}",
                        "${username}",
                        "${hashedPassword}",
                        "${gender}"
                    )
            `

      const dbUserRes = await db.run(postUser)
      console.log(dbUserRes.lastId)
      response.send('User created successfully')
    }
  }
})

//2

app.post('/login/', async (request, response) => {
  const {username, password} = request.body

  const checkUser = `
    SELECT * FROM user WHERE username = "${username}"
  `
  const userDb = await db.get(checkUser)
  if (userDb === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const checkPwd = await bcrypt.compare(password, userDb.password)
    if (checkPwd) {
      const userObj = {username: username}
      const jwtToken = jwt.sign(userObj, 'SECRET')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

//api-3
let offset = 0

app.get('/user/tweets/feed/', authenticateToken, async (request, response) => {
  const username = request.username
  //console.log(request.username)
  const getDetails = `
      SELECT DISTINCT
        user.username AS username,
        tweet.tweet AS tweet,
        tweet.date_time AS date_time
      FROM 
        follower INNER JOIN user ON follower.follower_user_id = user.user_id
        INNER JOIN tweet ON user.user_id = tweet.user_id
      WHERE 
        follower.follower_user_id IN (
          SELECT follower.following_user_id
          FROM follower INNER JOIN user ON user.user_id = follower.follower_user_id
          WHERE 
            user.username = "${username}"
        )
      ORDER BY 
        tweet.date_time desc
      limit 4
      offset ${offset};
            `
  let getResults = await db.all(getDetails)
  getResults = getResults.map(obj => {
    return {
      username: obj.username,
      tweet: obj.tweet,
      dateTime: obj.date_time,
    }
  })

  if (offset < getResults.length) {
    offset = offset + 4
  }

  response.send(getResults)
})

/**app.put('/users/:userId/', async (req, res) => {
  const {password, username} = req.body
  const {userId} = req.params
  const hashedPassword = await bcrypt.hash(password, 10)
  const updatePwd = `
    UPDATE user
    SET 
      password = "${hashedPassword}"
    WHERE 
      user_id = ${userId}
   
   `
  await db.run(updatePwd)
  res.send('Done')
})**/

app.get('/user/following/', authenticateToken, async (request, response) => {
  const username = request.username
  console.log(username)

  const getFollowers = `
    SELECT 
      name
    FROM 
      user
    WHERE 
      user_id IN (
        SELECT 
          follower.following_user_id
        FROM 
          user INNER JOIN follower ON user.user_id = follower.follower_user_id
        WHERE 
          user.username = "${username}"
      )
  `

  const usernames = await db.all(getFollowers)
  response.send(usernames)
})

//user followers
app.get('/user/followers/', authenticateToken, async (request, response) => {
  const username = request.username
  const getFollowers = `
    SELECT 
      user.name
    FROM 
      user INNER JOIN follower ON user.user_id = follower.follower_user_id
    WHERE 
      follower.following_user_id = (
        SELECT user_id 
        FROM user 
        WHERE 
          username = "${username}"
      );
  `
  const followers = await db.all(getFollowers)
  response.send(followers)
})

//tweeets
app.get('/tweets/:tweetId/', authenticateToken, async (request, response) => {
  const username = request.username
  const {tweetId} = request.params
  const getTweets = `
    SELECT 
      tweet.tweet AS tweet,
      COUNT(
        CASE 
          WHEN like.like_id != null THEN 1
          ELSE 0
        END
      ) AS likes,
      COUNT(
        CASE 
          WHEN reply.reply_id != null THEN 1
          ELSE 0
        END
      ) AS replies,
      tweet.date_time AS date_time
    FROM 
      tweet INNER JOIN reply ON tweet.tweet_id = reply.tweet_id 
      INNER JOIN like ON like.tweet_id = tweet.tweet_id
    WHERE 
      tweet.user_id IN (
        SELECT 
          follower.following_user_id 
        FROM 
          user INNER JOIN follower ON user.user_id = follower.follower_user_id 
        WHERE 
          user.username = "${username}"
      ) AND tweet.tweet_id = ${tweetId}
    GROUP BY 
      tweet.tweet_id 
  `

  let tweet = await db.all(getTweets)
  if (tweet.length === 0) {
    response.status(401)
    response.send('Invalid Request')
  } else {
    tweet = tweet.map(obj => {
      return {
        tweet: obj.tweet,
        likes: obj.likes,
        replies: obj.replies,
        dateTime: obj.dateTime,
      }
    })
    response.send(tweet)
  }
})

//likes API
app.get(
  '/tweets/:tweetId/likes/',
  authenticateToken,
  async (request, response) => {
    const username = request.username
    const {tweetId} = request.params
    const checkUserFollowers = `
        SELECT 
          user_id 
        FROM 
          tweet 
        WHERE 
          user_id IN (
              SELECT 
                    follower.following_user_id 
              FROM 
                    follower INNER JOIN user ON user.user_id = follower.follower_user_id
              WHERE 
                    user.username = "${username}"
          ) AND tweet_id = ${tweetId}
    `
    const userFollowers = await db.get(checkUserFollowers)
    if (userFollowers === undefined) {
      response.status(401)
      response.send('Invalid Request')
    } else {
      const getUsernames = `
          SELECT 
            user.username AS username 
          FROM 
            user INNER JOIN like ON user.user_id = like.user_id 
          WHERE 
            like.tweet_id = ${tweetId}
      `
      const usernames = await db.all(getUsernames)
      console.log(usernames)
      let userArray = []
      usernames.forEach(obj => {
        userArray.push(obj.username)
      })
      response.send({likes: userArray})
    }
  },
)

app.get(
  '/tweets/:tweetId/replies/',
  authenticateToken,
  async (request, response) => {
    const {tweetId} = request.params
    const username = request.username
    const checkUserFollowers = `
        SELECT 
          user_id 
        FROM 
          tweet 
        WHERE 
          user_id IN (
              SELECT 
                    follower.following_user_id 
              FROM 
                    follower INNER JOIN user ON user.user_id = follower.follower_user_id
              WHERE 
                    user.username = "${username}"
          ) AND tweet_id = ${tweetId}
    `
    const userFollowers = await db.get(checkUserFollowers)
    if (userFollowers === undefined) {
      response.status(401).send('Invalid Request')
    } else {
      const getReplies = `
        SELECT 
          user.name AS name,
          reply.reply AS reply
        FROM 
          reply INNER JOIN user ON reply.user_id = user.user_id 
        WHERE 
          tweet_id = ${tweetId};
      `
      let replies = await db.all(getReplies)
      response.send({replies})
    }
  },
)

app.get('/user/tweets/', authenticateToken, async (request, response) => {
  const username = request.username

  const getLikes = `
    SELECT COUNT(like.like_id) AS likes
    FROM  
      like INNER JOIN tweet ON like.tweet_id = tweet.tweet_id INNER JOIN user ON user.user_id = tweet.user_id
    WHERE 
      user.username = "${username}";
    GROUP BY 
      tweet.tweet_id   
  `
  const likes = await db.all(getLikes)
  console.log(likes)

  const getTweets = `
      SELECT 
        tweet.tweet AS tweet,
        (
          SELECT COUNT(like.like_id) AS likes
          FROM 
            like INNER JOIN user ON user.user_id = like.user_id  INNER JOIN tweet ON user.user_id = tweet.user_id
          WHERE 
            user.username = "${username}"
          GROUP BY 
            tweet.tweet_id
        ) AS likes,
        (
          SELECT COUNT(reply.reply) AS replies 
          FROM 
            reply INNER JOIN user ON user.user_id = reply.user_id 
          WHERE 
            user.username = "${username}"
        ) AS replies,
        tweet.date_time AS date_time 
      FROM 
        tweet INNER JOIN user ON tweet.user_id = user.user_id;
      WHERE 
        user.username = "${username}";
    `
  const tweets = await db.all(getTweets)
  response.send(tweets)
})

app.post('/user/tweets/', authenticateToken, async (request, response) => {
  const {tweet} = request.body
  console.log(tweet)
  const username = request.username

  let presentDate = dateFns.format(new Date(), 'yyyy-MM-dd  HH:MM:SS')
  console.log(typeof presentDate)

  const getUserId = `
      SELECT 
        user_id 
      FROM 
        user 
      WHERE 
        username = "${username}";
  `
  let userId = await db.get(getUserId)
  console.log(userId)

  const postTweet = `
        INSERT INTO 
          tweet (tweet,user_id,date_time)
        VALUES 
          (
            "${tweet}",
            ${userId.user_id},
            "${presentDate}"
          )
  `
  await db.run(postTweet)
  response.send('Created a Tweet')
})

app.delete(
  '/tweets/:tweetId/',
  authenticateToken,
  async (request, response) => {
    const {tweetId} = request.params
    const username = request.username

    const checkTweet = `
    SELECT *
    FROM tweet INNER JOIN user ON tweet.user_id = user.user_id
    WHERE 
      user.username = "${username}" AND 
      tweet.tweet_id = ${tweetId};

  `
    const tweet = await db.get(checkTweet)
    if (tweet === undefined) {
      response.status(401).send('Invalid Request')
    } else {
      const deleteTweet = `
      DELETE FROM tweet 
      WHERE 
        tweet_id = ${tweetId};
    `
      await db.run(deleteTweet)
      response.send('Tweet Removed')
    }
  },
)

module.exports = app;
