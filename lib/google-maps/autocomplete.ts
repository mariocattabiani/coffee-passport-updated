import { loadPlacesLibrary } from "@/lib/google-maps/loader";

/**
 * The single, shared default type filter for explicit café text
 * search (Log Coffee, Explore text search, onboarding favorite café —
 * every consumer of ShopSearchSession.search() without
 * { unrestricted: true }). Defined exactly once here rather than
 * duplicated per component, so there is one place to tune it.
 * Google Autocomplete allows at most 5 includedPrimaryTypes.
 *
 * - cafe / coffee_shop: the obvious cases.
 * - bakery: catches bakery cafés and pastry shops that also serve
 *   coffee as a real part of their business.
 * - coffee_roastery: specialty roasters, a real and common category.
 * - restaurant: legitimate coffee-serving venues (a small espresso
 *   bar, an Italian caffè) that Google sometimes primary-types as a
 *   restaurant rather than a café.
 *
 * Deliberately excludes "bar" — Google's "bar" type generally implies
 * an alcohol-serving venue, and including it in the DEFAULT filter
 * would let through exactly the kind of irrelevant result this filter
 * exists to keep out. Italian cafés/bars that Google happens to
 * primary-type as "bar" remain reachable through the second-stage
 * unrestricted fallback ("Can't find it? Search all places"), a
 * deliberate, user-initiated choice rather than an automatic one.
 * "coffee_stand" is a real, valid category too, but is left out solely
 * because of the five-type limit — also reachable via the fallback.
 */
const DEFAULT_CAFE_TYPES = ["cafe", "coffee_shop", "bakery", "coffee_roastery", "restaurant"];

export interface ShopSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
  prediction: google.maps.places.PlacePrediction;
}

export interface SelectedShopPlace {
  googlePlaceId: string;
  name: string;
  formattedAddress: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Owns one search session's AutocompleteSessionToken.
 *
 * As the person types, each debounced query past the 3-character
 * threshold sends its own AutocompleteSuggestion request, there can be
 * several of these across a single search, one per pause in typing.
 * What keeps this billed as a single session rather than once per
 * keystroke is that every one of those requests carries the same
 * AutocompleteSessionToken, and the session concludes with exactly one
 * fetchFields request the moment a result is actually selected, that
 * token is what groups the whole flow into one billable session. This
 * class exists to make that lifecycle hard to get wrong: one token per
 * session, created lazily on first search, spent on selection, reset if
 * the search is abandoned, never reused across two different searches.
 *
 * Separately, and unrelated to this class: rendering the Passport
 * Coffee Map never calls the Places API at all, markers come only from
 * coordinates already stored in Supabase.
 */
export class ShopSearchSession {
  private token: google.maps.places.AutocompleteSessionToken | null = null;

  /**
   * search(input) alone filters to DEFAULT_CAFE_TYPES: removing the
   * old, tighter ["cafe", "coffee_shop"]-only filter (a real, reported
   * bug — see the git history on this file) fixed recall but broke
   * precision the other way, surfacing doctors' offices, nail salons,
   * and auto shops for short/ambiguous queries. This five-type default
   * (Google Autocomplete allows at most five includedPrimaryTypes) is
   * the actual fix: broad enough to cover legitimate coffee venues
   * Google classifies outside "cafe"/"coffee_shop" (a bakery café, a
   * specialty roaster, a restaurant whose primary business is really
   * coffee), narrow enough to keep obviously unrelated businesses out
   * of the DEFAULT results a person sees first.
   *
   * search(input, { unrestricted: true }) drops the type filter
   * entirely — the explicit, user-initiated second stage ("Can't find
   * it? Search all places") for venues Google classifies as "bar"
   * (many Italian caffès), "lodging" (hotel cafés), or anything else
   * outside the five default types. Never triggered automatically;
   * every consumer of this class gates it behind a real tap.
   */
  async search(input: string, options?: { unrestricted?: boolean }): Promise<ShopSuggestion[]> {
    const trimmed = input.trim();
    if (trimmed.length < 3) return [];

    const { AutocompleteSuggestion, AutocompleteSessionToken } = await loadPlacesLibrary();

    if (!this.token) {
      this.token = new AutocompleteSessionToken();
    }

    const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input: trimmed,
      sessionToken: this.token,
      ...(options?.unrestricted ? {} : { includedPrimaryTypes: DEFAULT_CAFE_TYPES }),
    });

    return suggestions
      .filter((s) => s.placePrediction)
      .map((s) => {
        const prediction = s.placePrediction as google.maps.places.PlacePrediction;
        return {
          placeId: prediction.placeId,
          mainText: prediction.mainText?.text ?? prediction.text?.text ?? "",
          secondaryText: prediction.secondaryText?.text ?? "",
          prediction,
        };
      });
  }

  async selectPlace(suggestion: ShopSuggestion): Promise<SelectedShopPlace> {
    const place = suggestion.prediction.toPlace();
    // Only Essentials-tier fields. id and displayName are deliberately
    // not requested here, we already have both from the Autocomplete
    // suggestion itself (suggestion.placeId, suggestion.mainText),
    // requesting displayName again would pull this call into the
    // Pro field tier for no benefit.
    await place.fetchFields({
      fields: ["formattedAddress", "location", "addressComponents"],
    });

    // The token is spent the moment fetchFields runs for a selection,
    // per Google's session billing model. Any future search gets a
    // brand new token, never this one again.
    this.token = null;

    const components = place.addressComponents ?? [];
    const city =
      components.find((c) => c.types.includes("locality"))?.longText ??
      components.find((c) => c.types.includes("postal_town"))?.longText ??
      null;
    const state =
      components.find((c) => c.types.includes("administrative_area_level_1"))?.shortText ?? null;
    // Already present in the same addressComponents array this call
    // already fetches, no new field, no new Google API cost.
    const country = components.find((c) => c.types.includes("country"))?.shortText ?? null;

    return {
      googlePlaceId: suggestion.placeId,
      name: suggestion.mainText,
      formattedAddress: place.formattedAddress ?? null,
      city,
      state,
      country,
      latitude: place.location?.lat() ?? null,
      longitude: place.location?.lng() ?? null,
    };
  }

  /** Call when a search is abandoned without a selection (the picker
   *  closes, the shop is changed again), so a half-used token is never
   *  carried into an unrelated future search. */
  reset() {
    this.token = null;
  }
}
