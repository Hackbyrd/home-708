interface OptionContext {
  name: string
  href: string
  page: string
}

const mineral = (page: string): OptionContext => ({ name: 'Mineral & Walnut', href: '/mineral-walnut.html', page })
const cocoa = (page: string): OptionContext => ({ name: 'Cocoa & Chrome', href: '/cocoa-chrome-overview.html', page })
const optionPages: Record<string, OptionContext> = {
  'house-design-review.html': mineral('Room renders'),
  'room-design-book.html': mineral('Materials & build book'),
  'interior-design-guide.html': mineral('Interior design guide'),
  'mineral-walnut-budget.html': mineral('Cost plan'),
  'mineral-walnut-stone-studies.html': mineral('Stone material studies'),
  'design-library-assets/rh-house-consultation.html': mineral('RH furniture'),
  'design-library-assets/rh-great-room-consultation.html': mineral('Original RH great-room study'),
  'design-library-assets/collected-value-consultation.html': mineral('Collected Value furniture'),
  'cocoa-chrome.html': cocoa('Room renders'),
  'cocoa-chrome-build-book.html': cocoa('Materials & build book'),
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!))
}

/** Add the shared library navigation without changing room data or saved document content. */
export function stampLibraryNavigation(html: string, pagePath: string, header: string): string {
  if (!/<body\b/i.test(html)) return html
  let result = html
    .replace(/<!-- home-708-library-head:start -->[\s\S]*?<!-- home-708-library-head:end -->/g, '')
    .replace(/<!-- home-708-library-body:start -->[\s\S]*?<!-- home-708-library-body:end -->/g, '')
    .replace(/<header\b[^>]*class=["'][^"']*\b(?:site-header|topbar)\b[^"']*["'][^>]*>[\s\S]*?<\/header>/gi, '')

  // Older roadmap and consultation documents have an unclassed global navigation.
  // Preserve headers containing the option's title, and all headers inside <main>.
  const bodyStart = result.search(/<body\b/i)
  const firstHeader = /<header\b[^>]*>[\s\S]*?<\/header>/i.exec(result.slice(bodyStart))
  if (firstHeader) {
    const index = bodyStart + firstHeader.index
    const mainStart = result.search(/<main\b/i)
    if ((mainStart < 0 || index < mainStart) && !/<h1\b/i.test(firstHeader[0]) && /<nav\b|class=["']brand["']/i.test(firstHeader[0])) {
      result = result.slice(0, index) + result.slice(index + firstHeader[0].length)
    }
  }

  const context = optionPages[pagePath.replace(/^\/+/, '')]
  const breadcrumb = context
    ? `<nav id="design-library-context" aria-label="Breadcrumb"><a href="/renders.html">Designs</a><span aria-hidden="true">/</span><a href="${context.href}">${escapeHtml(context.name)}</a><span aria-hidden="true">/</span><span aria-current="page">${escapeHtml(context.page)}</span></nav>`
    : ''
  const head = '<!-- home-708-library-head:start --><link rel="stylesheet" href="/design-library-assets/navigation.css"><script type="module" src="/design-library-assets/navigation.js"></script><!-- home-708-library-head:end -->'
  result = result.replace(/<\/head\s*>/i, head + '</head>')
  const body = `<!-- home-708-library-body:start -->${header}${breadcrumb}<!-- home-708-library-body:end -->`
  // Keep the existing skip link first in keyboard navigation.
  return result.replace(/(<body\b[^>]*>\s*(?:<a\b[^>]*class=["']skip["'][^>]*>[\s\S]*?<\/a>)?)/i, '$1' + body)
}
