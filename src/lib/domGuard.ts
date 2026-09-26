/**
 * Browser translators (Chrome/Brave "Translate this page") and some extensions rewrite the page's text nodes
 * behind React's back. React then fails with "Failed to execute 'removeChild'/'insertBefore' on 'Node'"
 * while switching pages, and the whole app goes blank. This is the widely used guard from
 * https://github.com/facebook/react/issues/11538 — skip the operation instead of crashing.
 */
if (typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) {
      console.warn('[studyduel] skipped removeChild of a node moved by an extension/translator')
      return child
    }
    return originalRemoveChild.call(this, child) as T
  }

  const originalInsertBefore = Node.prototype.insertBefore
  Node.prototype.insertBefore = function <T extends Node>(this: Node, newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      console.warn('[studyduel] insertBefore reference node was moved by an extension/translator; appending instead')
      return originalInsertBefore.call(this, newNode, null) as T
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T
  }
}

export {}
