/**
 * Serialises structured data for a <script type="application/ld+json"> block
 *
 * JSON.stringify on its own is not safe inside a script element: a value
 * containing `</script>` ends the tag, and everything after it is parsed as
 * HTML. Escaping `<` as < produces an equivalent JSON string while making
 * that impossible. Game names and publishers come from the database, so they
 * are not ours to trust
 *
 * @param {Object} data
 * @returns {string}
 */
export function serializeJsonLd (data) {
	return JSON.stringify(data).replace(/</g, '\\u003c')
}
