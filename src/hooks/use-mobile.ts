import * as React from "react"

const MOBILE_BREAKPOINT = 768
/** Matches the `lg` breakpoint the app layout switches on. */
const DESKTOP_BREAKPOINT = 1024

/**
 * Subscribe to a media query.
 *
 * The initial value is read synchronously so the first paint already matches the
 * real viewport. Starting from a default and correcting in an effect would mount
 * the wrong layout first, and in this app that means mounting the whole planner
 * panel twice and firing every air-quality request twice with it.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false
    return window.matchMedia(query).matches
  })

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return

    const mediaQueryList = window.matchMedia(query)
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches)

    setMatches(mediaQueryList.matches)
    mediaQueryList.addEventListener("change", onChange)

    return () => mediaQueryList.removeEventListener("change", onChange)
  }, [query])

  return matches
}

export function useIsMobile() {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
}

export function useIsDesktop() {
  return useMediaQuery(`(min-width: ${DESKTOP_BREAKPOINT}px)`)
}
