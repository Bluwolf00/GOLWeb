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
    // console.log('Discord profile:', profile);
    // console.log('Access Token:', accessToken);
    // console.log('Refresh Token:', refreshToken);

    passport.serializeUser((user, done) => {
        console.log('Serializing user with ID:', user.userID);
        done(null, user);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            console.log('Deserializing user with ID:', id);
            const user = await db.getUserById(id);
            if (user) {
                done(null, user.userID);
            }
        } catch (error) {
            console.error('Error during deserialization:', error);
            done(error);
        }
    });

    // First, search the database for the user
    // If the user exists, return the user
    // If the user does not exist, create a new user and return it
    // When creating a new user, we will save the Discord ID and username
    // Since we are using MySQL2, we cannot use Mongoose functions

    try {
        const user = await db.checkIfUserExists(null, profile.id);
        if (user) {
            console.log('User found:', user);
            // User exists, return the user
            return done(null, user);
        } else {
            console.log('User not found, creating new user:', profile.username);
            // User does not exist, create a new user
            const newUser = await db.createUser(
                profile.username,
                null, // No password needed for Discord login
                profile.id, // Use the Discord ID as the Discord ID
            );
            return done(null, newUser);
        }
    } catch (error) {
        console.error('Error in Discord authentication:', error);
        done(error);
    }
}));

module.exports = { passport, Strategy };