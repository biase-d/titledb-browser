import { SvelteKitAuth } from "@auth/sveltekit"
import GitHub from "@auth/sveltekit/providers/github"
import { GITHUB_ID, GITHUB_SECRET } from "$env/static/private"
import { titleIdUrl, nameUrl } from '$lib/index.js';
import { sequence } from "@sveltejs/kit/hooks";

const BOT_USER_AGENTS = [
  'Twitterbot', 'facebookexternalhit', 'LinkedInBot',
'Discordbot', 'Slackbot', 'Pinterest', 'WhatsApp'
];

/** @type {import('@sveltejs/kit').Handle} */
async function botMetaHandler({ event, resolve }) {
  const userAgent = event.request.headers.get('user-agent') || '';
  const isBot = BOT_USER_AGENTS.some(bot => userAgent.includes(bot));
  const isTitlePage = event.url.pathname.startsWith('/title/');

  if (isBot && isTitlePage) {
    try {
      const id = event.url.pathname.split('/')[2];
      if (!id) return resolve(event);
      const [nameRes, detailRes] = await Promise.all([ fetch(nameUrl(id)), fetch(titleIdUrl(id)) ]);
      if (!nameRes.ok || !detailRes.ok) return resolve(event);
      const nameData = await nameRes.json();
      const titleData = await detailRes.json();
      const names = nameData.names || [id];
      const name = names[0];
      const response = await resolve(event);
      let appHtml = await response.text();
      const metaTags = `<title>${name} - Titledb Browser</title><meta name="description" content="${titleData.description?.replace(/"/g, '"') || `Details for ${name} (${id})`}" /><meta property="og:title" content="${name} - Titledb Browser" /><meta property="og:description" content="${titleData.description?.replace(/"/g, '"') || `Details for ${name} (${id})`}" /><meta property="og:image" content="${titleData.bannerUrl || titleData.iconUrl}" /><meta property="twitter:card" content="summary_large_image" />`;
      appHtml = appHtml.replace(/<title>.*?<\/title>/, metaTags);
      return new Response(appHtml, { status: response.status, headers: response.headers });
    } catch (error) {
      console.error('Error in handle hook:', error);
      return resolve(event);
    }
  }
  return resolve(event);
}

const authHandler = SvelteKitAuth({
  providers: [
    GitHub({
      clientId: GITHUB_ID,
      clientSecret: GITHUB_SECRET,
      authorization: { params: { scope: "public_repo user:email" } }
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

export const handle = sequence(authHandler, botMetaHandler);