import { useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { MapPin } from 'lucide-react'
import { formatSiteCoordinates, type SitePlace } from '@shared/siteAddress'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { reverseGeocode, suggestSitePlaces } from '@/features/reports/reportApi'
import { canRequestLocation, requestReportLocation } from '@/lib/geolocation'
import { ApiError } from '@/services/api'
import { cn } from '@/lib/cn'

export interface SiteCoordinates {
  latitude: number
  longitude: number
}

interface SiteAddressFieldProps {
  id: string
  value: string
  coordinates: SiteCoordinates | null
  error?: string
  hint?: string
  required?: boolean
  allowGps?: boolean
  onChange: (address: string, coordinates: SiteCoordinates | null) => void
}

const DEFAULT_HINT =
  'Street, barangay, Kidapawan City, Cotabato, and zip code. Suggestions stay inside Kidapawan City.'

function isAbortError(error: unknown) {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError'
}

export function SiteAddressField({
  id,
  value,
  coordinates,
  error,
  hint,
  required = true,
  allowGps = true,
  onChange,
}: SiteAddressFieldProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const skipSuggestRef = useRef(false)
  const [suggestions, setSuggestions] = useState<SitePlace[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [menuBox, setMenuBox] = useState<DOMRect | null>(null)
  const [locating, setLocating] = useState(false)
  const [locationHint, setLocationHint] = useState<string | null>(null)

  function applyAddress(address: string, nextCoordinates: SiteCoordinates | null, nextHint?: string | null) {
    skipSuggestRef.current = true
    setSuggestions([])
    setOpen(false)
    setActiveIndex(-1)
    setLocationHint(nextHint ?? null)
    onChange(address, nextCoordinates)
  }

  useEffect(() => {
    if (skipSuggestRef.current) {
      skipSuggestRef.current = false
      return
    }
    const query = value.trim()
    if (query.length < 2) {
      setSuggestions([])
      setOpen(false)
      setLoading(false)
      return
    }
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setLoading(true)
      void suggestSitePlaces(query, controller.signal)
        .then((places) => {
          if (controller.signal.aborted) return
          setSuggestions(places)
          setOpen(places.length > 0)
          setActiveIndex(-1)
        })
        .catch((caught) => {
          if (isAbortError(caught) || controller.signal.aborted) return
          setSuggestions([])
          setOpen(false)
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 280)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [value])

  useEffect(() => {
    if (!open) {
      setMenuBox(null)
      return
    }
    function updateBox() {
      setMenuBox(inputRef.current?.getBoundingClientRect() ?? null)
    }
    updateBox()
    window.addEventListener('resize', updateBox)
    window.addEventListener('scroll', updateBox, true)
    return () => {
      window.removeEventListener('resize', updateBox)
      window.removeEventListener('scroll', updateBox, true)
    }
  }, [open, suggestions.length, value])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (rootRef.current?.contains(target)) return
      if (target instanceof Element && target.closest('[data-site-address-menu]')) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  async function fillFromGps() {
    setLocating(true)
    setLocationHint(null)
    const result = await requestReportLocation()
    if (!result.ok) {
      setLocationHint(
        result.status === 'denied'
          ? 'Location permission was denied. Type the site address instead.'
          : 'Could not read GPS. Type the street or barangay instead.',
      )
      setLocating(false)
      return
    }
    try {
      const place = await reverseGeocode(result.location.latitude, result.location.longitude)
      applyAddress(
        place.address,
        {
          latitude: result.location.latitude,
          longitude: result.location.longitude,
        },
        'Filled from your current GPS. Edit it if the issue is somewhere else.',
      )
    } catch (caught) {
      setLocationHint(
        caught instanceof ApiError
          ? caught.message
          : 'Could not read an address from GPS. Type it instead.',
      )
    } finally {
      setLocating(false)
    }
  }

  function selectPlace(place: SitePlace) {
    applyAddress(place.address, {
      latitude: place.latitude,
      longitude: place.longitude,
    })
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      return
    }
    if (!open || suggestions.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => (current + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1))
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      const place = suggestions[activeIndex]
      if (place) selectPlace(place)
    }
  }

  const showGps = allowGps && canRequestLocation()
  const activeId = activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined

  return (
    <div ref={rootRef}>
      <Field
        id={id}
        label="Site address"
        required={required}
        hint={locationHint ?? hint ?? DEFAULT_HINT}
        error={error}
        action={
          showGps ? (
            <Button
              type="button"
              variant="outline"
              className="shrink-0 px-3"
              loading={locating}
              onClick={() => void fillFromGps()}
            >
              <MapPin className="size-4" />
              <span className="hidden sm:inline">Use my location</span>
              <span className="sm:hidden">GPS</span>
            </Button>
          ) : null
        }
      >
        <AddressSuggestInput
          inputRef={inputRef}
          listId={listId}
          activeId={activeId}
          expanded={open && suggestions.length > 0}
          value={value}
          coordinates={coordinates}
          loading={loading}
          onChange={(next) => {
            setLocationHint(null)
            onChange(next, null)
          }}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true)
          }}
          onKeyDown={onKeyDown}
        />
      </Field>
      {open && suggestions.length > 0 && menuBox
        ? createPortal(
            <ul
              id={listId}
              data-site-address-menu
              role="listbox"
              className="fixed z-[70] max-h-56 overflow-auto rounded-md border border-ink-200 bg-white py-1 shadow-lg"
              style={{
                top: menuBox.bottom + 4,
                left: menuBox.left,
                width: menuBox.width,
              }}
            >
              {suggestions.map((place, index) => (
                <li key={place.id || `${place.address}-${index}`} role="presentation">
                  <button
                    id={`${listId}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={cn(
                      'flex w-full flex-col items-start px-3 py-2 text-left text-sm',
                      index === activeIndex ? 'bg-pine-50 text-ink-950' : 'text-ink-800 hover:bg-ink-50',
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectPlace(place)}
                  >
                    <span className="font-medium">{place.address}</span>
                    {place.hint ? <span className="mt-0.5 text-xs text-ink-500">{place.hint}</span> : null}
                  </button>
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
    </div>
  )
}

function AddressSuggestInput({
  id,
  invalid,
  'aria-describedby': describedBy,
  inputRef,
  listId,
  activeId,
  expanded,
  value,
  coordinates,
  loading,
  onChange,
  onFocus,
  onKeyDown,
}: {
  id?: string
  invalid?: boolean
  'aria-describedby'?: string
  inputRef: RefObject<HTMLInputElement | null>
  listId: string
  activeId?: string
  expanded: boolean
  value: string
  coordinates: SiteCoordinates | null
  loading: boolean
  onChange: (value: string) => void
  onFocus: () => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="space-y-1.5">
      <Input
        ref={inputRef}
        id={id}
        invalid={invalid}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={activeId}
        aria-describedby={describedBy}
        autoComplete="off"
        spellCheck={false}
        value={value}
        placeholder="Street, barangay, Kidapawan City, Cotabato, zip"
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
      />
      {coordinates ? (
        <p className="text-xs text-ink-500">
          {formatSiteCoordinates(coordinates.latitude, coordinates.longitude)}
          {loading ? <span className="ml-2 text-ink-400">Searching…</span> : null}
        </p>
      ) : loading ? (
        <p className="text-xs text-ink-400">Searching Kidapawan City…</p>
      ) : null}
    </div>
  )
}
