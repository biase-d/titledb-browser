import { SvelteKitAuth } from "@auth/sveltekit"
import GitHub from "@auth/sveltekit/providers/github"
import { GITHUB_ID, GITHUB_SECRET } from "$env/static/private"
import { sequence } from "@sveltejs/kit/hooks";
import { db } from "$lib/db";

/** @type {import('@sveltejs/kit').Handle} */
const dbHandler = async ({ event, resolve }) => {
  event.locals.db = db;
  return resolve(event);
};

/** @type {import('@sveltejs/kit').Handle} */
const authHandler = SvelteKitAuth({
  trustHost: true,
  providers: [
    GitHub({
      clientId: GITHUB_ID,
      clientSecret: GITHUB_SECRET,
      authorization: {
        params: {
          scope: ""
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        // @ts-ignore
        token.login = profile.login;
        // @ts-ignore
        token.id = profile.id; // Save the user's numeric ID
      }
      return token;
    },
    async session({ session, token }) {
      // @ts-ignore
      session.user.login = token.login;
      // @ts-ignore
      session.user.id = token.id; // Pass the ID to the session
      return session;
    },
  },
}).handle;

export const handle = sequence(dbHandler, authHandler);