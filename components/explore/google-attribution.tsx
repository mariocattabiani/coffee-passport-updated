/**
 * Required per Google's current Places API attribution policy
 * (developers.google.com/maps/documentation/places/web-service/policies,
 * verified live before implementing this feature): content shown on an
 * actual Google Map never needs extra attribution beyond what the map
 * canvas already renders automatically, but external café results are
 * ALSO shown here in the list, outside the map, and Places API data
 * displayed without a map must carry the Google Maps logo or text
 * attribution. Text form is used here since card space is limited,
 * exactly as the policy allows. Styled to their spec: normal weight,
 * gray (#5E5E5E, meets their required contrast), 12px, unmodified
 * capitalization, translate="no" so browser translation can't alter
 * the required wording. Positioned directly above the external results
 * it attributes, within the same visual container, per their layout
 * requirement.
 */
export function GoogleAttribution() {
  return (
    <p
      translate="no"
      style={{
        fontFamily: "Roboto, sans-serif",
        fontWeight: 400,
        fontStyle: "normal",
        fontSize: "12px",
        letterSpacing: "normal",
        color: "#5E5E5E",
      }}
    >
      Google Maps
    </p>
  );
}
