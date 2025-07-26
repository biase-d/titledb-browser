export const githubPagesUrl = 'https://biase-d.github.io/titledb-browser'

export const mainUrl = 'https://raw.githubusercontent.com/masagrator/titledb_filtered/refs/heads/main/output/main.json'
export const fullIndexUrl = `${githubPagesUrl}/full_index.json`
export const metadataUrl = `${githubPagesUrl}/metadata.json`
export const publisherUrl = `${githubPagesUrl}/publishers`
export const nameUrl = (id) => `${githubPagesUrl}/names/${id}.json`

export const dataRepo = 'biase-d/nx-performance'

export function titleIdUrl (id) {
  return `https://raw.githubusercontent.com/masagrator/titledb_filtered/refs/heads/main/output/titleid/${id}.json`
}