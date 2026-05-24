export const scrollToId = (id) => {
  const target = id.startsWith('#') ? id : `#${id}`
  if (typeof window !== 'undefined' && window.__lenis) {
    window.__lenis.scrollTo(target)
    return
  }
  document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
