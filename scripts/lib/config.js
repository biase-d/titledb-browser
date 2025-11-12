import path from 'node:path';
import { sql, eq } from 'drizzle-orm';
import { games, performanceProfiles, graphicsSettings, youtubeLinks } from '../../src/lib/db/schema.js';

export const DATA_SOURCES = {
  performance: {
    table: performanceProfiles,
    path: 'profiles',
    isHierarchical: true,
    getKey: (groupId, file) => {
      const baseName = path.basename(file.name, '.json');
      const [gameVersion, ...suffixParts] = baseName.split('$');
      const suffix = suffixParts.join('$');
      const key = suffix ? `${groupId}-${gameVersion}-${suffix}` : `${groupId}-${gameVersion}`;
      const parts = [groupId, gameVersion, suffix || ''];
      return { key, parts };
    },
     getKeyFromRecord: (r) => (r.suffix ? `${r.groupId}-${r.gameVersion}-${r.suffix}` : `${r.groupId}-${r.gameVersion}`),
     buildRecord: (keyParts, content, metadata, lastUpdated) => {
       const localContent = content || {};
       const { contributor, ...profiles } = localContent;
       const fileContributors = contributor ? (Array.isArray(contributor) ? contributor : [contributor]) : [];
       const gitContributors = metadata.contributors || [];
       const allContributors = [...new Set([...fileContributors, ...gitContributors])];

       return {
         groupId: keyParts[0],
         gameVersion: keyParts[1],
         suffix: keyParts[2] || null,
         profiles,
         contributor: allContributors,
         sourcePrUrl: metadata.sourcePrUrl,
         lastUpdated
       };
     },
     upsert: (db, record) => db.insert(performanceProfiles).values(record).onConflictDoUpdate({
      target: [performanceProfiles.groupId, performanceProfiles.gameVersion, performanceProfiles.suffix],
      set: {
        profiles: sql`excluded.profiles`,
        contributor: sql`excluded.contributor`,
        sourcePrUrl: sql`excluded.source_pr_url`,
        lastUpdated: sql`excluded.last_updated`,
      }
    })
  },
   graphics: {
     table: graphicsSettings,
      path: 'graphics',
      isHierarchical: false,
      getKey: (groupId, file) => ({ key: groupId, parts: [groupId] }),
      getKeyFromRecord: (r) => r.groupId,
      buildRecord: (keyParts, content, metadata, lastUpdated) => {
        const { contributor, ...settings } = content;
        const fileContributors = contributor ? (Array.isArray(contributor) ? contributor : [contributor]) : [];
        const gitContributors = metadata.contributors || [];
        const allContributors = [...new Set([...fileContributors, ...gitContributors])];

        return {
          groupId: keyParts[0],
          settings,
          contributor: allContributors,
          lastUpdated
        };
      },
      upsert: (db, record) => db.insert(graphicsSettings).values(record).onConflictDoUpdate({
        target: graphicsSettings.groupId,
      set: {
        settings: sql`excluded.settings`,
        contributor: sql`excluded.contributor`,
        lastUpdated: sql`excluded.last_updated`
      }
    })
  },
  videos: {
    table: youtubeLinks,
    path: 'videos',
    isHierarchical: false,
    getKey: (groupId, file) => ({ key: groupId, parts: [groupId] }),
    getKeyFromRecord: (r) => r.groupId,
    buildRecord: (keyParts, content, metadata, lastUpdated) => {
      // Videos represent multiple rows, so we return an array of records
      return content.filter(e => e.url).map(entry => ({
        groupId: keyParts[0],
        url: entry.url,
        notes: entry.notes,
        submittedBy: entry.submittedBy,
        submittedAt: lastUpdated, // Use the file's last update time as the submission time
      }));
    },
    // Videos use a special "delete-then-insert" sync strategy
    upsert: async (db, records, groupId) => {
      await db.delete(youtubeLinks).where(eq(youtubeLinks.groupId, groupId));
      if (Array.isArray(records) && records.length > 0) {
        await db.insert(youtubeLinks).values(records);
      }
    }
  },
  groups: {
    table: games,
    path: 'groups',
    isHierarchical: false,
    getKey: (groupId, file) => ({ key: groupId, parts: [groupId] }),
    getKeyFromRecord: (r) => r.groupId, // a placeholder for the generic logic
    
    buildRecord: (keyParts, content, metadata, lastUpdated) => {
      return {
        customGroupId: keyParts[0],
        titleIds: Array.isArray(content) ? content : [],
      };
    },
    
    upsert: async (db, record) => {
      const { customGroupId, titleIds } = record;
      
      const updatePromises = [];

      if (titleIds.length > 0) {
        updatePromises.push(
          db.update(games)
            .set({ groupId: customGroupId })
            .where(inArray(games.id, titleIds))
        );
      }
      
      // This handles cases where a title is removed from a group file
      updatePromises.push(
        db.update(games)
          .set({ groupId: sql`substring(${games.id}, 1, 13) || '000'` }) // Sets the default group ID
          .where(and(
            eq(games.groupId, customGroupId),
            titleIds.length > 0 ? notInArray(games.id, titleIds) : undefined
          ))
      );
      
      await Promise.all(updatePromises);
    }
  }
};