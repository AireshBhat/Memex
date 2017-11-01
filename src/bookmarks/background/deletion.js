import { fetchDocTypesByUrl } from 'src/pouchdb'
import { generatePageDocId } from 'src/page-storage'
import * as index from 'src/search'
import deleteDocsByUrl, { deleteDocs } from 'src/page-storage/deletion'
import { bookmarkKeyPrefix } from '..'

async function removeBookmark(id, { node }) {
    if (!node.url) {
        console.warn('Cannot remove bookmark with no URL', node)
        return
    }

    const pageId = generatePageDocId({ url: node.url })
    const reverseIndexDoc = await index.initSingleLookup()(pageId)

    if (reverseIndexDoc == null) {
        console.warn(
            'Cannot remove bookmark with no corresponding reverse index entry',
            pageId,
        )
        return
    }

    // If no visits, we don't want an orphaned page, so remove everything for given URL
    if (!reverseIndexDoc.visits.size) {
        return deleteDocsByUrl(node.url)
    }

    // Deindex from bookmarks index
    await index.del([...reverseIndexDoc.bookmarks.values()])

    // Update reverse index bookmarks for current doc
    await index.put(pageId, {
        ...reverseIndexDoc,
        bookmarks: new Set(),
        type: 'visit',
    })

    // Remove corresponding bookmark docs from pouch
    const fetchDocsByType = fetchDocTypesByUrl(node.url)
    const { rows: bookmarkRows } = await fetchDocsByType(bookmarkKeyPrefix)
    await deleteDocs(bookmarkRows)
}

export default removeBookmark
