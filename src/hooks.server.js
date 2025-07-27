import { SvelteKitAuth } from "@auth/sveltekit"
import GitHub from "@auth/sveltekit/providers/github"
import { GITHUB_ID, GITHUB_SECRET } from "$env/static/private"
import { sequence } from "@sveltejs/kit/hooks";

/** @type {import('@sveltejs/kit').Handle} */
const authHandler = SvelteKitAuth({
  trustHost: true,
  providers: [
    GitHub({
      clientId: GITHUB_ID,
      clientSecret: GITHUB_SECRET
    }),
  ],
  callbacks: {
    /**
     * @param {{ token: import('@auth/sveltekit').JWT, account: import('@auth/sveltekit').Account | null, profile: import('@auth/sveltekit/providers/github').GitHubProfile | null }} params
     */
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      if (profile) {
        token.login = profile.login;
      }
      return token;
    },
    /** @param {{session: import('@auth/sveltekit').Session, token: import('@auth/sveltekit').JWT}} params */
    async session({ session, token }) {
      // Pass the properties from the JWT to the session object.
      // @ts-ignore
      session.accessToken = token.accessToken;
      // @ts-ignore
      session.user.login = token.login;
      return session;
    },
  },
}).handle;

export const handle = sequence(authHandler);