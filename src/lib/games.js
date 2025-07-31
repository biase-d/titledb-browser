import { db } from '$lib/db'
import { games, performance_profiles } from '$lib/db/schema'
import { and, asc, countDistinct, desc, ilike, or, sql } from 'drizzle-orm'

const PAGE_SIZE = 50

export async function getGames (searchParams) {
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const q = searchParams.get('q')
  const publisher = searchParams.get('publisher')
  const minYear = searchParams.get('minYear')
  const maxYear = searchParams.get('maxYear')
  const minSizeMB = searchParams.get('minSizeMB')
  const maxSizeMB = searchParams.get('maxSizeMB')
  const sort = searchParams.get('sort') ?? (q ? 'relevance-desc' : 'date-desc')

  const whereConditions = []
  if (q) {
    const isTitleIdSearch = /^[0-9A-F]{16}$/i.test(q);

    if (isTitleIdSearch) {
      // If the query is a valid Title ID, perform an exact match search
      whereConditions.push(ilike(games.id, q));
    } else {
      const searchWords = q.split(' ').filter(Boolean); // Split query into words
      const textSearchConditions = [];

      for (const word of searchWords) {
        textSearchConditions.push(
          or(
            // Check if the word appears in any of the names in the array
            sql`${`%${word}%`} ILIKE ANY (${games.names})`,
            // Also include a similarity check for fuzzy matching
            sql`word_similarity(${word}, "names"[1]) > 0.2`
          )
        );
      }
      
      // All words must be present so we join them with AND
      if (textSearchConditions.length > 0) {
        whereConditions.push(and(...textSearchConditions));
      }
    }
  }

  if (publisher) {
    whereConditions.push(sql`${games.publisher} = ${publisher}`)
  }

  if (minYear) {
    whereConditions.push(sql`"release_date" >= ${Number(minYear) * 10000}`)
  }
  if (maxYear) {
    whereConditions.push(sql`"release_date" <= ${Number(maxYear) * 10000 + 1231}`)
  }

  if (minSizeMB) {
    whereConditions.push(sql`"size_in_bytes" >= ${Number(minSizeMB) * 1024 * 1024}`)
  }
  if (maxSizeMB) {
    whereConditions.push(sql`"size_in_bytes" <= ${Number(maxSizeMB) * 1024 * 1024}`)
  }

  if (!q && !publisher && !minYear && !maxYear && !minSizeMB && !maxSizeMB) {
    whereConditions.push(sql`EXISTS (SELECT 1 FROM ${performance_profiles} WHERE ${performance_profiles.group_id} = ${games.group_id})`)
  }

  const combinedWheres = and(...whereConditions)

  const getSortOptions = () => {
    switch (sort) {
      case 'name-asc':
        return [asc(sql`"names"[1]`)]
      case 'size-desc':
        return [desc(games.size_in_bytes)]
      case 'relevance-desc':
        if (q && !/^[0-9A-F]{16}$/i.test(q)) {
          return [desc(sql`word_similarity(${q}, "names"[1])`)]
        }
        return [desc(games.last_updated)]
      case 'date-desc':
      default:
        return [desc(games.release_date)]
    }
  }

  const orderBy = getSortOptions()

  const resultsQuery = db
    .selectDistinctOn([games.group_id], {
      id: games.id,
      names: games.names
    })
    .from(games)
    .where(combinedWheres)
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE)
    .orderBy(games.group_id, ...orderBy)

  const countQuery = db
    .select({ total: countDistinct(games.group_id) })
    .from(games)
    .where(combinedWheres)

  const publishersQuery = db.selectDistinct({ publisher: games.publisher }).from(games).where(sql`${games.publisher} IS NOT NULL`).orderBy(asc(games.publisher))

  const yearsQuery = db.selectDistinct({ year: sql`CAST(FLOOR("release_date" / 10000) AS INTEGER)`.as('year') }).from(games).where(sql`${games.release_date} IS NOT NULL`).orderBy(desc(sql`CAST(FLOOR("release_date" / 10000) AS INTEGER)`))

  const [results, totalResult, availablePublishers, availableYears] = await Promise.all([
    resultsQuery,
    countQuery,
    publishersQuery,
    yearsQuery
  ])

  const totalItems = totalResult[0].total
  const totalPages = Math.ceil(totalItems / PAGE_SIZE)

  return {
    results,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
      pageSize: PAGE_SIZE
    },
    meta: {
      publishers: availablePublishers.map(p => p.publisher),
      years: availableYears.map(y => y.year).filter(Boolean)
    }
  }
}