export const scrollToId = (id) => {
  const target = id.startsWith('#') ? id : `#${id}`
  if (typeof window !== 'undefined' && window.__lenis) {
    window.__lenis.scrollTo(target)
    return
  }
  document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// Scrolls to the absolute document top (y=0), not a selector. Hero (#top) is
// `position: sticky` during the Hero->AboutMe stack transition, so once
// scrolled past it its getBoundingClientRect() reflects wherever the sticky
// containing block clamps it (the Hero/About boundary) rather than the true
// page top — resolving "return to top" via scrollToId('top') lands there
// instead. A numeric target sidesteps that entirely.
export const scrollToTop = () => {
  if (typeof window !== 'undefined' && window.__lenis) {
    window.__lenis.scrollTo(0)
    return
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
