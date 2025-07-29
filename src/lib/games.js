import { db } from '$lib/db'
import { games, performanceProfiles } from '$lib/db/schema'
import { and, asc, count, desc, ilike, or, sql } from 'drizzle-orm'

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
  const SIMILARITY_THRESHOLD = 0.1

  if (q) {
    if (sort === 'relevance-desc') {
      whereConditions.push(sql`word_similarity(${q}, "names"[1]) > ${SIMILARITY_THRESHOLD}`)
    } else {
      whereConditions.push(
        or(
          ilike(games.id, `%${q}%`),
          sql`${`%${q}%`} ILIKE ANY (${games.names})`
        )
      )
    }
  }

  if (publisher) {
    whereConditions.push(sql`${games.publisher} = ${publisher}`)
  }

  if (minYear) {
    whereConditions.push(sql`"releaseDate" >= ${Number(minYear) * 10000}`)
  }
  if (maxYear) {
    whereConditions.push(sql`"releaseDate" <= ${Number(maxYear) * 10000 + 1231}`)
  }

  if (minSizeMB) {
    whereConditions.push(sql`"sizeInBytes" >= ${Number(minSizeMB) * 1024 * 1024}`)
  }
  if (maxSizeMB) {
    whereConditions.push(sql`"sizeInBytes" <= ${Number(maxSizeMB) * 1024 * 1024}`)
  }

  if (!q && !publisher && !minYear && !maxYear && !minSizeMB && !maxSizeMB) {
    whereConditions.push(sql`EXISTS (SELECT 1 FROM ${performanceProfiles} WHERE ${performanceProfiles.groupId} = ${games.groupId})`)
  }

  const combinedWheres = and(...whereConditions)

  const getSortOptions = () => {
    switch (sort) {
      case 'name-asc':
        return [asc(sql`"names"[1]`)]
      case 'size-desc':
        return [desc(games.sizeInBytes)]
      case 'relevance-desc':
        if (q) {
          return [desc(sql`word_similarity(${q}, "names"[1])`)]
        }
        return [desc(games.lastUpdated)]
      case 'date-desc':
      default:
        return [desc(games.releaseDate)]
    }
  }

  const orderBy = getSortOptions()

  const resultsQuery = db
    .select({
      id: games.id,
      names: games.names
    })
    .from(games)
    .where(combinedWheres)
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE)
    .orderBy(...orderBy)

  const countQuery = db
    .select({ total: count() })
    .from(games)
    .where(combinedWheres)

  const publishersQuery = db.selectDistinct({ publisher: games.publisher }).from(games).where(sql`${games.publisher} IS NOT NULL`).orderBy(asc(games.publisher))

  const yearsQuery = db.selectDistinct({ year: sql`CAST(FLOOR("releaseDate" / 10000) AS INTEGER)`.as('year') }).from(games).where(sql`${games.releaseDate} IS NOT NULL`).orderBy(desc(sql`CAST(FLOOR("releaseDate" / 10000) AS INTEGER)`))

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