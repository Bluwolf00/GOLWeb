const passport = require('passport');
const { Strategy } = require('passport-discord');
const db = require('./database.js');

passport.use(new Strategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL,
    scope: ['identify', 'guilds', 'guilds.members.read']
}, async (accessToken, refreshToken, profile, done) => {
    // Here you would find or create a user in your database
    console.log('Discord profile:', profile);
    console.log('Access Token:', accessToken);
    console.log('Refresh Token:', refreshToken);

    // First, search the database for the user
    // If the user exists, return the user
    // If the user does not exist, create a new user and return it
    // When creating a new user, we will save the Discord ID and username
    // Since we are using MySQL2, we cannot use Mongoose functions

    try {
        const user = await db.getUserDiscordId(profile.id);
        if (!user) {
            return done(null, user[0]);
        }
    
        const newUser = await db.createUser({
            discordId: profile.id,
            username: profile.username
        });
        done(null, newUser[0]);
    } catch (error) {
        console.error('Error in Discord authentication:', error);
        done(error);
    }
}));

module.exports = { passport, Strategy };