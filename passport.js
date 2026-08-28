import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import db from './db.js';
import env from './env.js';

passport.use(new GoogleStrategy({
    clientID: env.GOOGLE_CLIENT_ID || 'dummy_id',
    clientSecret: env.GOOGLE_CLIENT_SECRET || 'dummy_secret',
    callbackURL: "/api/v1/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await db('users').where({ google_id: profile.id }).first();
      
      if (!user) {
        // Create user if not exists
        [user] = await db('users').insert({
          email: profile.emails[0].value,
          first_name: profile.name.givenName,
          last_name: profile.name.familyName,
          google_id: profile.id,
          role: 'user'
        }).returning('*');
      }
      
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

export default passport;
