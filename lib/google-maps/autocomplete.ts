import { loadPlacesLibrary } from "@/lib/google-maps/loader";

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

  async search(input: string): Promise<ShopSuggestion[]> {
    const trimmed = input.trim();
    if (trimmed.length < 3) return [];

    const { AutocompleteSuggestion, AutocompleteSessionToken } = await loadPlacesLibrary();

    if (!this.token) {
      this.token = new AutocompleteSessionToken();
    }

    const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input: trimmed,
      sessionToken: this.token,
      includedPrimaryTypes: ["cafe", "coffee_shop"],
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
